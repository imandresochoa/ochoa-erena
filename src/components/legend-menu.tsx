"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEGEND_ITEMS } from "@/domain/legend";

function Sample({ id }: { id: (typeof LEGEND_ITEMS)[number]["id"] }) {
  if (id === "node-idle") {
    return <span className="inline-block h-2.5 w-5 bg-[var(--color-node)]" />;
  }
  if (id === "node-hover") {
    return (
      <span className="relative inline-block h-2.5 w-5 bg-[var(--color-node-hover)]">
        <span className="absolute -top-px -right-px h-1 w-1 border-t border-r border-[var(--color-ink)]" />
        <span className="absolute -bottom-px -left-px h-1 w-1 border-b border-l border-[var(--color-ink)]" />
      </span>
    );
  }
  if (id === "node-selected") {
    return (
      <span className="relative inline-block h-2.5 w-5 bg-[var(--color-ink)]">
        <span className="absolute -top-px -right-px h-1 w-1 border-t border-r border-[var(--color-canvas)]" />
        <span className="absolute -bottom-px -left-px h-1 w-1 border-b border-l border-[var(--color-canvas)]" />
      </span>
    );
  }
  if (id === "line-solid") {
    return <span className="inline-block h-px w-5 bg-[var(--color-line)]" />;
  }
  return (
    <span className="inline-block h-px w-5 border-t border-dashed border-[var(--color-line)]" />
  );
}

export function LegendMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="chip-btn">Leyenda</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="legend-menu min-w-0 rounded-none border-0 bg-[var(--color-canvas)] p-1.5 shadow-none ring-0 duration-[180ms] data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        {LEGEND_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="rounded-none px-1.5 py-0.5 text-[11px] leading-[1.4] text-[var(--color-muted-ink)] focus:bg-[var(--color-node)] focus:text-[var(--color-ink)]"
          >
            <Sample id={item.id} />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
