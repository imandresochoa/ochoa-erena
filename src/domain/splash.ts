import { connectorStroke } from "@/domain/connector-paint";

export const SPLASH_MARK = "1";
export const SPLASH_STORAGE_KEY = "ochoa-erena:splash-played";
export const SPLASH_DRAW_S = 0.56;
export const SPLASH_MORPH_S = 0.28;
export const SPLASH_REVEAL_S = 0.24;
export const SPLASH_EASE = [0.23, 1, 0.32, 1] as const;

export function splashIntent({
  reducedMotion,
  played,
}: {
  reducedMotion: boolean;
  played: boolean;
}): "play" | "skip" {
  return reducedMotion || played ? "skip" : "play";
}

export function parseSplashMark(raw: string | null): boolean {
  return raw === SPLASH_MARK;
}

export function splashStroke(): {
  color: string;
  width: number;
  dasharray: undefined;
} {
  return {
    color: connectorStroke(false),
    width: 1,
    dasharray: undefined,
  };
}
