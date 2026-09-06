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
