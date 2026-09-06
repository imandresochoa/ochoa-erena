import type { LifeMark } from "./types";

export type HouseDateParts = {
  day?: number;
  month?: number; // 1–12
  year: number;
  approx?: boolean;
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const MONTH_NAME_RE = new RegExp(
  String.raw`(?:(\d{1,2})\s+de\s+)?\b(${MONTHS.join("|")})\b(?:\s+de)?(?:\s+(\d{4}))?`,
  "i",
);
const ISO_DAY_RE = /(\d{4})-(\d{2})-(\d{2})/;
const ISO_MONTH_RE = /(\d{4})-(\d{2})(?!-\d)/;
const BAUT_RE = /\bbaut\./i;
const TAG_RE = /\[[^\]]*\]/g;
const MUERTE_RE = /\bmuerte\b/gi;

export function formatHouseDate(parts: HouseDateParts): string {
  const monthName =
    typeof parts.month === "number" && parts.month >= 1 && parts.month <= 12
      ? MONTHS[parts.month - 1]
      : undefined;

  let formatted: string;
  if (typeof parts.day === "number" && monthName) {
    formatted = `${parts.day} de ${monthName} de ${parts.year}`;
  } else if (monthName) {
    formatted = `${monthName} de ${parts.year}`;
  } else {
    formatted = String(parts.year);
  }

  return parts.approx ? `~${formatted}` : formatted;
}

function cleanDateText(text: string): string {
  return text.replace(TAG_RE, " ").replace(MUERTE_RE, " ").replace(/\s+/g, " ").trim();
}

function partsFromText(text: string, fallbackYear: number): Omit<HouseDateParts, "approx"> {
  const isoDay = text.match(ISO_DAY_RE);
  if (isoDay) {
    return {
      year: Number(isoDay[1]),
      month: Number(isoDay[2]),
      day: Number(isoDay[3]),
    };
  }

  const isoMonth = text.match(ISO_MONTH_RE);
  if (isoMonth) {
    return {
      year: Number(isoMonth[1]),
      month: Number(isoMonth[2]),
    };
  }

  const spanish = text.match(MONTH_NAME_RE);
  if (spanish) {
    const month = MONTHS.findIndex((name) => name === spanish[2].toLowerCase()) + 1;
    const year = spanish[3] ? Number(spanish[3]) : fallbackYear;
    if (spanish[1]) {
      return { day: Number(spanish[1]), month, year };
    }
    return { month, year };
  }

  return { year: fallbackYear };
}

export function formatLifeMark(mark: LifeMark): string {
  const text = mark.text ?? "";
  const baptism = BAUT_RE.test(text);
  const approx = mark.approx || text.includes("~");
  const formatted = formatHouseDate({
    ...partsFromText(cleanDateText(text), mark.year),
    approx,
  });
  return baptism ? `baut. ${formatted}` : formatted;
}

export function formatOptionalLifeMark(mark?: LifeMark | null): string | null {
  return mark ? formatLifeMark(mark) : null;
}
