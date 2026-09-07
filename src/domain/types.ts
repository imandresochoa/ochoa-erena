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

export type SourceKind = "ahdv" | "pares" | "boe" | "geneanet" | "ahus" | "bvm" | "web";

export type PersonSource = {
  label: string;
  href: string;
  kind: SourceKind;
  mark: SourceMark;
};

export type FileVisibility = "public" | "private";

export type PersonFile = {
  label: string;
  href: string;
  visibility: FileVisibility;
  locked: boolean;
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
  sources: PersonSource[];
  files: PersonFile[];
};

export type Edge = {
  kind: EdgeKind;
  from: PersonId;
  to: PersonId;
  certainty: Certainty;
};

export type ContextKind = "solar";
export type ContextZone = "fog";
export type ContextBranch = "lateral";

export type ContextVinculo = {
  label: string;
  note: string;
};

export type FamilyContext = {
  id: string;
  kind: ContextKind;
  displayName: string;
  place?: string;
  zone: ContextZone;
  branch: ContextBranch;
  todo: string;
  summary: string;
  history: string;
  anchors?: PersonId[];
  vinculaciones: ContextVinculo[];
  links: PersonLink[];
  sources: PersonSource[];
};

export type FamilyGraph = {
  people: Person[];
  edges: Edge[];
  contexts: FamilyContext[];
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
  kind: "parent" | "spouse" | "sibling";
  certainty: Certainty;
  fromId: PersonId;
  toId: PersonId;
  d: string;
  label: string;
};

export type CrestId = "ochoa";

export type PlacedCrest = {
  id: CrestId;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PedigreeLayout = {
  nodes: PlacedNode[];
  connectors: Connector[];
  crests: PlacedCrest[];
};

export type PointerKind = "tap" | "pan";

export const NODE_HEIGHT = 38;
export const NODE_PAD_X = 16;
export const CHAR_WIDTH = 8;
export const ROW_GAP = 148;
export const PAIR_GAP = 64;
export const SIBLING_GAP = 96;
export const BRANCH_GUTTER = 280;
export const PAN_TAP_PX = 8;
export const DEFAULT_FOCUS_NAME = "Andrés Martín Ochoa Erena";
export const DEFAULT_FOCUS_ID = asPersonId("andres-martin-ochoa-erena");

export function asPersonId(id: string): PersonId {
  return id as PersonId;
}
