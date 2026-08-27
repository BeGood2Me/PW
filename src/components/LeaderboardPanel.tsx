import {
  formatLeaderboardDate,
  MAX_PLAYER_NAME_LENGTH,
  type LeaderboardEntry,
} from "@/lib/game-leaderboard";

export function LeaderboardPanel({
  entries,
  highlightAt,
  editableEntryAt,
  editingName,
  onEditingNameChange,
  onSaveEntryName,
  variant = "overlay",
}: {
  entries: LeaderboardEntry[];
  highlightAt?: number;
  editableEntryAt?: number;
  editingName?: string;
  onEditingNameChange?: (name: string) => void;
  onSaveEntryName?: () => void;
  variant?: "overlay" | "page";
}) {
  const isPage = variant === "page";

  return (
    <div
      className={
        isPage
          ? "rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md sm:p-5"
          : "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-50/90 p-3 text-left"
      }
    >
      <p
        className={
          isPage
            ? "text-sm font-semibold uppercase tracking-widest text-neutral-500"
            : "shrink-0 text-xs font-semibold uppercase tracking-widest text-neutral-400"
        }
      >
        Your top scores
      </p>
      <p
        className={
          isPage
            ? "mt-1 text-xs text-neutral-400"
            : "mt-0.5 shrink-0 text-[11px] text-neutral-400"
        }
      >
        Saved on this device only
      </p>

      {entries.length === 0 ? (
        <p
          className={
            isPage
              ? "mt-3 text-sm text-neutral-500"
              : "mt-2 shrink-0 text-sm text-neutral-500"
          }
        >
          No scores yet. Play a run to set your first record.
        </p>
      ) : (
        <ol
          className={
            isPage
              ? "mt-3 space-y-1"
              : "mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto"
          }
        >
          {entries.map((entry, index) => {
            const isHighlighted = highlightAt === entry.achievedAt;
            const isEditable = editableEntryAt === entry.achievedAt;
            return (
              <li
                key={entry.achievedAt}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  isHighlighted
                    ? "bg-amber-100 font-semibold text-amber-900"
                    : "text-neutral-700"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    index === 0
                      ? "bg-amber-400 text-neutral-900"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {index + 1}
                </span>
                {isEditable && onEditingNameChange && onSaveEntryName ? (
                  <input
                    type="text"
                    value={editingName ?? ""}
                    onChange={(event) => onEditingNameChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSaveEntryName();
                      }
                    }}
                    placeholder="Your name"
                    maxLength={MAX_PLAYER_NAME_LENGTH}
                    autoComplete="nickname"
                    autoFocus
                    className="min-w-0 flex-1 rounded-md border border-violet-300 bg-white px-2 py-1 text-sm font-medium text-neutral-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.name}
                  </span>
                )}
                <span className="shrink-0 text-neutral-600">{entry.score} pts</span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatLeaderboardDate(entry.achievedAt)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {editableEntryAt !== undefined && (
        <p className="mt-2 text-xs text-neutral-400">Press Enter to save your name</p>
      )}
    </div>
  );
}
