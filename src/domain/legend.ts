import { NEBLINA_LEGEND_ID, NEBLINA_LEGEND_LABEL } from "./neblina";

export type LegendItem = {
  id: "line-solid" | "line-dashed" | "line-dotted" | typeof NEBLINA_LEGEND_ID;
  label: string;
};

export const LEGEND_ITEMS: readonly LegendItem[] = [
  { id: "line-solid", label: "vínculo confirmado" },
  { id: "line-dashed", label: "hipótesis" },
  { id: "line-dotted", label: "salto temporal" },
  { id: NEBLINA_LEGEND_ID, label: NEBLINA_LEGEND_LABEL },
];
