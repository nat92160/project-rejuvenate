import { memo, useEffect, useState } from "react";

interface TimeInputRowProps {
  label: string;
  value: string;
  noteValue: string;
  onChange?: (value: string) => void;
  onNoteChange: (value: string) => void;
  readOnly?: boolean;
}

function formatTimeDraft(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export const TimeInputRow = memo(function TimeInputRow({
  label,
  value,
  noteValue,
  onChange,
  onNoteChange,
  readOnly = false,
}: TimeInputRowProps) {
  const [draftTime, setDraftTime] = useState(value);
  const [draftNote, setDraftNote] = useState(noteValue);

  useEffect(() => {
    setDraftTime(value);
  }, [value]);

  useEffect(() => {
    setDraftNote(noteValue);
  }, [noteValue]);

  const commitTime = () => {
    const normalized = formatTimeDraft(draftTime);
    setDraftTime(normalized);
    onChange?.(normalized);
  };

  const clearTime = () => {
    setDraftTime("");
    onChange?.("");
  };

  const commitNote = () => {
    onNoteChange(draftNote);
  };

  return (
    <div className="grid gap-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)_32px] sm:items-center">
      <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">
        {label}
      </span>

      <div className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)_32px] gap-2 sm:contents">
        {readOnly ? (
          <div className="flex h-10 w-full items-center justify-center rounded-xl border border-border bg-muted px-2 text-center text-xs font-semibold text-foreground">
            {value || "—"}
          </div>
        ) : (
          <div className="relative min-w-0">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draftTime}
              onChange={(event) => setDraftTime(formatTimeDraft(event.target.value))}
              onBlur={commitTime}
              aria-label={`${label} - horaire à indiquer`}
              className="h-10 w-full rounded-xl border border-input bg-background px-2 text-center text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            {!draftTime && (
              <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-[8px] leading-[1.05] text-muted-foreground/70">
                <span>Horaire</span>
                <span>à indiquer</span>
              </span>
            )}
          </div>
        )}

        <input
          type="text"
          autoComplete="off"
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          onBlur={commitNote}
          placeholder="Note libre"
          className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-[11px] text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
        />

        {readOnly ? (
          <div className="h-8 w-8" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={clearTime}
            aria-label={`Effacer ${label}`}
            className={`h-8 w-8 self-center rounded-lg bg-destructive/10 text-xs text-destructive transition-transform active:scale-95 ${draftTime ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});
