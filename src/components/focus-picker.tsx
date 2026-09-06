"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { family } from "@/data/family";
import { findExactName, suggestPeople } from "@/domain/search";
import type { Person } from "@/domain/types";

type Props = {
  focus: Person;
  onPick: (person: Person) => void;
};

export function FocusPicker({ focus, onPick }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [miss, setMiss] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const editing = draft !== null;
  const query = draft ?? focus.displayName;
  const rawSuggestions = editing ? suggestPeople(family.people, query, 8) : [];
  const exactCurrent = query.trim() !== "" && findExactName([focus], query) === focus;
  const suggestions = exactCurrent
    ? rawSuggestions.filter((person) => person.id !== focus.id)
    : rawSuggestions;
  const showList = suggestions.length > 0;

  useLayoutEffect(() => {
    if (editing) {
      input.current?.select();
    }
  }, [editing]);

  function close() {
    setDraft(null);
    setMiss(false);
  }

  function cancel() {
    close();
    input.current?.blur();
  }

  function pick(person: Person) {
    cancel();
    onPick(person);
  }

  function submit() {
    if (!query.trim()) {
      cancel();
      return;
    }
    const exact = findExactName(family.people, query);
    if (exact) {
      if (exact.id === focus.id) {
        cancel();
        return;
      }
      pick(exact);
      return;
    }
    if (suggestions.length === 1) {
      pick(suggestions[0]);
      return;
    }
    setMiss(true);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
    >
      <span className="inline-grid">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 text-[12px] leading-[1.4] whitespace-pre"
        >
          {focus.displayName}
        </span>
        <input
          ref={input}
          value={query}
          placeholder={focus.displayName}
          aria-label="Persona en foco"
          size={1}
          spellCheck={false}
          autoCapitalize="words"
          autoComplete="off"
          className="chrome-ctl col-start-1 row-start-1 w-full min-w-0"
          onFocus={() => {
            if (!editing) {
              setDraft(focus.displayName);
            } else {
              input.current?.select();
            }
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setMiss(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
        />
      </span>
      {showList || miss ? (
        <div
          className="absolute top-full left-0 z-10 mt-2 w-max min-w-full bg-[var(--color-canvas)] p-1.5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {miss ? (
            <p className="px-1.5 py-1 text-[12px] leading-[1.4] text-[var(--color-muted-ink)]">
              Ese nombre no está en el árbol.
            </p>
          ) : null}
          {showList ? (
            <ul>
              {suggestions.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    className="block w-full px-1.5 py-1 text-left text-[12px] leading-[1.4] whitespace-nowrap text-[var(--color-muted-ink)] outline-none hover:bg-[var(--color-node)] hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-node)] focus-visible:text-[var(--color-ink)]"
                    onClick={() => pick(person)}
                  >
                    {person.displayName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
