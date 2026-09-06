"use client";

import type { Person } from "@/domain/types";

type Props = {
  person: Person;
  narrow: boolean;
  onBack: () => void;
};

function lifeLine(person: Person): string {
  return [person.place, person.birth?.text, person.death?.text].filter(Boolean).join(" · ");
}

export function PersonPanel({ person, narrow, onBack }: Props) {
  const facts = lifeLine(person);

  return (
    <aside
      className={`absolute z-30 flex flex-col overflow-hidden border-[var(--color-line)] bg-[rgb(244_242_239_/_0.8)] p-2.5 backdrop-blur-[15px] ${
        narrow
          ? "inset-x-0 bottom-0 max-h-[70dvh] border-t"
          : "top-0 right-0 h-full w-[min(518px,38vw)] border-l"
      }`}
    >
      <div className="sticky top-0 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="ghost-btn gap-1 py-1 pr-3"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 5 L7.5 10 L12.5 15" stroke="#1a1a1a" strokeWidth="1.2" />
          </svg>
          Volver
        </button>
      </div>
      <div className="font-satoshi flex flex-1 flex-col gap-8 overflow-auto p-[25px] text-base leading-[1.4]">
        <div className="flex flex-col gap-1">
          <p className="text-[var(--color-ink)]">{person.displayName}</p>
          {facts ? <p className="text-[var(--color-muted-ink)]">{facts}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[var(--color-ink)]">Resumen</p>
          <p className="text-[var(--color-muted-ink)]">
            {person.summary || "Sin resumen en el snapshot."}
          </p>
        </div>
        {person.links.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-[var(--color-ink)]">Enlaces de interés</p>
            {person.links.map((link) =>
              link.href ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-muted-ink)] underline-offset-2 hover:underline"
                >
                  {link.label}
                </a>
              ) : (
                <p key={link.label} className="text-[var(--color-muted-ink)]">
                  {link.label}
                </p>
              ),
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
