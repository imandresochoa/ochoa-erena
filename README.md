# Árbol genealógico de la familia Ochoa Erena

A web app for the Ochoa Erena family tree. The first screen is a short welcome text. **Continuar** opens the name field. Type a name. Press **Entrar**. The tree comes out of fog, centered on that person.

Press **+** on a name to show brothers and sisters. Press **Restaurar** at the bottom to collapse them and recenter. Drag the canvas on desktop and on a phone. **Leyenda** (top right) opens the style key. Unconfirmed links use a dashed line. Confirmed parent/child links with a large time gap use a dotted line.

This snapshot comes from the private `second-brain` notes in `familia/` (`arbol.md`, `README.md`, `historia.md`, `fuentes.md`). The app does not fetch GitHub at runtime.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43173](http://127.0.0.1:43173).

```bash
npm test
npm run build
```

## Data snapshot

People and edges live in `src/data/family.json`. `src/domain/parse.ts` reads that file at the boundary.

Rules in the snapshot:

- Do not invent people.
- Do not include discarded **Irene Ochoa Hidalgo**.
- Dates with `~` stay approximate.
- **Martín María Ochoa de Eguiyara Antia** is the oral bisabuelo Martín Ochoa Antía (one person).
- Solid links are confirmed (the ficha names the link, Andrés closed it, or the uncle [AEC] signed it).
- Dashed links are hypotheses (example: José Ochoa Hidalgo, family but exact kinship pending).

### Refresh the snapshot

1. Read `familia/arbol.md` and `familia/README.md` in `imandresochoa/second-brain`.
2. Update `src/data/family.json` only with people and edges that those files name.
3. Run `npm test`.
4. Keep summaries and links tied to `familia/fuentes.md`. Do not add Pulse/lock file tiles or Figma lorem.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui for the Leyenda menu, Motion for the enter and expand fades.
