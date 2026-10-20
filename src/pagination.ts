import type { Page } from './types.js';

/**
 * Percorre todas as páginas a partir de `fetchPage`, seguindo `next_cursor`.
 * Para quando `next_cursor` vier vazio ou repetido.
 */
export async function* paginate<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  startCursor?: string,
): AsyncGenerator<T, void, undefined> {
  let cursor = startCursor;
  const seen = new Set<string>();
  for (;;) {
    const page = await fetchPage(cursor);
    for (const item of page.data ?? []) yield item;
    const next = page.next_cursor ?? undefined;
    if (!next || seen.has(next)) return;
    seen.add(next);
    cursor = next;
  }
}
