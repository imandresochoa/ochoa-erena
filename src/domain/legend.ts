export type LegendItem = {
  id: "line-solid" | "line-dashed";
  label: string;
};

export const LEGEND_ITEMS: readonly LegendItem[] = [
  { id: "line-solid", label: "vínculo confirmado" },
  { id: "line-dashed", label: "hipótesis" },
];
