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
  const [pressed, setPressed] = useState(false);
  const hide = useRef<number>(0);

  function showPercent() {
    window.clearTimeout(hide.current);
    setPressed(true);
  }

  function hidePercent() {
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setPressed(false), 700);
  }

  const press = {
    onPointerDown: showPercent,
    onPointerUp: hidePercent,
    onPointerCancel: hidePercent,
  };

  return (
    <div className="flex flex-col items-end gap-4">
      <button
        type="button"
        className="chrome-ctl min-w-[14px]"
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
        className="chrome-ctl min-w-[14px]"
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
