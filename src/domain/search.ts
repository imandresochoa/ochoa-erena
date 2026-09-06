export function foldAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type Named = {
  displayName: string;
  searchKey: string;
};

export function suggestPeople<T extends Named>(
  people: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const needle = foldAccents(query);
  if (!needle) {
    return [];
  }
  return people
    .filter((person) => person.searchKey.includes(needle))
    .slice(0, limit);
}

export function findExactName<T extends Named>(
  people: readonly T[],
  query: string,
): T | undefined {
  const needle = foldAccents(query);
  if (!needle) {
    return undefined;
  }
  return people.find((person) => person.searchKey === needle);
}
