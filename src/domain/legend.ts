export type LegendItem = {
  id: "node-idle" | "node-hover" | "node-selected" | "line-solid" | "line-dashed";
  label: string;
};

export const LEGEND_ITEMS: readonly LegendItem[] = [
  { id: "node-idle", label: "Nombre" },
  { id: "node-hover", label: "Nombre al pasar" },
  { id: "node-selected", label: "Nombre elegido" },
  { id: "line-solid", label: "Vínculo confirmado" },
  { id: "line-dashed", label: "Hipótesis / no cerrado" },
];
