"use client";

import { useRef, useState } from "react";
import {
  stepZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomPercentText,
} from "@/domain/view";

type Props = {
  zoom: number;
  onZoom: (zoom: number) => void;
};

export function ZoomControls({ zoom, onZoom }: Props) {
  const [label, setLabel] = useState<string | null>(null);
  const hide = useRef<number>(0);

  function showAfter(next: number) {
    window.clearTimeout(hide.current);
    setLabel(zoomPercentText(next));
    hide.current = window.setTimeout(() => setLabel(null), 700);
    onZoom(next);
  }

  return (
    <div className="flex flex-col items-end gap-4">
      <button
        type="button"
        className="chrome-ctl min-w-[14px]"
        aria-label="Acercar"
        disabled={zoom >= ZOOM_MAX}
        onClick={() => showAfter(stepZoom(zoom, 1))}
      >
        +
      </button>
      {label ? (
        <span className="text-[12px] leading-[1.4] text-[var(--color-muted-ink)]">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        className="chrome-ctl min-w-[14px]"
        aria-label="Alejar"
        disabled={zoom <= ZOOM_MIN}
        onClick={() => showAfter(stepZoom(zoom, -1))}
      >
        −
      </button>
    </div>
  );
}
