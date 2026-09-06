"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();
  const [label, setLabel] = useState<string | null>(null);
  const hide = useRef<number>(0);

  function showAfter(next: number) {
    window.clearTimeout(hide.current);
    setLabel(zoomPercentText(next));
    hide.current = window.setTimeout(() => setLabel(null), 700);
    onZoom(next);
  }

  return (
    <div className="relative z-20 flex flex-col items-end gap-4" data-zoom-chrome="stack">
      <button
        type="button"
        className="chrome-ctl chrome-ctl-plain min-w-[14px]"
        aria-label="Acercar"
        data-zoom-chrome="in"
        disabled={zoom >= ZOOM_MAX}
        onClick={() => showAfter(stepZoom(zoom, 1))}
      >
        +
      </button>
      <button
        type="button"
        className="chrome-ctl chrome-ctl-plain min-w-[14px]"
        aria-label="Alejar"
        data-zoom-chrome="out"
        disabled={zoom <= ZOOM_MIN}
        onClick={() => showAfter(stepZoom(zoom, -1))}
      >
        −
      </button>
      <AnimatePresence>
        {label ? (
          <motion.span
            className="pointer-events-none absolute top-1/2 right-full -translate-y-1/2 pr-2 text-[12px] leading-[1.4] text-[var(--color-muted-ink)]"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduce ? 1 : 0 }}
            transition={{
              duration: reduce ? 0 : 0.18,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
