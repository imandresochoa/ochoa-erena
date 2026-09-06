"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEGEND_ITEMS } from "@/domain/legend";

function Sample({ id }: { id: (typeof LEGEND_ITEMS)[number]["id"] }) {
  if (id === "line-solid") {
    return <span className="inline-block h-px w-5 bg-[var(--color-line)]" />;
  }
  if (id === "line-dotted") {
    return (
      <span className="inline-block h-px w-5 border-t border-dotted border-[var(--color-line)]" />
    );
  }
  return (
    <span className="inline-block h-px w-5 border-t border-dashed border-[var(--color-line)]" />
  );
}

export function LegendMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="chrome-ctl">Leyenda</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="legend-menu w-max min-w-0 rounded-none border-0 bg-[var(--color-canvas)] p-1.5 shadow-none ring-0 duration-[180ms] ease-out data-open:zoom-in-100 data-closed:zoom-out-100"
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
