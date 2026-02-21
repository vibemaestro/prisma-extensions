import { Prisma } from "generated/prisma/client";
import type {
  CursorPaginationOptions,
  IPagingMeta,
  IPaginateChain,
  IPagingParam,
  PageNumberPaginationOptions,
  PrismaFindManyQuery,
  PrismaModel,
} from "./types";
import { parsePagingParam } from "./query-parser";
import { paginateWithCursor } from "./cursor";
import { paginateWithPages } from "./page-number";

export const PAGE_SIZE = 20;

/** Internal query shape for findMany (where, select, orderBy, include). */
type QueryShape = Record<string, unknown>;

/** Merged options for page-number: at least current + pageSize (matches PageNumberPaginationOptions). */
interface ResolvedPageOptions {
  current: number;
  pageSize: number | null;
}

/** Merged options for cursor: pageSize + getCursor + parseCursor (matches CursorPaginationOptions). */
interface ResolvedCursorOptions extends Pick<CursorPaginationOptions, "after" | "before"> {
  pageSize: number | null;
  getCursor: (result: unknown) => string;
  parseCursor: (cursor: string) => Record<string, unknown>;
}

/**
 * Builds shared Prisma findMany query from client param (filter, select, sort) + Prisma baseArgs (where, orderBy, select, include).
 * Uses QueryShape internally to avoid Prisma.Exact union typing issues.
 */
function buildQuery(param: IPagingParam | undefined, baseArgs: QueryShape): QueryShape {
  const parsed = parsePagingParam(param);
  const baseWhere = (baseArgs.where ?? {}) as Record<string, unknown>;
  const useSelect = parsed.select ?? baseArgs.select;
  const query: QueryShape = {
    ...baseArgs,
    where: Object.keys(baseWhere).length > 0 || parsed.where ? { ...baseWhere, ...(parsed.where ?? {}) } : undefined,
    select: useSelect ?? undefined,
    orderBy: parsed.orderBy ?? baseArgs.orderBy,
  };
  if (query.where != null && Object.keys(query.where as object).length === 0) {
    delete query.where;
  }
  if (query.select == null) {
    delete query.select;
  }
  if (query.orderBy == null) {
    delete query.orderBy;
  }
  if (query.select != null && "include" in query) {
    delete query.include;
  }
  return query;
}

function validatePage(value: number): void {
  if (typeof value !== "number" || value < 1 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error("Invalid page value");
  }
}

function validateLimit(value: number | null): void {
  if (value !== null && typeof value !== "number") {
    throw new Error("Missing limit value");
  }
  if (value !== null && (value < 1 || value > Number.MAX_SAFE_INTEGER)) {
    throw new Error("Invalid limit value");
  }
}

function defaultGetCursor(row: unknown): string {
  const r = row as Record<string, unknown>;
  if (typeof r?.id === "number") return String(r.id);
  if (typeof r?.id === "string") return r.id;
  throw new TypeError("Default getCursor requires result to have an id field.");
}

function defaultParseCursor(cursor: string): { id: number } {
  const id = Number.parseInt(cursor, 10);
  if (Number.isNaN(id)) throw new TypeError("Unable to parse cursor.");
  return { id };
}

/** Global options for createPaginator / pagingExtension. */
export interface PagingExtensionOptions {
  pages?: {
    pageSize?: number;
  };
  cursor?: {
    pageSize?: number;
    getCursor?: (result: unknown) => string;
    parseCursor?: (cursor: string) => Record<string, unknown>;
  };
}

/**
 * Creates a paginator that returns { withPages, withCursor }; both return [data, meta] with meta as IPagingMeta.
 * Generics T and A are inferred when paginate is called on a model (this: T, args?: PrismaFindManyQuery<T, A>).
 */
export function createPaginator(
  globalOptions?: PagingExtensionOptions
): <T, A>(this: T, args?: PrismaFindManyQuery<T, A>) => IPaginateChain<T, A> {
  const defaultPages = globalOptions?.pages ?? {};
  const defaultCursor = globalOptions?.cursor ?? {};

  return function paginate<T, A>(this: T, args?: PrismaFindManyQuery<T, A>): IPaginateChain<T, A> {
    const model = Prisma.getExtensionContext(this) as unknown as PrismaModel;
    const baseArgs: QueryShape = (args ?? {}) as QueryShape;

    const chain: IPaginateChain<T, A> = {
      withPages: async (
        options: PageNumberPaginationOptions = {}
      ): Promise<[Prisma.Result<T, A, "findMany">, IPagingMeta]> => {
        const query = buildQuery(options, baseArgs);
        const merged = { ...defaultPages, ...options };
        const current = merged.current ?? 1;
        const pageSize = merged.pageSize ?? defaultPages.pageSize ?? null;

        validatePage(current);
        validateLimit(pageSize);

        const resolved: ResolvedPageOptions = {
          current,
          pageSize,
        };

        const [data, meta] = await paginateWithPages(model, query, resolved);
        return [data as Prisma.Result<T, A, "findMany">, meta];
      },

      withCursor: async (
        options: CursorPaginationOptions = {}
      ): Promise<[Prisma.Result<T, A, "findMany">, IPagingMeta]> => {
        const query = buildQuery(options, baseArgs);
        const merged = { ...defaultCursor, ...options };
        const pageSize = merged.pageSize ?? defaultCursor.pageSize ?? null;
        const getCursor = merged.getCursor ?? defaultGetCursor;
        const parseCursor = merged.parseCursor ?? defaultParseCursor;

        validateLimit(pageSize);

        if (typeof merged.after === "string" && typeof merged.before === "string") {
          throw new TypeError("Options after and before cannot be provided at the same time.");
        }

        const resolved: ResolvedCursorOptions = {
          ...merged,
          pageSize,
          getCursor,
          parseCursor,
        };

        const [data, meta] = await paginateWithCursor(model, query, resolved);
        return [data as Prisma.Result<T, A, "findMany">, meta];
      },
    };

    return chain;
  };
}

export const paginate = createPaginator();

/**
 * Prisma Client extension: adds `paginate(args?)` to every model.
 * args = Prisma findMany args (where, orderBy, select, include). Paging/filter from client is passed to .withPages(options) / .withCursor(options).
 * Returns chain with .withPages(options) and .withCursor(options); both return [data, meta] with meta as IPagingMeta.
 *
 * @example
 * const prisma = new PrismaClient().$extends(pagingExtension());
 *
 * // Page-number (options extend IPagingParam: filter, sort, select, current, pageSize)
 * const [data, meta] = await prisma.apiKey
 *   .paginate({ where: { name: { not: null } } })
 *   .withPages({ current: 2, pageSize: 10, filter: '{"isActive": true}', sort: 'createdAt.desc' });
 *
 * // Cursor-based
 * const [data, meta] = await prisma.apiKey
 *   .paginate({ orderBy: { id: 'asc' } })
 *   .withCursor({ pageSize: 10, after: '123' });
 */
export function pagingExtension(options?: PagingExtensionOptions) {
  const paginateFn = createPaginator(options);
  return Prisma.defineExtension({
    name: "vibemaestro-paging",
    model: {
      $allModels: {
        paginate: paginateFn,
      },
    },
  });
}
