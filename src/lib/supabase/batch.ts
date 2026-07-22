// Helpers for querying past two silent Supabase limits (verified 2026-07-17):
// 1. PostgREST max_rows=1000 truncates ANY response regardless of .range()
// 2. .in() lists over ~300 UUIDs push the request URL past Node fetch's 16KB
//    header limit and the query fails outright

// Batch size for chunked .in() queries (300 ok, 400 fails — keep headroom)
export const BATCH_SIZE = 200;
// PostgREST max_rows on this project
export const PAGE_ROWS = 1000;

// Split an array into fixed-size chunks. Defaults to BATCH_SIZE — the safe
// .in() id-list size — since that's what nearly every caller chunks for.
export function chunk<T>(arr: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Run an id-list query in BATCH_SIZE chunks, paging each chunk past max_rows.
// queryFn must apply .range(from, to) and a deterministic .order() to its query.
export async function batchQuery<T>(
  ids: string[],
  queryFn: (batchIds: string[], from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    for (let from = 0; ; from += PAGE_ROWS) {
      const { data, error } = await queryFn(batch, from, from + PAGE_ROWS - 1);
      if (error) {
        // Surface the failure — silently continuing here once shipped a page
        // full of zero counts that looked like a broken sort
        console.error("Batch query error:", error);
        throw error;
      }
      if (data) results.push(...data);
      if (!data || data.length < PAGE_ROWS) break;
    }
  }
  return results;
}

// Fetch all rows of a query by paging past the PostgREST max_rows cap.
// queryFn must apply .range(from, to) and a deterministic .order().
export async function fetchPaged<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any; count?: number | null }>,
  maxRows: number
): Promise<{ rows: T[]; count: number }> {
  const rows: T[] = [];
  let count = 0;
  for (let from = 0; from < maxRows; from += PAGE_ROWS) {
    const to = Math.min(from + PAGE_ROWS, maxRows) - 1;
    const { data, error, count: exactCount } = await queryFn(from, to);
    if (error) throw error;
    if (typeof exactCount === "number") count = exactCount;
    if (data) rows.push(...data);
    if (!data || data.length < to - from + 1) break;
  }
  return { rows, count };
}
