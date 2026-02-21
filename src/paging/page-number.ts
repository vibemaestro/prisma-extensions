import type { IPagingMeta, PageNumberPaginationOptions, PrismaModel } from "./types";

const resetSelection = { select: undefined, include: undefined, omit: undefined };
const resetOrdering = { orderBy: undefined };

/**
 * Page-number pagination: returns [results, meta] with meta implementing IPagingMeta
 * (total, current, pageCount, pageSize, isFirstPage, isLastPage, previousPage, nextPage).
 */
export async function paginateWithPages<TResult, TCursor extends Record<string, unknown>>(
  model: PrismaModel,
  query: TCursor,
  options: PageNumberPaginationOptions
): Promise<[TResult[], IPagingMeta]> {
  const { current, pageSize } = options;
  const previousPage = current > 1 ? current - 1 : null;
  const [rows, count] = await Promise.all([
    model.findMany({
      ...query,
      skip: (current - 1) * (pageSize ?? 0),
      take: pageSize === null ? undefined : pageSize,
    }),
    model.count({
      ...query,
      ...resetSelection,
      ...resetOrdering,
    }),
  ]);
  const results = rows as TResult[];
  const totalCount = count;
  const pageCount = pageSize === null ? 1 : Math.ceil(totalCount / pageSize);
  const nextPage = current < pageCount ? current + 1 : null;
  const meta: IPagingMeta = {
    isFirstPage: previousPage === null,
    isLastPage: nextPage === null,
    current,
    previousPage,
    nextPage,
    pageSize,
  };
  if (pageCount !== null && totalCount !== null) {
    meta.total = totalCount;
    meta.pageCount = pageCount;
  }
  return [results, meta];
}
