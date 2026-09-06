import { describe, expect, it } from "vitest";
import {
  formatHouseDate,
  formatLifeMark,
  formatOptionalLifeMark,
} from "@/domain/date-format";
import type { LifeMark } from "@/domain/types";

const MONTHS: ReadonlyArray<readonly [number, string]> = [
  [1, "enero"],
  [2, "febrero"],
  [3, "marzo"],
  [4, "abril"],
  [5, "mayo"],
  [6, "junio"],
  [7, "julio"],
  [8, "agosto"],
  [9, "septiembre"],
  [10, "octubre"],
  [11, "noviembre"],
  [12, "diciembre"],
];

describe("formatHouseDate", () => {
  it("formats a full day as d de MMMM de yyyy", () => {
    expect(formatHouseDate({ day: 12, month: 11, year: 1995 })).toBe(
      "12 de noviembre de 1995",
    );
  });

  it("formats month and year without inventing a day", () => {
    expect(formatHouseDate({ month: 11, year: 1995 })).toBe("noviembre de 1995");
  });

  it("formats a year alone", () => {
    expect(formatHouseDate({ year: 1995 })).toBe("1995");
  });

  it("prefixes an approximate year with one tilde", () => {
    expect(formatHouseDate({ year: 1961, approx: true })).toBe("~1961");
  });

  it("prefixes an approximate full day with one tilde", () => {
    expect(formatHouseDate({ day: 12, month: 11, year: 1995, approx: true })).toBe(
      "~12 de noviembre de 1995",
    );
  });

  it("does not pad a single-digit day", () => {
    expect(formatHouseDate({ day: 7, month: 10, year: 1885 })).toBe(
      "7 de octubre de 1885",
    );
  });

  it("uses Spanish Spain month names in lowercase", () => {
    for (const [month, name] of MONTHS) {
      expect(formatHouseDate({ day: 1, month, year: 2000 })).toBe(
        `1 de ${name} de 2000`,
      );
    }
  });
});

describe("formatLifeMark", () => {
  it("keeps baut. and formats a baptism ISO day from stored text", () => {
    expect(
      formatLifeMark({
        year: 1874,
        approx: false,
        text: "baut. 1874-10-12, San Pedro, Vitoria",
      }),
    ).toBe("baut. 12 de octubre de 1874");
  });

  it("formats an ISO day without a baut. prefix", () => {
    expect(
      formatLifeMark({
        year: 1859,
        approx: false,
        text: "1859-07-14, San Miguel",
      }),
    ).toBe("14 de julio de 1859");
  });

  it("formats ISO month and year from text", () => {
    expect(formatLifeMark({ year: 1995, approx: false, text: "1995-11" })).toBe(
      "noviembre de 1995",
    );
  });

  it("drops the leading zero on a baptism day", () => {
    expect(
      formatLifeMark({ year: 1885, approx: false, text: "baut. 1885-10-07" }),
    ).toBe("baut. 7 de octubre de 1885");
  });

  it("strips muerte and source tags from an approximate death year", () => {
    expect(
      formatLifeMark({
        year: 1926,
        approx: true,
        text: "muerte ~1926 [TO]",
      }),
    ).toBe("~1926");
  });

  it("uses the year from place-plus-year text and drops the place", () => {
    expect(
      formatLifeMark({ year: 1915, approx: false, text: "Lucena, 1915" }),
    ).toBe("1915");
  });

  it("keeps one tilde and drops the place from an approximate year", () => {
    expect(
      formatLifeMark({ year: 1961, approx: true, text: "~1961, Jaén" }),
    ).toBe("~1961");
  });

  it("formats a year-only stored text", () => {
    expect(formatLifeMark({ year: 2015, approx: false, text: "2015" })).toBe(
      "2015",
    );
  });

  it("keeps the tilde when approx is false but the text has one", () => {
    expect(formatLifeMark({ year: 1994, approx: false, text: "~1994" })).toBe(
      "~1994",
    );
  });

  it("adds a tilde when approx is true and the text is a plain year", () => {
    expect(formatLifeMark({ year: 2015, approx: true, text: "2015" })).toBe(
      "~2015",
    );
  });

  it("does not invent a day or month when the mark has no text", () => {
    expect(formatLifeMark({ year: 1961, approx: true })).toBe("~1961");
  });

  it("does not double the tilde when both the flag and the text mark approx", () => {
    expect(formatLifeMark({ year: 1961, approx: true, text: "~1961" })).toBe(
      "~1961",
    );
  });

  it("formats a marriage-shaped mark with the same house date", () => {
    const marriage: LifeMark = { year: 1855, approx: false, text: "1855-09-24" };
    expect(formatLifeMark(marriage)).toBe("24 de septiembre de 1855");
  });

  it("never puts a place into the formatted date string", () => {
    expect(
      formatLifeMark({ year: 1915, approx: false, text: "Lucena, 1915" }),
    ).not.toContain("Lucena");
    expect(
      formatLifeMark({ year: 1961, approx: true, text: "~1961, Jaén" }),
    ).not.toContain("Jaén");
    expect(
      formatLifeMark({
        year: 1874,
        approx: false,
        text: "baut. 1874-10-12, San Pedro, Vitoria",
      }),
    ).not.toMatch(/San Pedro|Vitoria/);
  });
});

describe("formatOptionalLifeMark", () => {
  it("returns null when the mark is missing", () => {
    expect(formatOptionalLifeMark(undefined)).toBeNull();
    expect(formatOptionalLifeMark(null)).toBeNull();
  });

  it("formats a present mark the same way as formatLifeMark", () => {
    const mark: LifeMark = { year: 1915, approx: false, text: "Lucena, 1915" };
    expect(formatOptionalLifeMark(mark)).toBe(formatLifeMark(mark));
  });
});
