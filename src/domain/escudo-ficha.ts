export type EscudoBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string };

export type EscudoFicha = {
  title: string;
  blocks: EscudoBlock[];
};

export const ESCUDO_OCHOA_TITLE = "El Escudo Ochoa de Eguiara";

export const escudoOchoaFicha: EscudoFicha = {
  title: ESCUDO_OCHOA_TITLE,
  blocks: [
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
  ],
};
