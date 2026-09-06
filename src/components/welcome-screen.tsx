"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  SPLASH_DRAW_S,
  SPLASH_EASE,
  SPLASH_MARK,
  SPLASH_MORPH_S,
  SPLASH_REVEAL_S,
  SPLASH_STORAGE_KEY,
  parseSplashMark,
  splashIntent,
  splashStroke,
} from "@/domain/splash";
import { WELCOME_INTRODUCTION, WELCOME_TITLE } from "@/domain/welcome";

type Props = {
  onContinue: () => void;
};

let consumed: "play" | "skip" | undefined;

function consumeSplash(reducedMotion: boolean): "play" | "skip" {
  if (consumed !== undefined) {
    return consumed;
  }
  try {
    const played = parseSplashMark(sessionStorage.getItem(SPLASH_STORAGE_KEY));
    consumed = splashIntent({ reducedMotion, played });
    sessionStorage.setItem(SPLASH_STORAGE_KEY, SPLASH_MARK);
    return consumed;
  } catch {
    consumed = "skip";
    return "skip";
  }
}

function subscribeNoop() {
  return () => {};
}

function clientReady() {
  return true;
}

function serverReady() {
  return false;
}

export function WelcomeScreen({ onContinue }: Props) {
  const reducedMotion = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeNoop, clientReady, serverReady);
  const [playDone, setPlayDone] = useState(false);
  const intent =
    mounted && typeof reducedMotion === "boolean"
      ? consumeSplash(reducedMotion)
      : null;

  useEffect(() => {
    if (intent !== "play") {
      return;
    }
    const id = window.setTimeout(
      () => setPlayDone(true),
      Math.round((SPLASH_DRAW_S + SPLASH_MORPH_S + SPLASH_REVEAL_S) * 1000),
    );
    return () => window.clearTimeout(id);
  }, [intent]);

  const chromeReady = intent === "skip" || playDone;

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[var(--color-canvas)] p-8">
      {intent === null ? null : (
        <WelcomeBody
          play={intent === "play"}
          chromeReady={chromeReady}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}

function WelcomeBody({
  play,
  chromeReady,
  onContinue,
}: {
  play: boolean;
  chromeReady: boolean;
  onContinue: () => void;
}) {
  const stroke = splashStroke();
  const reveal = {
    duration: SPLASH_REVEAL_S,
    ease: SPLASH_EASE,
    delay: SPLASH_DRAW_S + SPLASH_MORPH_S,
  };

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-[120px]">
      <div className="flex w-full flex-col items-center gap-6">
        <div className="relative flex w-full items-center justify-center">
          {play ? (
            <svg
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[min(100%,22rem)] -translate-x-1/2 -translate-y-1/2 overflow-visible"
              viewBox="0 0 100 1"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 0 0.5 H 100"
                pathLength={1}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeDasharray={stroke.dasharray}
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 1, scaleY: 1 }}
                animate={{ pathLength: 1, opacity: 0, scaleY: 0.3 }}
                transition={{
                  pathLength: { duration: SPLASH_DRAW_S, ease: SPLASH_EASE },
                  opacity: {
                    duration: SPLASH_MORPH_S,
                    ease: SPLASH_EASE,
                    delay: SPLASH_DRAW_S,
                  },
                  scaleY: {
                    duration: SPLASH_MORPH_S,
                    ease: SPLASH_EASE,
                    delay: SPLASH_DRAW_S,
                  },
                }}
              />
            </svg>
          ) : null}
          {play ? (
            <motion.p
              className="type-title text-center text-base leading-[1.4] text-[var(--color-ink)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: SPLASH_MORPH_S,
                ease: SPLASH_EASE,
                delay: SPLASH_DRAW_S,
              }}
            >
              {WELCOME_TITLE}
            </motion.p>
          ) : (
            <p className="type-title text-center text-base leading-[1.4] text-[var(--color-ink)]">
              {WELCOME_TITLE}
            </p>
          )}
        </div>
        {play ? (
          <motion.p
            className="font-satoshi text-center text-base leading-[1.4] text-[var(--color-muted-ink)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reveal}
            aria-hidden={!chromeReady}
          >
            {WELCOME_INTRODUCTION}
          </motion.p>
        ) : (
          <p className="font-satoshi text-center text-base leading-[1.4] text-[var(--color-muted-ink)]">
            {WELCOME_INTRODUCTION}
          </p>
        )}
      </div>
      {play ? (
        <motion.button
          type="button"
          onClick={onContinue}
          className={`ink-btn h-[38px] w-[332px] max-w-full${chromeReady ? "" : " pointer-events-none"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
          tabIndex={chromeReady ? undefined : -1}
          aria-hidden={!chromeReady}
        >
          Continuar
        </motion.button>
      ) : (
        <button type="button" onClick={onContinue} className="ink-btn h-[38px] w-[332px] max-w-full">
          Continuar
        </button>
      )}
    </div>
  );
}
