import { PAN_TAP_PX, type PersonId, type PointerKind, type Vec } from "./types";

export type TreeView = {
  focusId: PersonId;
  selectedId: PersonId | null;
  expandedIds: PersonId[];
  pan: Vec;
  entering: boolean;
  zoom: number;
};

export const DEFAULT_ZOOM = 1;
export const ZOOM_MAX = 1;
export const ZOOM_MIN = 0.25;
export const ZOOM_STEP = 0.1;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

export function wheelZoom(zoom: number, deltaY: number): number {
  if (deltaY === 0) {
    return clampZoom(zoom);
  }
  return clampZoom(zoom * Math.exp(-deltaY * 0.002));
}

export type PinchSession = {
  startDistance: number;
  startZoom: number;
};

export function startPinch(a: Vec, b: Vec, zoom: number): PinchSession | null {
  const startDistance = Math.hypot(b.x - a.x, b.y - a.y);
  if (startDistance <= 0) {
    return null;
  }
  return { startDistance, startZoom: zoom };
}

export function pinchZoom(session: PinchSession, a: Vec, b: Vec): number {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  if (distance <= 0) {
    return clampZoom(session.startZoom);
  }
  return clampZoom(session.startZoom * (distance / session.startDistance));
}

export function zoomPercentText(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

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

export function focusPerson(view: TreeView, id: PersonId): TreeView {
  const same = id === view.focusId;
  return {
    focusId: id,
    selectedId: same ? view.selectedId : null,
    expandedIds: same ? view.expandedIds : [],
    pan: restorePan(),
    entering: false,
    zoom: view.zoom,
  };
}

export function openFicha(view: TreeView, id: PersonId): TreeView {
  return { ...view, selectedId: id };
}

export function closeFicha(view: TreeView): TreeView {
  return { ...view, selectedId: null };
}

export function toggleExpand(view: TreeView, id: PersonId): TreeView {
  const open = view.expandedIds.includes(id);
  return {
    ...view,
    expandedIds: open
      ? view.expandedIds.filter((item) => item !== id)
      : [...view.expandedIds, id],
  };
}
