import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  ANDRES_NOTICE_EMAIL,
  fichaFromPerson,
} from "@/domain/ficha";
import { asPersonId, type Person } from "@/domain/types";

function person(partial: Partial<Person> & Pick<Person, "displayName">): Person {
  return {
    id: asPersonId(partial.id ?? "thin"),
    displayName: partial.displayName,
    searchKey: partial.searchKey ?? partial.displayName.toLowerCase(),
    marks: partial.marks ?? [],
    birth: partial.birth,
    death: partial.death,
    place: partial.place,
    summary: partial.summary ?? "",
    links: partial.links ?? [],
  };
}

describe("fichaFromPerson", () => {
  it("joins only place and dated marks that already exist", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Pedro Palop Fuentes",
        place: "Lucena",
        birth: { year: 1915, approx: false, text: "Lucena, 1915" },
        death: { year: 1989, approx: false, text: "Córdoba, 1989" },
      }),
    );
    expect(ficha.lifeLine).toBe("Lucena · Lucena, 1915 · Córdoba, 1989");
  });

  it("keeps Andrés on the snapshot place and refuses the Figma mock date", () => {
    const andres = family.people.find(
      (item) => item.id === "andres-martin-ochoa-erena",
    );
    expect(andres).toBeDefined();
    const ficha = fichaFromPerson(andres!);
    expect(ficha.displayName).toBe("Andrés Martín Ochoa Erena");
    expect(ficha.lifeLine).toBe("Jaén");
    expect(ficha.lifeLine).not.toContain("1995");
    expect(ficha.summary).toBe(andres!.summary);
    expect(ficha.links).toEqual([]);
    expect(ficha.files).toEqual([]);
    expect(ficha.noticeMailto).toBeNull();
  });

  it("omits empty summary, links, and files", () => {
    const ficha = fichaFromPerson(person({ displayName: "Josefa Sáez de Eguilaz García de Vicuña" }));
    expect(ficha.summary).toBeNull();
    expect(ficha.links).toEqual([]);
    expect(ficha.files).toEqual([]);
  });

  it("opens a notice mail when the ficha has only a name and optional place", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Heliodoro Palop Padrón",
        place: "Jaén",
      }),
    );
    expect(ficha.noticeMailto).toContain(`mailto:${ANDRES_NOTICE_EMAIL}`);
    const href = new URL(ficha.noticeMailto!);
    expect(href.protocol).toBe("mailto:");
    expect(decodeURIComponent(href.searchParams.get("subject") ?? "")).toContain(
      "Heliodoro Palop Padrón",
    );
    expect(decodeURIComponent(href.searchParams.get("body") ?? "")).toContain(
      "Heliodoro Palop Padrón",
    );
  });

  it("hides the notice when a summary or a real link exists", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          summary: "Padre de Andrés.",
        }),
      ).noticeMailto,
    ).toBeNull();
    expect(
      fichaFromPerson(
        person({
          displayName: "Antonio Erena Camacho",
          links: [{ label: "Geneanet aerec5", href: "https://gw.geneanet.org/aerec5" }],
        }),
      ).noticeMailto,
    ).toBeNull();
  });

  it("forwards snapshot links and never invents archivos", () => {
    const francisco = family.people.find(
      (item) => item.id === "francisco-javier-ochoa-palop",
    );
    expect(francisco).toBeDefined();
    const ficha = fichaFromPerson(francisco!);
    expect(ficha.links).toEqual(francisco!.links);
    expect(ficha.files).toEqual([]);
    expect(ficha.noticeMailto).toBeNull();
  });
});
