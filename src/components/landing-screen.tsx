"use client";

import { defaultPerson, family } from "@/data/family";
import { findExactName, suggestPeople } from "@/domain/search";
import { DEFAULT_FOCUS_NAME, type Person } from "@/domain/types";

type Props = {
  query: string;
  error: string | null;
  onQuery: (value: string) => void;
  onEnter: (person: Person) => void;
  onMiss: () => void;
};

export function LandingScreen({ query, error, onQuery, onEnter, onMiss }: Props) {
  const suggestions = suggestPeople(family.people, query, 8);

  function submit() {
    if (!query.trim() && defaultPerson) {
      onEnter(defaultPerson);
      return;
    }
    const exact = findExactName(family.people, query);
    if (exact) {
      onEnter(exact);
      return;
    }
    if (suggestions.length === 1) {
      onEnter(suggestions[0]);
      return;
    }
    onMiss();
  }

  const showList = suggestions.length > 0 && query.trim() !== DEFAULT_FOCUS_NAME;

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[var(--color-canvas)] p-8">
      <div className="flex w-full max-w-[333px] flex-col items-center gap-[120px]">
        <div className="flex w-full flex-col items-center gap-6">
          <p className="type-title text-center text-base leading-[1.4] text-[var(--color-ink)]">
            Árbol genealógico de la familia Ochoa Erena
          </p>
          <div className="relative w-full">
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              spellCheck={false}
              autoCapitalize="words"
              autoComplete="off"
              aria-label="Nombre"
              className="w-full border-0 border-b border-dashed border-[var(--color-muted-ink)] bg-transparent px-0 py-0 text-center text-base leading-[1.4] text-[var(--color-muted-ink)] outline-none"
            />
            {showList ? (
              <ul className="absolute top-full z-10 mt-2 w-full bg-[var(--color-canvas)]">
                {suggestions.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className="ghost-btn w-full px-2 py-2 text-center"
                      onClick={() => {
                        onQuery(person.displayName);
                        onEnter(person);
                      }}
                    >
                      {person.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? (
              <p className="mt-3 text-center text-sm leading-[1.4] text-[var(--color-muted-ink)]">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={submit} className="ink-btn h-[38px] w-[332px] max-w-full">
          Entrar
        </button>
      </div>
    </div>
  );
}
