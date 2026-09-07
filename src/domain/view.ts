import { expansionsToReveal } from "./graph";
import { layoutHouseCanvas } from "./layout";
import {
  NODE_HEIGHT,
  PAN_TAP_PX,
  type FamilyGraph,
  type PedigreeLayout,
  type PersonId,
  type PointerKind,
  type Vec,
} from "./types";

export type TreeView = {
  focusId: PersonId;
  selectedId: string | null;
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
  personId: string | null,
): string | null {
  return moved ? null : personId;
}

export function addPan(pan: Vec, delta: Vec): Vec {
  return { x: pan.x + delta.x, y: pan.y + delta.y };
}

export function isRestored(expandedIds: readonly string[], pan: Vec): boolean {
  return expandedIds.length === 0 && pan.x === 0 && pan.y === 0;
}

export function needsRestaurar(
  expandedIds: readonly string[],
  requiredIds: readonly string[] = [],
): boolean {
  return expandedIds.some((id) => !requiredIds.includes(id));
}

export function restorePan(): Vec {
  return { x: 0, y: 0 };
}

export function framePerson(
  layout: PedigreeLayout,
  id: PersonId,
  zoom: number,
): Vec {
  const node = layout.nodes.find((item) => item.id === id);
  if (!node) {
    return restorePan();
  }
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const x = -zoom * cx;
  const y = NODE_HEIGHT / 2 - zoom * cy;
  return {
    x: x === 0 ? 0 : x,
    y: y === 0 ? 0 : y,
  };
}

function mergeExpanded(
  current: readonly PersonId[],
  extra: readonly PersonId[],
): PersonId[] {
  const merged = [...current];
  for (const id of extra) {
    if (!merged.includes(id)) {
      merged.push(id);
    }
  }
  return merged;
}

export function focusPerson(
  view: TreeView,
  id: PersonId,
  graph: FamilyGraph,
): TreeView {
  const same = id === view.focusId;
  const expandedIds = mergeExpanded(view.expandedIds, expansionsToReveal(graph, id));
  const layout = layoutHouseCanvas(graph, id, expandedIds);
  return {
    focusId: id,
    selectedId: same ? view.selectedId : null,
    expandedIds,
    pan: framePerson(layout, id, view.zoom),
    entering: false,
    zoom: view.zoom,
  };
}

export function restoreFocusView(view: TreeView, graph: FamilyGraph): TreeView {
  const expandedIds = expansionsToReveal(graph, view.focusId);
  const layout = layoutHouseCanvas(graph, view.focusId, expandedIds);
  return {
    ...view,
    expandedIds,
    pan: framePerson(layout, view.focusId, view.zoom),
  };
}

export function openFicha(view: TreeView, id: string): TreeView {
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
