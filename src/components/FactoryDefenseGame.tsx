"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addToLeaderboard,
  DEFAULT_PLAYER_NAME,
  getBestScore,
  readLeaderboard,
  updateLeaderboardEntryName,
  writePlayerName,
  type LeaderboardEntry,
} from "@/lib/game-leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";

const CANVAS_HEIGHT = 440;

const COLORS = {
  cyan: "#38bdf8",
  rose: "#f43f5e",
  amber: "#fbbf24",
  violet: "#a78bfa",
  emerald: "#34d399",
  core: "#818cf8",
  coreGlow: "#c4b5fd",
};

type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

type EnemyType = "normal" | "rapid" | "shield" | "repulse";

type Enemy = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: EnemyType;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
};

type GameState = {
  running: boolean;
  score: number;
  coreHealth: number;
  turretAngle: number;
  projectiles: Projectile[];
  enemies: Enemy[];
  particles: Particle[];
  lastSpawn: number;
  spawnInterval: number;
  elapsed: number;
  coreX: number;
  coreY: number;
  width: number;
  height: number;
  rapidFireRemaining: number;
  coreShieldRemaining: number;
  repulseRemaining: number;
  lastFireAt: number;
};

type Phase = "menu" | "playing" | "gameover";

const PROJECTILE_SPEED = 520;
const PROJECTILE_RADIUS = 4;
const CORE_RADIUS = 28;
const TURRET_LENGTH = 36;
const MAX_CORE_HEALTH = 100;
const POWERUP_DURATION = 8;
const INITIAL_SPAWN_INTERVAL = 1800;
const POWERUP_UNLOCK_SPAWN_INTERVAL = 1200;
const POWERUP_REPULSE_UNLOCK_SCORE = 350;
const POWERUP_RAPID_CHANCE = 0.05;
const POWERUP_SHIELD_CHANCE = 0.05;
const POWERUP_REPULSE_CHANCE = 0.05;
const REPULSE_DURATION = 6;
const REPULSE_IMPULSE = 280;
const REPULSE_FIELD_RADIUS = 400;
const REPULSE_FIELD_FORCE = 240;
const MAX_ENEMY_SPEED = 380;
const NORMAL_FIRE_COOLDOWN = 0.22;
const RAPID_FIRE_COOLDOWN = 0.075;
const CORE_HIT_DAMAGE = 12;
const SHIELD_DAMAGE_FACTOR = 0.3;

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

function spawnEnemy(state: GameState) {
  const { width, height, coreX, coreY } = state;
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * width;
    y = -20;
  } else if (edge === 1) {
    x = width + 20;
    y = Math.random() * height;
  } else if (edge === 2) {
    x = Math.random() * width;
    y = height + 20;
  } else {
    x = -20;
    y = Math.random() * height;
  }

  const angle = Math.atan2(coreY - y, coreX - x);
  const speed = 55 + Math.min(state.score * 0.8, 120);
  const roll = Math.random();
  const powerupsEnabled = state.spawnInterval <= POWERUP_UNLOCK_SPAWN_INTERVAL;
  const repulseUnlocked = state.score >= POWERUP_REPULSE_UNLOCK_SCORE;

  let type: EnemyType = "normal";
  let color = roll < 0.5 ? COLORS.rose : COLORS.amber;

  if (powerupsEnabled) {
    let threshold = 0;

    if (repulseUnlocked) {
      threshold += POWERUP_REPULSE_CHANCE;
      if (roll < threshold) {
        type = "repulse";
        color = COLORS.emerald;
      }
    }

    if (type === "normal") {
      threshold += POWERUP_RAPID_CHANCE;
      if (roll < threshold) {
        type = "rapid";
        color = COLORS.cyan;
      }
    }

    if (type === "normal") {
      threshold += POWERUP_SHIELD_CHANCE;
      if (roll < threshold) {
        type = "shield";
        color = COLORS.violet;
      }
    }

    if (type === "normal") {
      color = roll < 0.55 ? COLORS.rose : COLORS.amber;
    }
  }

  const radius =
    type === "normal" ? 10 + Math.random() * 8 : 12 + Math.random() * 5;

  state.enemies.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    color,
    type,
  });
}

function clampEnemySpeed(enemy: Enemy, maxSpeed = MAX_ENEMY_SPEED) {
  const speed = Math.hypot(enemy.vx, enemy.vy);
  if (speed > maxSpeed) {
    enemy.vx = (enemy.vx / speed) * maxSpeed;
    enemy.vy = (enemy.vy / speed) * maxSpeed;
  }
}

function triggerRepulse(state: GameState) {
  state.repulseRemaining += REPULSE_DURATION;
  const { coreX, coreY } = state;

  for (const enemy of state.enemies) {
    const dx = enemy.x - coreX;
    const dy = enemy.y - coreY;
    const dist = Math.hypot(dx, dy) || 1;
    const proximity = 1 - Math.min(dist, REPULSE_FIELD_RADIUS) / REPULSE_FIELD_RADIUS;
    const impulse = REPULSE_IMPULSE * (1 + proximity * 0.5);
    enemy.vx += (dx / dist) * impulse;
    enemy.vy += (dy / dist) * impulse;
    clampEnemySpeed(enemy);
  }

  for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2;
    state.particles.push({
      x: coreX + Math.cos(angle) * CORE_RADIUS,
      y: coreY + Math.sin(angle) * CORE_RADIUS,
      vx: Math.cos(angle) * 320,
      vy: Math.sin(angle) * 320,
      life: 0.5,
      maxLife: 0.5,
      radius: 3,
      color: COLORS.emerald,
    });
  }

  spawnExplosion(state, coreX, coreY, COLORS.emerald, 22);
}

function applyRepulseField(state: GameState, delta: number) {
  if (state.repulseRemaining <= 0) return;

  const { coreX, coreY } = state;
  for (const enemy of state.enemies) {
    const dx = enemy.x - coreX;
    const dy = enemy.y - coreY;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < REPULSE_FIELD_RADIUS) {
      const strength =
        REPULSE_FIELD_FORCE * delta * (1 - dist / REPULSE_FIELD_RADIUS);
      enemy.vx += (dx / dist) * strength;
      enemy.vy += (dy / dist) * strength;
      clampEnemySpeed(enemy);
    }
  }
}

function spawnExplosion(
  state: GameState,
  x: number,
  y: number,
  color: string,
  count = 14,
) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

function fireProjectile(state: GameState) {
  const tipX = state.coreX + Math.cos(state.turretAngle) * TURRET_LENGTH;
  const tipY = state.coreY + Math.sin(state.turretAngle) * TURRET_LENGTH;
  const rapid = state.rapidFireRemaining > 0;

  state.projectiles.push({
    x: tipX,
    y: tipY,
    vx: Math.cos(state.turretAngle) * PROJECTILE_SPEED,
    vy: Math.sin(state.turretAngle) * PROJECTILE_SPEED,
    radius: rapid ? PROJECTILE_RADIUS + 1 : PROJECTILE_RADIUS,
    color: rapid ? COLORS.amber : COLORS.cyan,
  });
}

function tryFire(state: GameState) {
  const cooldown =
    state.rapidFireRemaining > 0 ? RAPID_FIRE_COOLDOWN : NORMAL_FIRE_COOLDOWN;

  if (state.elapsed - state.lastFireAt < cooldown) return false;

  state.lastFireAt = state.elapsed;
  fireProjectile(state);
  return true;
}

function applyEnemyPowerup(state: GameState, enemy: Enemy) {
  if (enemy.type === "rapid") {
    state.rapidFireRemaining += POWERUP_DURATION;
    spawnExplosion(state, enemy.x, enemy.y, COLORS.amber, 18);
    return;
  }

  if (enemy.type === "shield") {
    state.coreShieldRemaining += POWERUP_DURATION;
    spawnExplosion(state, enemy.x, enemy.y, COLORS.violet, 18);
    return;
  }

  if (enemy.type === "repulse") {
    triggerRepulse(state);
    spawnExplosion(state, enemy.x, enemy.y, COLORS.emerald, 18);
  }
}

function createInitialState(width: number, height: number): GameState {
  return {
    running: false,
    score: 0,
    coreHealth: MAX_CORE_HEALTH,
    turretAngle: -Math.PI / 2,
    projectiles: [],
    enemies: [],
    particles: [],
    lastSpawn: 0,
    spawnInterval: INITIAL_SPAWN_INTERVAL,
    elapsed: 0,
    coreX: width / 2,
    coreY: height / 2,
    width,
    height,
    rapidFireRemaining: 0,
    coreShieldRemaining: 0,
    repulseRemaining: 0,
    lastFireAt: -NORMAL_FIRE_COOLDOWN,
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const { width, height, coreX, coreY, elapsed } = state;

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    coreX,
    coreY,
    30,
    coreX,
    coreY,
    Math.max(width, height) * 0.65,
  );
  gradient.addColorStop(0, "#1a1640");
  gradient.addColorStop(0.45, "#12152b");
  gradient.addColorStop(1, "#070b14");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 48; i += 1) {
    const sx = ((i * 97) % width) + Math.sin(elapsed * 0.3 + i) * 0.4;
    const sy = ((i * 53) % height) + Math.cos(elapsed * 0.25 + i * 1.3) * 0.4;
    const twinkle = 0.35 + Math.sin(elapsed * 2 + i * 0.7) * 0.35;
    ctx.globalAlpha = twinkle;
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  const gridSize = 40;
  for (let x = 0; x <= width; x += gridSize) {
    const fade = 1 - Math.abs(x - coreX) / (width * 0.55);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.04 + Math.max(0, fade) * 0.06})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    const fade = 1 - Math.abs(y - coreY) / (height * 0.55);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.04 + Math.max(0, fade) * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    coreX,
    coreY,
    Math.min(width, height) * 0.2,
    coreX,
    coreY,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawCore(ctx: CanvasRenderingContext2D, state: GameState) {
  const { coreX, coreY, elapsed, coreHealth, coreShieldRemaining, repulseRemaining } =
    state;
  const healthRatio = coreHealth / MAX_CORE_HEALTH;
  const pulse = 0.94 + Math.sin(elapsed * 5) * 0.06;
  const shielded = coreShieldRemaining > 0;
  const repulsing = repulseRemaining > 0;
  const accent = repulsing
    ? COLORS.emerald
    : shielded
      ? COLORS.violet
      : healthRatio > 0.4
        ? COLORS.cyan
        : healthRatio > 0.2
          ? COLORS.amber
          : COLORS.rose;

  if (repulsing) {
    const wavePhase = repulseRemaining % REPULSE_DURATION;
    const wave = 1 - wavePhase / REPULSE_DURATION;
    const ringRadius = Math.max(
      0,
      CORE_RADIUS * 1.2 + wave * REPULSE_FIELD_RADIUS * 0.85,
    );
    ctx.strokeStyle = `rgba(52, 211, 153, ${0.55 * Math.max(0, 1 - wave * 0.7)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(coreX, coreY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(52, 211, 153, ${0.25 + Math.sin(elapsed * 12) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coreX, coreY, REPULSE_FIELD_RADIUS * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(coreX, coreY);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, CORE_RADIUS * 0.55, CORE_RADIUS * 1.65, CORE_RADIUS * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(elapsed * 0.55);
  ctx.strokeStyle = `${accent}88`;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.arc(0, 0, CORE_RADIUS * 1.28, -0.22, 0.22);
    ctx.stroke();
  }

  if (shielded) {
    ctx.rotate(-elapsed * 0.35);
    drawPolygon(ctx, 0, 0, CORE_RADIUS * 1.48, 6, -Math.PI / 2);
    ctx.strokeStyle = `rgba(167, 139, 250, ${0.45 + Math.sin(elapsed * 9) * 0.25})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();

  const bob = Math.sin(elapsed * 3.5) * 0.8;

  const glow = ctx.createRadialGradient(
    coreX,
    coreY + bob * 0.5,
    CORE_RADIUS * 0.15,
    coreX,
    coreY + bob * 0.5,
    CORE_RADIUS * 1.2 * pulse,
  );
  glow.addColorStop(0, `${accent}30`);
  glow.addColorStop(0.55, `${accent}10`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.save();
  ctx.translate(coreX, coreY + bob * 0.5);
  ctx.scale(1.15, 0.95);
  ctx.beginPath();
  ctx.arc(0, 0, CORE_RADIUS * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(coreX, coreY + bob);

  const treadY = 11;
  const treadW = 17;
  const treadH = 9;
  const treadScroll = (elapsed * 48) % 6;

  for (const side of [-1, 1] as const) {
    const treadX = side * 12.5 - treadW / 2;
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = `${accent}44`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(treadX, treadY, treadW, treadH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;
    for (let i = -1; i < 5; i += 1) {
      const gx = treadX + 3 + ((i * 4 + treadScroll) % (treadW - 2));
      ctx.beginPath();
      ctx.moveTo(gx, treadY + 2);
      ctx.lineTo(gx, treadY + treadH - 2);
      ctx.stroke();
    }
  }

  const torsoGrad = ctx.createLinearGradient(-20, -8, 20, 20);
  torsoGrad.addColorStop(0, shielded ? "#a78bfa" : "#94a3b8");
  torsoGrad.addColorStop(0.35, shielded ? "#6d28d9" : "#475569");
  torsoGrad.addColorStop(0.7, "#1e293b");
  torsoGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(-20, -8, 40, 22, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = `${accent}55`;
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.roundRect(side * 18 - 4, -4, 8, 14, 3);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = `${accent}28`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.lineTo(14, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.lineTo(10, 10);
  ctx.stroke();

  for (const rx of [-14, -6, 6, 14]) {
    ctx.fillStyle = `${accent}44`;
    ctx.beginPath();
    ctx.arc(rx, 8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const corePulse = 0.65 + Math.sin(elapsed * 11) * 0.35;
  const chestGlow = ctx.createRadialGradient(0, 1, 0, 0, 1, 12);
  chestGlow.addColorStop(0, `${accent}${Math.floor(corePulse * 180).toString(16).padStart(2, "0")}`);
  chestGlow.addColorStop(0.45, `${accent}33`);
  chestGlow.addColorStop(1, "transparent");
  ctx.fillStyle = chestGlow;
  ctx.beginPath();
  ctx.roundRect(-7, -3, 14, 10, 4);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-5, -1, 10, 6, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 255, 255, ${corePulse})`;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function getRobotAccent(state: GameState) {
  const healthRatio = state.coreHealth / MAX_CORE_HEALTH;
  if (state.repulseRemaining > 0) return COLORS.emerald;
  if (state.coreShieldRemaining > 0) return COLORS.violet;
  if (state.rapidFireRemaining > 0) return COLORS.amber;
  if (healthRatio > 0.4) return COLORS.cyan;
  if (healthRatio > 0.2) return COLORS.amber;
  return COLORS.rose;
}

function drawRobot(ctx: CanvasRenderingContext2D, state: GameState) {
  const { coreX, coreY, turretAngle, elapsed, rapidFireRemaining } = state;
  const accent = getRobotAccent(state);
  const aim = turretAngle;
  const rapid = rapidFireRemaining > 0;
  const eyePulse = 0.55 + Math.sin(elapsed * 8) * 0.45;
  const barrelColor = rapid ? COLORS.amber : COLORS.cyan;
  const muzzleX = coreX + Math.cos(aim) * TURRET_LENGTH;
  const muzzleY = coreY + Math.sin(aim) * TURRET_LENGTH;
  const barrelStart = 14;
  const bob = Math.sin(elapsed * 3.5) * 0.8;

  ctx.save();
  ctx.translate(coreX, coreY + bob);

  ctx.strokeStyle = `${accent}44`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.strokeStyle = `${accent}66`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-4, -7, 8, 5, 2);
  ctx.fill();
  ctx.stroke();

  const headGrad = ctx.createLinearGradient(-11, -16, 11, 2);
  headGrad.addColorStop(0, "#94a3b8");
  headGrad.addColorStop(0.45, "#475569");
  headGrad.addColorStop(1, "#1e293b");
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(-11, -15, 22, 16, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.beginPath();
  ctx.roundRect(-8, -12, 16, 10, 4);
  ctx.fill();

  const visorGrad = ctx.createLinearGradient(-8, -10, 8, -6);
  visorGrad.addColorStop(0, "rgba(15,23,42,0.1)");
  visorGrad.addColorStop(0.2, `${accent}cc`);
  visorGrad.addColorStop(0.5, "#f8fafc");
  visorGrad.addColorStop(0.8, `${accent}cc`);
  visorGrad.addColorStop(1, "rgba(15,23,42,0.1)");
  ctx.fillStyle = visorGrad;
  ctx.globalAlpha = eyePulse;
  ctx.beginPath();
  ctx.roundRect(-7, -10, 14, 4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, -21, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();

  ctx.save();
  ctx.translate(coreX, coreY + bob);
  ctx.rotate(aim);

  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = `${barrelColor}aa`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = `${barrelColor}88`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(barrelStart - 2, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const barrelGrad = ctx.createLinearGradient(barrelStart, -4, TURRET_LENGTH + 2, 4);
  barrelGrad.addColorStop(0, "#1e293b");
  barrelGrad.addColorStop(0.25, "#475569");
  barrelGrad.addColorStop(0.55, barrelColor);
  barrelGrad.addColorStop(1, "#f8fafc");
  ctx.fillStyle = barrelGrad;
  ctx.strokeStyle = `${barrelColor}bb`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(barrelStart, -3.5, TURRET_LENGTH - barrelStart + 2, 7, 3);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = `${barrelColor}55`;
  ctx.lineWidth = 1;
  for (const ring of [barrelStart + 6, barrelStart + 14, barrelStart + 22]) {
    ctx.beginPath();
    ctx.moveTo(ring, -2.5);
    ctx.lineTo(ring, 2.5);
    ctx.stroke();
  }

  ctx.strokeStyle = barrelColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(TURRET_LENGTH + 2, 0, 3.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  const muzzleGlow = ctx.createRadialGradient(
    muzzleX,
    muzzleY,
    0,
    muzzleX,
    muzzleY,
    rapid ? 14 : 10,
  );
  muzzleGlow.addColorStop(0, `${barrelColor}cc`);
  muzzleGlow.addColorStop(0.45, `${barrelColor}44`);
  muzzleGlow.addColorStop(1, "transparent");
  ctx.fillStyle = muzzleGlow;
  ctx.beginPath();
  ctx.arc(muzzleX, muzzleY, rapid ? 14 : 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = barrelColor;
  ctx.shadowColor = barrelColor;
  ctx.shadowBlur = rapid ? 20 : 14;
  ctx.beginPath();
  ctx.arc(muzzleX, muzzleY, rapid ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(muzzleX, muzzleY, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
) {
  const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
  const tailX = projectile.x - (projectile.vx / speed) * 14;
  const tailY = projectile.y - (projectile.vy / speed) * 14;

  const bolt = ctx.createLinearGradient(tailX, tailY, projectile.x, projectile.y);
  bolt.addColorStop(0, "transparent");
  bolt.addColorStop(0.55, `${projectile.color}88`);
  bolt.addColorStop(1, "#ffffff");
  ctx.strokeStyle = bolt;
  ctx.lineWidth = projectile.radius * 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(projectile.x, projectile.y);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = projectile.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawGlitchNode(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  elapsed: number,
) {
  const spin = elapsed * 1.8 + enemy.x * 0.012;
  const r = enemy.radius;
  const speed = Math.hypot(enemy.vx, enemy.vy);
  const flicker = Math.sin(elapsed * 18 + enemy.y * 0.05) > 0.82;
  const pulse = 0.65 + Math.sin(elapsed * 7 + enemy.x * 0.02) * 0.35;

  if (speed > 0) {
    const nx = enemy.vx / speed;
    const ny = enemy.vy / speed;
    const tailLen = r * (2.6 + Math.min(speed / 90, 1.4));

    const outerTrail = ctx.createLinearGradient(
      enemy.x,
      enemy.y,
      enemy.x - nx * tailLen,
      enemy.y - ny * tailLen,
    );
    outerTrail.addColorStop(0, `${enemy.color}55`);
    outerTrail.addColorStop(1, "transparent");
    ctx.strokeStyle = outerTrail;
    ctx.lineWidth = r * 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x - nx * tailLen * 0.9, enemy.y - ny * tailLen * 0.9);
    ctx.stroke();

    const innerTrail = ctx.createLinearGradient(
      enemy.x,
      enemy.y,
      enemy.x - nx * tailLen * 0.55,
      enemy.y - ny * tailLen * 0.55,
    );
    innerTrail.addColorStop(0, `${enemy.color}dd`);
    innerTrail.addColorStop(1, "transparent");
    ctx.strokeStyle = innerTrail;
    ctx.lineWidth = r * 0.45;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x - nx * tailLen * 0.55, enemy.y - ny * tailLen * 0.55);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.strokeStyle = `${enemy.color}${Math.floor(pulse * 90 + 40).toString(16).padStart(2, "0")}`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
  ctx.stroke();

  if (flicker) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COLORS.cyan;
    drawPolygon(ctx, 2.5, -1.5, r * 0.82, 6, spin);
    ctx.fill();
    ctx.fillStyle = COLORS.rose;
    drawPolygon(ctx, -2.5, 1.5, r * 0.82, 6, spin);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.rotate(spin);
  drawPolygon(ctx, 0, 0, r * 0.92, 6, -Math.PI / 2);
  const shellGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.28, r * 0.1, 0, 0, r);
  shellGrad.addColorStop(0, "#fef3c7");
  shellGrad.addColorStop(0.35, enemy.color);
  shellGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = shellGrad;
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.rotate(-spin * 0.6);
  ctx.strokeStyle = `${enemy.color}99`;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  const scanY = ((elapsed * 40 + enemy.y) % (r * 1.4)) - r * 0.7;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, scanY);
  ctx.lineTo(r * 0.75, scanY);
  ctx.stroke();

  ctx.restore();
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  bestScore: number,
) {
  const { width, coreHealth } = state;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText(`SCORE  ${state.score}`, 18, 26);
  ctx.fillText(`BEST   ${bestScore}`, 18, 46);

  const healthWidth = 140;
  const healthX = width - healthWidth - 18;
  const healthY = 22;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(healthX, healthY, healthWidth, 8);
  ctx.fillStyle =
    coreHealth > 40
      ? COLORS.cyan
      : coreHealth > 20
        ? COLORS.amber
        : COLORS.rose;
  ctx.fillRect(
    healthX,
    healthY,
    healthWidth * (coreHealth / MAX_CORE_HEALTH),
    8,
  );
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("CORE HEALTH", healthX, 16);

  let buffY = 66;
  if (state.rapidFireRemaining > 0) {
    ctx.fillStyle = COLORS.amber;
    ctx.fillText(
      `RAPID FIRE ${state.rapidFireRemaining.toFixed(1)}s`,
      18,
      buffY,
    );
    buffY += 18;
  }

  if (state.coreShieldRemaining > 0) {
    ctx.fillStyle = COLORS.violet;
    ctx.fillText(
      `CORE SHIELD ${state.coreShieldRemaining.toFixed(1)}s`,
      18,
      buffY,
    );
    buffY += 18;
  }

  if (state.repulseRemaining > 0) {
    ctx.fillStyle = COLORS.emerald;
    ctx.fillText(`REPULSE ${state.repulseRemaining.toFixed(1)}s`, 18, buffY);
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawPowerupLegend(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.spawnInterval > POWERUP_UNLOCK_SPAWN_INTERVAL) return;

  const { width, height } = state;
  const y = height - 16;
  const repulseUnlocked = state.score >= POWERUP_REPULSE_UNLOCK_SCORE;
  const items = [
    { label: "Rapid Fire", color: COLORS.amber, shape: "diamond" as const },
    { label: "Core Shield", color: COLORS.violet, shape: "hex" as const },
    ...(repulseUnlocked
      ? [{ label: "Repulse", color: COLORS.emerald, shape: "oct" as const }]
      : []),
  ];

  ctx.font = "600 10px system-ui, sans-serif";
  const gap = items.length === 3 ? 108 : 130;
  const startX = width / 2 - ((items.length - 1) * gap) / 2;

  for (const [index, item] of items.entries()) {
    const x = startX + index * gap;
    const iconX = x - 42;

    ctx.fillStyle = item.color;
    if (item.shape === "diamond") {
      drawPolygon(ctx, iconX, y - 4, 7, 4, Math.PI / 4);
      ctx.fill();
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (item.shape === "hex") {
      drawPolygon(ctx, iconX, y - 4, 7, 6, -Math.PI / 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      drawPolygon(ctx, iconX, y - 4, 7, 8, -Math.PI / 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(item.label, x - 28, y);
  }
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  elapsed: number,
) {
  const pulse = 0.5 + Math.sin(elapsed * 9) * 0.5;

  if (enemy.type !== "normal") {
    const meta =
      enemy.type === "rapid"
        ? { accent: COLORS.amber, label: "RAPID FIRE" }
        : enemy.type === "shield"
          ? { accent: COLORS.violet, label: "CORE SHIELD" }
          : { accent: COLORS.emerald, label: "REPULSE" };
    const { accent, label } = meta;

    const badgeGlow = ctx.createRadialGradient(
      enemy.x,
      enemy.y,
      enemy.radius * 0.4,
      enemy.x,
      enemy.y,
      enemy.radius + 14,
    );
    badgeGlow.addColorStop(0, `${accent}33`);
    badgeGlow.addColorStop(1, "transparent");
    ctx.fillStyle = badgeGlow;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.globalAlpha = 0.45 + pulse * 0.4;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 8 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.fillText(label, enemy.x, enemy.y - enemy.radius - 11);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.restore();
  }

  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = enemy.type === "normal" ? 14 : 24;

  if (enemy.type === "rapid") {
    const spin = elapsed * 3 + enemy.y * 0.01;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(spin);
    const rapidGrad = ctx.createRadialGradient(0, 0, enemy.radius * 0.15, 0, 0, enemy.radius);
    rapidGrad.addColorStop(0, "#fff7ed");
    rapidGrad.addColorStop(0.4, COLORS.cyan);
    rapidGrad.addColorStop(1, "#0c4a6e");
    drawPolygon(ctx, 0, 0, enemy.radius, 4, Math.PI / 4);
    ctx.fillStyle = rapidGrad;
    ctx.fill();
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    return;
  }

  if (enemy.type === "shield") {
    const spin = elapsed * 1.5;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(spin);
    const shieldGrad = ctx.createRadialGradient(0, 0, enemy.radius * 0.12, 0, 0, enemy.radius);
    shieldGrad.addColorStop(0, "#f5f3ff");
    shieldGrad.addColorStop(0.5, COLORS.violet);
    shieldGrad.addColorStop(1, "#2e1065");
    drawPolygon(ctx, 0, 0, enemy.radius, 6, -Math.PI / 2);
    ctx.fillStyle = shieldGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -1, enemy.radius * 0.55, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    return;
  }

  if (enemy.type === "repulse") {
    const spin = elapsed * 2.2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(spin);
    const repulseGrad = ctx.createRadialGradient(
      0,
      0,
      enemy.radius * 0.12,
      0,
      0,
      enemy.radius,
    );
    repulseGrad.addColorStop(0, "#ecfdf5");
    repulseGrad.addColorStop(0.5, COLORS.emerald);
    repulseGrad.addColorStop(1, "#064e3b");
    drawPolygon(ctx, 0, 0, enemy.radius, 8, -Math.PI / 8);
    ctx.fillStyle = repulseGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;

    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * Math.PI * 2 + elapsed * 2.5;
      const cx = enemy.x + Math.cos(angle) * (enemy.radius + 6);
      const cy = enemy.y + Math.sin(angle) * (enemy.radius + 6);
      ctx.strokeStyle = `${COLORS.emerald}aa`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(angle) * 3, cy - Math.sin(angle) * 3);
      ctx.lineTo(cx + Math.cos(angle) * 3, cy + Math.sin(angle) * 3);
      ctx.stroke();
    }
    return;
  }

  drawGlitchNode(ctx, enemy, elapsed);
}

function GameShell() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-16 sm:px-8">
      <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
        Robot Defense
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-md">
        <div
          className="relative bg-[#0B0F19]"
          style={{ height: CANVAS_HEIGHT }}
        />
      </div>
    </section>
  );
}

function FactoryDefenseGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const gameRef = useRef<GameState>(createInitialState(800, CANVAS_HEIGHT));
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const highScoreRef = useRef(0);
  const phaseRef = useRef<Phase>("menu");
  const pausedRef = useRef(false);
  const startGameRef = useRef<() => void>(() => {});
  const pauseToggleRef = useRef<() => void>(() => {});
  const fireHeldRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("menu");
  const [isPaused, setIsPaused] = useState(false);
  const [pausedScore, setPausedScore] = useState(0);
  const [overlayScore, setOverlayScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [nameSaved, setNameSaved] = useState(true);

  function fitCanvas() {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return false;

    const width = Math.max(container.getBoundingClientRect().width, 320);
    const height = CANVAS_HEIGHT;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;

    const wasRunning = gameRef.current.running;
    gameRef.current.width = width;
    gameRef.current.height = height;
    gameRef.current.coreX = width / 2;
    gameRef.current.coreY = height / 2;
    gameRef.current.running = wasRunning;

    return true;
  }

  function startGame() {
    if (!fitCanvas()) return;

    phaseRef.current = "playing";
    pausedRef.current = false;
    setPhase("playing");
    setIsPaused(false);
    setOverlayScore(0);
    setLeaderboardRank(null);
    setIsNewBest(false);
    setLastRunAt(null);
    setEditingName("");
    setNameSaved(true);

    const { width, height } = gameRef.current;
    const state = createInitialState(width, height);
    state.running = true;
    gameRef.current = state;
    lastTimeRef.current = 0;
  }

  startGameRef.current = startGame;

  function togglePause() {
    if (phaseRef.current !== "playing") return;

    const next = !pausedRef.current;
    pausedRef.current = next;
    setIsPaused(next);
    if (next) {
      setPausedScore(gameRef.current.score);
      lastTimeRef.current = 0;
    }
  }

  function resumeGame() {
    if (phaseRef.current !== "playing" || !pausedRef.current) return;

    pausedRef.current = false;
    setIsPaused(false);
    lastTimeRef.current = 0;
  }

  pauseToggleRef.current = togglePause;

  function endGame(finalScore: number) {
    if (phaseRef.current !== "playing") return;

    gameRef.current.running = false;
    pausedRef.current = false;
    setIsPaused(false);

    const result = addToLeaderboard(finalScore, DEFAULT_PLAYER_NAME);
    highScoreRef.current = getBestScore(result.entries);
    setLeaderboard(result.entries);
    setLeaderboardRank(result.rank);
    setIsNewBest(result.isNewBest);

    const runAt = result.rank
      ? (result.entries[result.rank - 1]?.achievedAt ?? null)
      : null;
    setLastRunAt(runAt);
    setEditingName("");
    setNameSaved(runAt === null);

    setOverlayScore(finalScore);
    phaseRef.current = "gameover";
    setPhase("gameover");
  }

  useLayoutEffect(() => {
    const entries = readLeaderboard();
    highScoreRef.current = getBestScore(entries);
    setLeaderboard(entries);
    fitCanvas();
  }, []);

  function saveEntryName() {
    if (lastRunAt === null) return;

    const entries = updateLeaderboardEntryName(lastRunAt, editingName);
    highScoreRef.current = getBestScore(entries);
    setLeaderboard(entries);
    writePlayerName(editingName);
    setNameSaved(true);
  }

  useLayoutEffect(() => {
    const button = startButtonRef.current;
    if (!button) return;

    const handleStart = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      startGameRef.current();
    };

    button.addEventListener("click", handleStart);

    return () => {
      button.removeEventListener("click", handleStart);
    };
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;

    function setup() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) {
        if (!cancelled) {
          frameRef.current = requestAnimationFrame(setup);
        }
        return;
      }

      if (!fitCanvas()) {
        if (!cancelled) {
          frameRef.current = requestAnimationFrame(setup);
        }
        return;
      }

      const resizeObserver = new ResizeObserver(() => fitCanvas());
      resizeObserver.observe(container);

      const updatePointer = (clientX: number, clientY: number) => {
        const state = gameRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        state.turretAngle = Math.atan2(y - state.coreY, x - state.coreX);
      };

      const onMouseMove = (event: MouseEvent) => {
        if (phaseRef.current !== "playing" || pausedRef.current) return;
        updatePointer(event.clientX, event.clientY);
      };

      const onMouseDown = (event: MouseEvent) => {
        if (
          phaseRef.current !== "playing" ||
          pausedRef.current ||
          !gameRef.current.running
        ) {
          return;
        }
        event.preventDefault();
        fireHeldRef.current = true;
        tryFire(gameRef.current);
      };

      const onMouseUp = () => {
        fireHeldRef.current = false;
      };

      const onTouchMove = (event: TouchEvent) => {
        if (phaseRef.current !== "playing" || pausedRef.current) return;
        const touch = event.touches[0];
        if (!touch) return;
        event.preventDefault();
        updatePointer(touch.clientX, touch.clientY);
      };

      const onTouchStart = (event: TouchEvent) => {
        if (
          phaseRef.current !== "playing" ||
          pausedRef.current ||
          !gameRef.current.running
        ) {
          return;
        }
        const touch = event.touches[0];
        if (!touch) return;
        event.preventDefault();
        updatePointer(touch.clientX, touch.clientY);
        fireHeldRef.current = true;
        tryFire(gameRef.current);
      };

      const onTouchEnd = () => {
        fireHeldRef.current = false;
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (phaseRef.current === "playing") {
          if (event.code === "Escape" || event.code === "KeyP") {
            event.preventDefault();
            pauseToggleRef.current();
            return;
          }
        }

        if (
          phaseRef.current !== "playing" ||
          pausedRef.current ||
          !gameRef.current.running
        ) {
          return;
        }

        if (event.code === "Space") {
          event.preventDefault();
          fireHeldRef.current = true;
          tryFire(gameRef.current);
        }
      };

      const onKeyUp = (event: KeyboardEvent) => {
        if (event.code === "Space") {
          fireHeldRef.current = false;
        }
      };

      const update = (delta: number) => {
        const state = gameRef.current;
        if (!state.running) return;

        state.elapsed += delta;
        state.rapidFireRemaining = Math.max(0, state.rapidFireRemaining - delta);
        state.coreShieldRemaining = Math.max(0, state.coreShieldRemaining - delta);
        state.repulseRemaining = Math.max(0, state.repulseRemaining - delta);
        state.spawnInterval = Math.max(
          550,
          INITIAL_SPAWN_INTERVAL - state.score * 12,
        );

        if (fireHeldRef.current) {
          tryFire(state);
        }

        if (state.elapsed - state.lastSpawn >= state.spawnInterval / 1000) {
          spawnEnemy(state);
          state.lastSpawn = state.elapsed;
        }

        for (const projectile of state.projectiles) {
          projectile.x += projectile.vx * delta;
          projectile.y += projectile.vy * delta;
        }

        state.projectiles = state.projectiles.filter(
          (p) =>
            p.x > -40 &&
            p.x < state.width + 40 &&
            p.y > -40 &&
            p.y < state.height + 40,
        );

        for (const enemy of state.enemies) {
          enemy.x += enemy.vx * delta;
          enemy.y += enemy.vy * delta;
        }

        applyRepulseField(state, delta);

        for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
          const projectile = state.projectiles[i];
          for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
            const enemy = state.enemies[j];
            if (
              distance(projectile.x, projectile.y, enemy.x, enemy.y) <
              projectile.radius + enemy.radius
            ) {
              if (enemy.type === "normal") {
                spawnExplosion(state, enemy.x, enemy.y, enemy.color);
              } else {
                applyEnemyPowerup(state, enemy);
              }
              state.projectiles.splice(i, 1);
              state.enemies.splice(j, 1);
              state.score += enemy.type === "normal" ? 10 : 15;
              break;
            }
          }
        }

        for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
          const enemy = state.enemies[i];
          if (
            distance(enemy.x, enemy.y, state.coreX, state.coreY) <
            enemy.radius + CORE_RADIUS * 0.65
          ) {
            spawnExplosion(state, enemy.x, enemy.y, COLORS.rose, 10);
            state.enemies.splice(i, 1);
            const damage =
              state.coreShieldRemaining > 0
                ? CORE_HIT_DAMAGE * SHIELD_DAMAGE_FACTOR
                : CORE_HIT_DAMAGE;
            state.coreHealth -= damage;
          }
        }

        if (state.coreHealth <= 0) {
          state.coreHealth = 0;
          endGame(state.score);
        }

        for (const particle of state.particles) {
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
          particle.vx *= 0.96;
          particle.vy *= 0.96;
          particle.life -= delta;
        }

        state.particles = state.particles.filter((p) => p.life > 0);
      };

      const draw = () => {
        const state = gameRef.current;
        const ctx = ctxRef.current;
        if (!ctx) return;

        drawBackground(ctx, state);

        if (state.running) {
          for (const particle of state.particles) {
            ctx.globalAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          for (const enemy of state.enemies) {
            drawEnemy(ctx, enemy, state.elapsed);
          }

          for (const projectile of state.projectiles) {
            drawProjectile(ctx, projectile);
          }
        }

        drawCore(ctx, state);
        drawRobot(ctx, state);
        drawHud(ctx, state, highScoreRef.current);
        if (state.running) {
          drawPowerupLegend(ctx, state);
        }
      };

      const loop = (time: number) => {
        if (cancelled) return;

        if (!pausedRef.current) {
          if (!lastTimeRef.current) lastTimeRef.current = time;
          const delta = Math.min((time - lastTimeRef.current) / 1000, 0.032);
          lastTimeRef.current = time;

          if (gameRef.current.running) {
            update(delta);
          } else if (phaseRef.current === "menu") {
            gameRef.current.elapsed += delta;
          }
        }

        draw();
        frameRef.current = requestAnimationFrame(loop);
      };

      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseUp);
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd);
      canvas.addEventListener("touchcancel", onTouchEnd);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      frameRef.current = requestAnimationFrame(loop);

      teardown = () => {
        cancelAnimationFrame(frameRef.current);
        resizeObserver.disconnect();
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseUp);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchend", onTouchEnd);
        canvas.removeEventListener("touchcancel", onTouchEnd);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      teardown?.();
    };
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-16 sm:px-8">
      <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
        Robot Defense
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-md">
        <div ref={containerRef} className="relative bg-[#0B0F19]">
          <canvas
            ref={canvasRef}
            className="block w-full touch-none"
            style={{ height: CANVAS_HEIGHT }}
            aria-label="Robot Defense mini-game canvas"
          />

          {phase === "playing" && !isPaused && (
            <button
              type="button"
              onClick={togglePause}
              className="absolute left-[18px] top-[92px] z-20 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-black/60"
              aria-label="Pause game"
            >
              Pause
            </button>
          )}

          {phase === "playing" && isPaused && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0B0F19]/70 backdrop-blur-[2px]">
              <div className="pointer-events-auto mx-4 w-full max-w-xs rounded-2xl border border-white/10 bg-white/95 p-6 text-center shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
                  Paused
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Score: {pausedScore}
                </p>
                <button
                  type="button"
                  onClick={resumeGame}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg"
                >
                  Resume
                </button>
                <p className="mt-3 text-xs text-neutral-400">
                  Press P or Esc to resume
                </p>
              </div>
            </div>
          )}

          {phase !== "playing" && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-[#0B0F19]/75 p-3 backdrop-blur-[2px]">
              <div
                className="pointer-events-auto flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/95 p-4 text-center shadow-xl sm:p-5"
                style={{ maxHeight: CANVAS_HEIGHT - 24 }}
              >
                <div className="shrink-0">
                {phase === "gameover" ? (
                  <>
                    <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
                      Core Breached
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-neutral-900">
                      {overlayScore}
                    </p>
                    <p className="text-sm text-neutral-500">points</p>
                    {leaderboardRank !== null && (
                      <p className="mt-1 text-sm font-medium text-violet-600">
                        #{leaderboardRank} on your top 5
                      </p>
                    )}
                    {leaderboardRank === null && overlayScore > 0 && (
                      <p className="mt-1 text-sm text-neutral-500">
                        Didn&apos;t make your top 5 this run.
                      </p>
                    )}
                    {isNewBest && overlayScore > 0 && (
                      <p className="mt-0.5 text-sm font-medium text-amber-600">
                        New personal best!
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
                      Mini-game
                    </p>
                    <p className="mt-1 text-lg font-bold text-neutral-900">
                      Defend the core
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Your best: {getBestScore(leaderboard)}
                    </p>
                  </>
                )}
                </div>

                {phase === "gameover" && (
                  <LeaderboardPanel
                    entries={leaderboard}
                    highlightAt={lastRunAt ?? undefined}
                    editableEntryAt={
                      !nameSaved && lastRunAt !== null ? lastRunAt : undefined
                    }
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    onSaveEntryName={saveEntryName}
                  />
                )}

                <button
                  ref={startButtonRef}
                  type="button"
                  className="mt-3 shrink-0 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg"
                >
                  {phase === "gameover" ? "Play Again" : "Start Game"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function FactoryDefenseGame() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <GameShell />;
  }

  return <FactoryDefenseGameCanvas />;
}
