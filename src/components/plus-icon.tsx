export function PlusIcon({ kind = "plus" }: { kind?: "plus" | "minus" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {kind === "minus" ? (
        <path d="M3 8h10" stroke="#0d0d0d" strokeWidth="1.2" />
      ) : (
        <path d="M8 3v10M3 8h10" stroke="#0d0d0d" strokeWidth="1.2" />
      )}
    </svg>
  );
}
