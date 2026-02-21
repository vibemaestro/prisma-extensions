import type { CursorPaginationOptions, IPagingMeta, PrismaModel } from "./types";

const resetSelection = { select: undefined, include: undefined, omit: undefined };

/**
 * Cursor-based pagination: returns [results, meta] with meta implementing IPagingMeta
 * (hasNextPage, hasPreviousPage, startCursor, endCursor, pageSize).
 */
export async function paginateWithCursor<TResult, TCursor extends Record<string, unknown>>(
  model: PrismaModel,
  query: TCursor,
  options: CursorPaginationOptions<TResult, TCursor>
): Promise<[TResult[], IPagingMeta]> {
  const { after, before, getCursor, parseCursor, pageSize } = options;
  let results: TResult[];
  let hasPreviousPage = false;
  let hasNextPage = false;
  const baseQuery = { ...query, ...resetSelection };
  const findMany = (args: Record<string, unknown>) => model.findMany(args) as Promise<TResult[]>;
  if (typeof before === "string") {
    const cursor = parseCursor(before) as TCursor;
    const [fetched, nextResult] = await Promise.all([
      findMany({
        ...query,
        cursor,
        skip: 1,
        take: pageSize === null ? undefined : -pageSize - 1,
      }),
      findMany({
        ...baseQuery,
        cursor,
        take: 1,
      }),
    ]);
    results = fetched;
    if (pageSize !== null && results.length > pageSize) {
      hasPreviousPage = Boolean(results.shift());
    }
    hasNextPage = Boolean(nextResult.length);
  } else if (typeof after === "string") {
    const cursor = parseCursor(after) as TCursor;
    const [fetched, previousResult] = await Promise.all([
      findMany({
        ...query,
        cursor,
        skip: 1,
        take: pageSize === null ? undefined : pageSize + 1,
      }),
      findMany({
        ...baseQuery,
        cursor,
        take: -1,
      }),
    ]);
    results = fetched;
    hasPreviousPage = Boolean(previousResult.length);
    if (pageSize !== null && results.length > pageSize) {
      hasNextPage = true;
      results.pop();
    }
  } else {
    results = await findMany({
      ...query,
      take: pageSize === null ? undefined : pageSize + 1,
    });
    hasPreviousPage = false;
    if (pageSize !== null && results.length > pageSize) {
      hasNextPage = true;
      results.pop();
    }
  }
  const startCursor = results.length > 0 ? getCursor(results[0] as TResult) : null;
  const endCursor = results.length > 0 ? getCursor(results[results.length - 1] as TResult) : null;
  const meta: IPagingMeta = {
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor,
    pageSize: pageSize ?? undefined,
  };
  return [results, meta];
}
