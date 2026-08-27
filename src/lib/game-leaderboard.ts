const LEGACY_HIGH_SCORE_KEY = "sean_portfolio_highscore";
const LEGACY_LEADERBOARD_KEY = "sean_portfolio_leaderboard";
const PERSONAL_SCORES_KEY = "sean_portfolio_personal_scores";
const PLAYER_NAME_KEY = "sean_portfolio_player_name";
export const LEADERBOARD_UPDATED_EVENT = "game-leaderboard-updated";
export const LEADERBOARD_SIZE = 5;
export const MAX_PLAYER_NAME_LENGTH = 16;
export const DEFAULT_PLAYER_NAME = "Player";

export type LeaderboardEntry = {
  score: number;
  achievedAt: number;
  name: string;
};

export type LeaderboardResult = {
  entries: LeaderboardEntry[];
  rank: number | null;
  isNewBest: boolean;
};

export function normalizePlayerName(name: string) {
  const trimmed = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmed || DEFAULT_PLAYER_NAME;
}

function parseLeaderboard(raw: string | null): LeaderboardEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (
          typeof entry !== "object" ||
          entry === null ||
          typeof (entry as LeaderboardEntry).score !== "number" ||
          typeof (entry as LeaderboardEntry).achievedAt !== "number"
        ) {
          return null;
        }

        const rawName = (entry as LeaderboardEntry).name;
        const name =
          typeof rawName === "string"
            ? normalizePlayerName(rawName)
            : DEFAULT_PLAYER_NAME;

        return {
          score: Math.max(0, Math.floor((entry as LeaderboardEntry).score)),
          achievedAt: (entry as LeaderboardEntry).achievedAt,
          name,
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((a, b) => b.score - a.score || b.achievedAt - a.achievedAt)
      .slice(0, LEADERBOARD_SIZE);
  } catch {
    return [];
  }
}

function migrateLegacyHighScore(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  try {
    const legacy = window.localStorage.getItem(LEGACY_HIGH_SCORE_KEY);
    const parsed = legacy ? Number.parseInt(legacy, 10) : 0;
    if (!Number.isFinite(parsed) || parsed <= 0) return entries;

    const alreadyMigrated = entries.some((entry) => entry.score >= parsed);
    if (alreadyMigrated) return entries;

    return [
      { score: parsed, achievedAt: Date.now(), name: DEFAULT_PLAYER_NAME },
      ...entries,
    ]
      .sort((a, b) => b.score - a.score || b.achievedAt - a.achievedAt)
      .slice(0, LEADERBOARD_SIZE);
  } catch {
    return entries;
  }
}

function writeLeaderboard(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(PERSONAL_SCORES_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(LEADERBOARD_UPDATED_EVENT));
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

function readStoredScores(): LeaderboardEntry[] {
  const personal = parseLeaderboard(window.localStorage.getItem(PERSONAL_SCORES_KEY));
  if (personal.length > 0) return personal;

  const legacyLeaderboard = parseLeaderboard(
    window.localStorage.getItem(LEGACY_LEADERBOARD_KEY),
  );
  if (legacyLeaderboard.length > 0) return legacyLeaderboard;

  return [];
}

export function readPlayerName() {
  try {
    const stored = window.localStorage.getItem(PLAYER_NAME_KEY);
    return stored ? normalizePlayerName(stored) : "";
  } catch {
    return "";
  }
}

export function writePlayerName(name: string) {
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, normalizePlayerName(name));
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const stored = readStoredScores();
    const migrated = migrateLegacyHighScore(stored);

    if (
      migrated.length !== stored.length ||
      migrated.some((entry, index) => {
        const previous = stored[index];
        return (
          !previous ||
          previous.score !== entry.score ||
          previous.achievedAt !== entry.achievedAt ||
          previous.name !== entry.name
        );
      })
    ) {
      writeLeaderboard(migrated);
    }

    return migrated;
  } catch {
    return [];
  }
}

export function getBestScore(entries: LeaderboardEntry[]) {
  return entries[0]?.score ?? 0;
}

export function addToLeaderboard(
  score: number,
  name: string,
): LeaderboardResult {
  const normalizedScore = Math.max(0, Math.floor(score));
  const normalizedName = normalizePlayerName(name);
  const previous = readLeaderboard();
  const previousBest = getBestScore(previous);

  if (normalizedScore === 0) {
    return { entries: previous, rank: null, isNewBest: false };
  }

  const nextEntry: LeaderboardEntry = {
    score: normalizedScore,
    achievedAt: Date.now(),
    name: normalizedName,
  };

  const entries = [...previous, nextEntry]
    .sort((a, b) => b.score - a.score || b.achievedAt - a.achievedAt)
    .slice(0, LEADERBOARD_SIZE);

  writeLeaderboard(entries);

  const rank =
    entries.findIndex(
      (entry) =>
        entry.score === nextEntry.score &&
        entry.achievedAt === nextEntry.achievedAt,
    ) + 1;

  const madeBoard = rank > 0;
  const isNewBest = normalizedScore > previousBest;

  return {
    entries,
    rank: madeBoard ? rank : null,
    isNewBest,
  };
}

export function updateLeaderboardEntryName(
  achievedAt: number,
  name: string,
): LeaderboardEntry[] {
  const normalizedName = normalizePlayerName(name);
  const entries = readLeaderboard().map((entry) =>
    entry.achievedAt === achievedAt
      ? { ...entry, name: normalizedName }
      : entry,
  );

  writeLeaderboard(entries);
  return entries;
}

export function formatLeaderboardDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
