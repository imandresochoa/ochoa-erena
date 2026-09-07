import { describe, expect, it } from "vitest";
import { parseFamily } from "@/domain/parse";

const FRANCISCO_LINK = {
  label: "Javier Ochoa Palop, Jaén 1961",
  href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
};

const FRANCISCO_SOURCE = {
  label: "Javier Ochoa Palop, Jaén 1961",
  href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
  kind: "web",
  mark: "H",
};

const PUBLIC_UNLOCKED = {
  label: "Acta",
  href: "https://files.test/acta.pdf",
  visibility: "public",
  locked: false,
};

const PUBLIC_LOCKED = {
  label: "Carta",
  href: "https://files.test/carta.pdf",
  visibility: "public",
  locked: true,
};

const PRIVATE_UNLOCKED = {
  label: "Nota",
  href: "https://files.test/nota.pdf",
  visibility: "private",
  locked: false,
};

const PRIVATE_LOCKED = {
  label: "Diario",
  href: "https://files.test/diario.pdf",
  visibility: "private",
  locked: true,
};

function parsePerson(raw: Record<string, unknown>) {
  const [person] = parseFamily({
    people: [
      {
        id: "andres-martin-ochoa-erena",
        displayName: "Andrés Martín Ochoa Erena",
        marks: ["TO"],
        ...raw,
      },
    ],
    edges: [],
  }).people;
  return person;
}

describe("parseFamily files", () => {
  it("reads a valid public unlocked file", () => {
    const person = parsePerson({
      files: [PUBLIC_UNLOCKED],
    });
    expect(person.files).toEqual([PUBLIC_UNLOCKED]);
  });

  it("reads locked and private files onto the person", () => {
    const person = parsePerson({
      files: [PUBLIC_LOCKED, PRIVATE_UNLOCKED, PRIVATE_LOCKED],
    });
    expect(person.files).toEqual([PUBLIC_LOCKED, PRIVATE_UNLOCKED, PRIVATE_LOCKED]);
  });

  it("drops a row missing href", () => {
    const person = parsePerson({
      files: [{ label: PUBLIC_UNLOCKED.label, visibility: "public", locked: false }],
    });
    expect(person.files).toEqual([]);
  });

  it("drops a row missing label", () => {
    const person = parsePerson({
      files: [{ href: PUBLIC_UNLOCKED.href, visibility: "public", locked: false }],
    });
    expect(person.files).toEqual([]);
  });

  it("drops unknown visibility", () => {
    const person = parsePerson({
      files: [
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          visibility: "hidden",
          locked: false,
        },
      ],
    });
    expect(person.files).toEqual([]);
  });

  it("drops a row missing visibility", () => {
    const person = parsePerson({
      files: [
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          locked: false,
        },
      ],
    });
    expect(person.files).toEqual([]);
  });

  it("drops a row missing locked", () => {
    const person = parsePerson({
      files: [
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          visibility: "public",
        },
      ],
    });
    expect(person.files).toEqual([]);
  });

  it("drops a non-boolean locked value", () => {
    const person = parsePerson({
      files: [
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          visibility: "public",
          locked: "false",
        },
      ],
    });
    expect(person.files).toEqual([]);
  });

  it("treats a missing files key as empty", () => {
    const person = parsePerson({
      displayName: "Andrés Martín Ochoa Erena",
    });
    expect(person.files).toEqual([]);
  });

  it("treats a non-array files value as empty", () => {
    const person = parsePerson({
      displayName: "Andrés Martín Ochoa Erena",
      files: { label: PUBLIC_UNLOCKED.label, href: PUBLIC_UNLOCKED.href },
    });
    expect(person.files).toEqual([]);
  });

  it("does not invent files from links or sources", () => {
    const person = parsePerson({
      id: "francisco-javier-ochoa-palop",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      links: [FRANCISCO_LINK],
      sources: [FRANCISCO_SOURCE],
    });
    expect(person.files).toEqual([]);
    expect(person.links).toEqual([FRANCISCO_LINK]);
    expect(person.sources).toEqual([FRANCISCO_SOURCE]);
  });

  it("keeps the person when a file row is invalid", () => {
    const person = parsePerson({
      id: "francisco-javier-ochoa-palop",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      files: [
        PUBLIC_UNLOCKED,
        { label: "", href: PUBLIC_UNLOCKED.href, visibility: "public", locked: false },
        { label: PUBLIC_UNLOCKED.label, href: "", visibility: "public", locked: false },
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          visibility: "public",
        },
        {
          label: PUBLIC_UNLOCKED.label,
          href: PUBLIC_UNLOCKED.href,
          visibility: "hidden",
          locked: false,
        },
      ],
    });
    expect(person.displayName).toBe("Francisco Javier Ochoa Palop");
    expect(person.id).toBe("francisco-javier-ochoa-palop");
    expect(person.files).toEqual([PUBLIC_UNLOCKED]);
  });
});
