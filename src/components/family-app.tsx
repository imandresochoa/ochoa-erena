"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { FocusPicker } from "@/components/focus-picker";
import { LandingScreen } from "@/components/landing-screen";
import { LegendMenu } from "@/components/legend-menu";
import { PersonPanel } from "@/components/person-panel";
import { RestaurarButton } from "@/components/restaurar-button";
import { TreeCanvas } from "@/components/tree-canvas";
import { WelcomeScreen } from "@/components/welcome-screen";
import { ZoomControls } from "@/components/zoom-controls";
import { family } from "@/data/family";
import { requirePerson } from "@/domain/graph";
import { DEFAULT_FOCUS_NAME, type Person } from "@/domain/types";
import {
  closeFicha,
  DEFAULT_ZOOM,
  focusPerson,
  needsRestaurar,
  openFicha,
  restorePan,
  type TreeView,
} from "@/domain/view";

type Screen =
  | { kind: "welcome" }
  | { kind: "landing"; query: string; error: string | null }
  | ({ kind: "tree" } & TreeView);

export function FamilyApp() {
  const [screen, setScreen] = useState<Screen>({ kind: "welcome" });
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const width = window.matchMedia("(max-width: 800px)");
    const sync = () => {
      setCoarsePointer(coarse.matches);
      setNarrow(width.matches);
    };
    sync();
    coarse.addEventListener("change", sync);
    width.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      width.removeEventListener("change", sync);
    };
  }, []);

  const enter = useCallback((person: Person) => {
    setScreen({
      kind: "tree",
      focusId: person.id,
      selectedId: null,
      expandedIds: [],
      pan: { x: 0, y: 0 },
      entering: true,
      zoom: DEFAULT_ZOOM,
    });
    window.setTimeout(() => {
      setScreen((current) =>
        current.kind === "tree" ? { ...current, entering: false } : current,
      );
    }, 400);
  }, []);

  if (screen.kind === "welcome") {
    return (
      <WelcomeScreen
        onContinue={() =>
          setScreen({
            kind: "landing",
            query: DEFAULT_FOCUS_NAME,
            error: null,
          })
        }
      />
    );
  }

  if (screen.kind === "landing") {
    return (
      <LandingScreen
        query={screen.query}
        error={screen.error}
        onQuery={(query) => setScreen({ kind: "landing", query, error: null })}
        onEnter={enter}
        onMiss={() =>
          setScreen({
            kind: "landing",
            query: screen.query,
            error: "Ese nombre no está en el árbol.",
          })
        }
      />
    );
  }

  const focus = requirePerson(family, screen.focusId);
  const selected = screen.selectedId ? requirePerson(family, screen.selectedId) : null;
  const dirty = needsRestaurar(screen.expandedIds);

  return (
    <div className="relative h-dvh w-full bg-[var(--color-canvas)]">
      <TreeCanvas
        focusId={screen.focusId}
        selectedId={screen.selectedId}
        expandedIds={screen.expandedIds}
        pan={screen.pan}
        zoom={screen.zoom}
        entering={screen.entering}
        coarsePointer={coarsePointer}
        onPan={(pan) =>
          setScreen((current) => (current.kind === "tree" ? { ...current, pan } : current))
        }
        onZoom={(zoom) =>
          setScreen((current) => (current.kind === "tree" ? { ...current, zoom } : current))
        }
        onSelect={(id) =>
          setScreen((current) =>
            current.kind === "tree"
              ? { ...current, ...openFicha(current, id) }
              : current,
          )
        }
        onExpand={(id) =>
          setScreen((current) =>
            current.kind === "tree" && !current.expandedIds.includes(id)
              ? { ...current, expandedIds: [...current.expandedIds, id] }
              : current,
          )
        }
      />
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute left-[max(32px,env(safe-area-inset-left))] top-[max(32px,env(safe-area-inset-top))]">
          <FocusPicker
            focus={focus}
            onPick={(person) =>
              setScreen((current) =>
                current.kind === "tree"
                  ? { ...current, ...focusPerson(current, person.id) }
                  : current,
              )
            }
          />
        </div>
        <div className="pointer-events-auto absolute top-[max(32px,env(safe-area-inset-top))] right-[max(32px,env(safe-area-inset-right))] flex flex-col items-end gap-3">
          <LegendMenu />
          <ZoomControls
            zoom={screen.zoom}
            onZoom={(zoom) =>
              setScreen((current) =>
                current.kind === "tree" ? { ...current, zoom } : current,
              )
            }
          />
        </div>
        <div className="pointer-events-auto absolute bottom-[max(32px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
          <RestaurarButton
            visible={dirty}
            onRestore={() =>
              setScreen((current) =>
                current.kind === "tree"
                  ? { ...current, expandedIds: [], pan: restorePan() }
                  : current,
              )
            }
          />
        </div>
      </div>
      <AnimatePresence>
        {selected ? (
          <PersonPanel
            key="ficha"
            person={selected}
            narrow={narrow}
            onBack={() =>
              setScreen((current) =>
                current.kind === "tree"
                  ? { ...current, ...closeFicha(current) }
                  : current,
              )
            }
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
