export const LARGE_TIME_GAP_YEARS = 40;
export const HYPOTHESIS_DASH = "4 4";
export const TEMPORAL_GAP_DASH = "1 3";

export function hasLargeTimeGap(
  parentBirthYear: number | undefined,
  childBirthYear: number | undefined,
): boolean {
  return (
    parentBirthYear !== undefined &&
    childBirthYear !== undefined &&
    childBirthYear - parentBirthYear >= LARGE_TIME_GAP_YEARS
  );
}

export function connectorDasharray(input: {
  kind: "parent" | "spouse" | "sibling";
  certainty: "confirmed" | "hypothesis";
  parentBirthYear?: number;
  childBirthYear?: number;
}): string | undefined {
  if (input.certainty === "hypothesis") {
    return HYPOTHESIS_DASH;
  }
  if (
    input.kind === "parent" &&
    hasLargeTimeGap(input.parentBirthYear, input.childBirthYear)
  ) {
    return TEMPORAL_GAP_DASH;
  }
  return undefined;
}

export function connectorStroke(hovered: boolean): string {
  return hovered ? "var(--color-muted-ink)" : "var(--color-line)";
}

export function paintConnectors<T>(
  connectors: readonly T[],
  hovered: (item: T) => boolean,
): T[] {
  if (!connectors.some(hovered)) {
    return connectors.slice();
  }
  const idle: T[] = [];
  const hot: T[] = [];
  for (const item of connectors) {
    (hovered(item) ? hot : idle).push(item);
  }
  return [...idle, ...hot];
}
