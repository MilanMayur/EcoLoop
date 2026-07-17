export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return { rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize), page: safePage, totalPages, total: rows.length };
}

export function includesSearch(values: Array<string | number>, search: string) {
  const query = search.trim().toLowerCase();
  return !query || values.some((value) => String(value).toLowerCase().includes(query));
}
