import { PAN_TAP_PX, type PersonId, type PointerKind, type Vec } from "./types";

export function classifyPointer(delta: Vec): PointerKind {
  const distance = Math.hypot(delta.x, delta.y);
  return distance < PAN_TAP_PX ? "tap" : "pan";
}

export function fichaPersonAfterPointer(
  moved: boolean,
  personId: PersonId | null,
): PersonId | null {
  return moved ? null : personId;
}

export function addPan(pan: Vec, delta: Vec): Vec {
  return { x: pan.x + delta.x, y: pan.y + delta.y };
}

export function isRestored(expandedIds: readonly string[], pan: Vec): boolean {
  return expandedIds.length === 0 && pan.x === 0 && pan.y === 0;
}

export function needsRestaurar(expandedIds: readonly string[]): boolean {
  return expandedIds.length > 0;
}

export function restorePan(): Vec {
  return { x: 0, y: 0 };
}
