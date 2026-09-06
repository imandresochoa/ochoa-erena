"use client";

import { WELCOME_INTRODUCTION } from "@/domain/welcome";

type Props = {
  onContinue: () => void;
};

export function WelcomeScreen({ onContinue }: Props) {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[var(--color-canvas)] p-8">
      <div className="flex w-full max-w-[560px] flex-col items-center gap-[120px]">
        <div className="flex w-full flex-col items-center gap-6">
          <p className="type-title text-center text-base leading-[1.4] text-[var(--color-ink)]">
            Árbol genealógico de la familia Ochoa Erena
          </p>
          <p className="font-satoshi text-center text-base leading-[1.4] text-[var(--color-muted-ink)]">
            {WELCOME_INTRODUCTION}
          </p>
        </div>
        <button type="button" onClick={onContinue} className="ink-btn h-[38px] w-[332px] max-w-full">
          Continuar
        </button>
      </div>
    </div>
  );
}
