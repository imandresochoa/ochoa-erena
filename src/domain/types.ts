export type PersonId = string & { readonly __brand: "PersonId" };

export type SourceMark = "TO" | "H" | "AEC" | "C" | "N";

export type Certainty = "confirmed" | "hypothesis";

export type EdgeKind = "parent" | "spouse" | "sibling";

export type LifeMark = {
  year: number;
  approx: boolean;
  text?: string;
};

export type PersonLink = {
  label: string;
  href?: string;
};

export type Person = {
  id: PersonId;
  displayName: string;
  searchKey: string;
  marks: SourceMark[];
  birth?: LifeMark;
  death?: LifeMark;
  place?: string;
  summary: string;
  links: PersonLink[];
};

export type Edge = {
  kind: EdgeKind;
  from: PersonId;
  to: PersonId;
  certainty: Certainty;
};

export type FamilyGraph = {
  people: Person[];
  edges: Edge[];
};

export type Vec = { x: number; y: number };

export type PlacedNode = {
  id: PersonId;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
};

export type Connector = {
  kind: "parent" | "spouse";
  certainty: Certainty;
  d: string;
};

export type PedigreeLayout = {
  nodes: PlacedNode[];
  connectors: Connector[];
};

export type PointerKind = "tap" | "pan";

export const NODE_HEIGHT = 38;
export const NODE_PAD_X = 16;
export const CHAR_WIDTH = 8;
export const ROW_GAP = 135;
export const PAIR_GAP = 80;
export const SIBLING_GAP = 24;
export const PAN_TAP_PX = 8;
export const DEFAULT_FOCUS_NAME = "Andrés Martín Ochoa Erena";

export function asPersonId(id: string): PersonId {
  return id as PersonId;
}
