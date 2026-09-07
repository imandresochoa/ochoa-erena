import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ESCUDO_OCHOA_TITLE,
  escudoOchoaFicha,
} from "@/domain/escudo-ficha";

const TITLE = "El Escudo Ochoa de Eguiara";

const BLOCKS = [
  {
    kind: "p",
    text: "El escudo de armas del apellido Ochoa de Eguiara combina los elementos tradicionales y la simbología de hidalguía de la rama primitiva de este linaje vasco asentado en Guipúzcoa. En la heráldica tradicional española, los apellidos compuestos suelen heredar el blasón de la rama patronímica principal o fusionar las armas de la casa solar de la que provienen.",
  },
  {
    kind: "h",
    text: "Descripción del Blasón Primitivo (Rama Ochoa)",
  },
  {
    kind: "p",
    text: "El diseño principal que portan las familias unidas a este linaje sigue la composición clásica del apellido Ochoa:",
  },
  {
    kind: "p",
    text: "El Campo Principal: En campo de plata, se sitúan dos lobos de sable (negros), pasantes y dispuestos en palo (uno sobre otro). Los lobos suelen aparecer con las lenguas de gules (rojo). Este elemento alude directamente al significado del apellido en euskera antiguo (Otsoa, el lobo).",
  },
  {
    kind: "p",
    text: "La Bordura: El escudo está rodeado por una bordura de azur (azul) cargada con ocho estrellas de oro (amarillo), que representan el resplandor, las victorias militares o la guía espiritual de los caballeros del linaje.",
  },
  {
    kind: "h",
    text: "Variación por la Casa Solar (Eguiara / Egiara)",
  },
  {
    kind: "p",
    text: "Al tratarse de una denominación vinculada a un caserío específico en Vergara, existen registros donde las ramas que simplificaron el apellido a Eguiara incorporaron símbolos propios de la heráldica de la zona de Guipúzcoa. Es habitual que estas variantes muestren un árbol (roble o encina) de sinople (verde) arraigado, sumado a los lobos, representando la propiedad de la tierra y la antigüedad de la casa solar vasca.",
  },
] as const;

const SENTENCES = [
  "El escudo de armas del apellido Ochoa de Eguiara combina los elementos tradicionales y la simbología de hidalguía de la rama primitiva de este linaje vasco asentado en Guipúzcoa.",
  "En la heráldica tradicional española, los apellidos compuestos suelen heredar el blasón de la rama patronímica principal o fusionar las armas de la casa solar de la que provienen.",
  "El diseño principal que portan las familias unidas a este linaje sigue la composición clásica del apellido Ochoa:",
  "El Campo Principal: En campo de plata, se sitúan dos lobos de sable (negros), pasantes y dispuestos en palo (uno sobre otro).",
  "Los lobos suelen aparecer con las lenguas de gules (rojo).",
  "Este elemento alude directamente al significado del apellido en euskera antiguo (Otsoa, el lobo).",
  "La Bordura: El escudo está rodeado por una bordura de azur (azul) cargada con ocho estrellas de oro (amarillo), que representan el resplandor, las victorias militares o la guía espiritual de los caballeros del linaje.",
  "Al tratarse de una denominación vinculada a un caserío específico en Vergara, existen registros donde las ramas que simplificaron el apellido a Eguiara incorporaron símbolos propios de la heráldica de la zona de Guipúzcoa.",
  "Es habitual que estas variantes muestren un árbol (roble o encina) de sinople (verde) arraigado, sumado a los lobos, representando la propiedad de la tierra y la antigüedad de la casa solar vasca.",
];

describe("escudo Ochoa ficha", () => {
  it("uses the exact title constant", () => {
    expect(ESCUDO_OCHOA_TITLE).toBe(TITLE);
    expect(escudoOchoaFicha.title).toBe(ESCUDO_OCHOA_TITLE);
  });

  it("keeps Andrés copy in heading and paragraph blocks", () => {
    expect(escudoOchoaFicha.blocks).toEqual([...BLOCKS]);
  });

  it("joins every sentence of the Andrés copy", () => {
    const joined = escudoOchoaFicha.blocks.map((block) => block.text).join("\n");
    expect(joined).toContain("Descripción del Blasón Primitivo (Rama Ochoa)");
    expect(joined).toContain("Variación por la Casa Solar (Eguiara / Egiara)");
    for (const sentence of SENTENCES) {
      expect(joined).toContain(sentence);
    }
  });

  it("does not import family people", () => {
    const src = readFileSync(path.join(import.meta.dirname, "escudo-ficha.ts"), "utf8");
    expect(src).not.toMatch(/@\/data\/family|family\.json/);
    expect(src).not.toMatch(/from ["']@\/data\//);
  });

  it("does not add sources, oral jargon, hrefs, people, or parent edges", () => {
    expect(escudoOchoaFicha).not.toHaveProperty("sources");
    const blob = [escudoOchoaFicha.title, ...escudoOchoaFicha.blocks.map((block) => block.text)].join(
      "\n",
    );
    expect(blob).not.toMatch(/fuente oral/i);
    expect(blob).not.toMatch(/https?:\/\//);
    expect(blob).not.toMatch(/andres-martin-ochoa-erena|francisco-javier-ochoa-palop/);
    const src = readFileSync(path.join(import.meta.dirname, "escudo-ficha.ts"), "utf8");
    expect(src).not.toMatch(/href/);
    expect(src).not.toMatch(/kind:\s*["']parent["']/);
    expect(src).not.toMatch(/asPersonId|PersonId/);
  });
});
