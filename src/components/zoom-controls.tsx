"use client";

import { useState } from "react";
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
  const [pressed, setPressed] = useState(false);

  const press = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  };

  return (
    <div className="flex flex-col items-end gap-6">
      <button
        type="button"
        className="chrome-ctl"
        aria-label="Acercar"
        disabled={zoom >= ZOOM_MAX}
        onClick={() => onZoom(stepZoom(zoom, 1))}
        {...press}
      >
        +
      </button>
      {pressed ? (
        <span className="text-[12px] leading-[1.4] text-[var(--color-muted-ink)]">
          {zoomPercentText(zoom)}
        </span>
      ) : null}
      <button
        type="button"
        className="chrome-ctl"
        aria-label="Alejar"
        disabled={zoom <= ZOOM_MIN}
        onClick={() => onZoom(stepZoom(zoom, -1))}
        {...press}
      >
        −
      </button>
    </div>
  );
}
