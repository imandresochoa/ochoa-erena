import familyJson from "./family.json";
import { parseFamily } from "@/domain/parse";
import { DEFAULT_FOCUS_NAME, type FamilyContext, type FamilyGraph } from "@/domain/types";
import { findExactName } from "@/domain/search";

export const family: FamilyGraph & { contexts: FamilyContext[] } =
  parseFamily(familyJson);

export const defaultPerson = findExactName(family.people, DEFAULT_FOCUS_NAME);

if (!defaultPerson) {
  throw new Error("Default focus person is missing from the family snapshot");
}
