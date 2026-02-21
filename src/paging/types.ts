import { Prisma } from "generated/prisma/client";

/**
 * Paging request from client (API body): filter, sort, select, and page params.
 * Prisma native args (where, orderBy, select, include) are passed separately as baseArgs.
 */
export interface IPagingParam {
  /** JSON string or object for Prisma-style where (e.g. { "name": { "contains": "x" } }) */
  filter?: string | Record<string, unknown>;
  /** Items per page / limit, used with withPages. */
  pageSize?: number;
  /** Comma-separated field names to select (e.g. "id,name,email"). */
  select?: string;
  /** Sort: comma-separated "field.asc" or "field.desc" (e.g. "createdAt.desc,name.asc"). */
  sort?: string;
}

/**
 * Paging response shape: data + paging info (compatible with nest-common).
 */
export interface IPagingResponse<T> {
  data: T[];
  total: number;
  current: number;
  pageCount: number;
  pageSize: number;
}

/**
 * Unified meta for both page-number and cursor-based pagination.
 * Extends the paging fields of IPagingResponse (total, current, pageCount, pageSize);
 * page-number sets those + isFirstPage, isLastPage, previousPage, nextPage;
 * cursor sets hasNextPage, hasPreviousPage, startCursor, endCursor (and optionally pageSize).
 */
export interface IPagingMeta extends Partial<Omit<IPagingResponse<unknown>, "data">> {
  total?: number;
  current?: number;
  pageCount?: number;
  pageSize?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  previousPage?: number | null;
  nextPage?: number | null;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/**
 * Unified paging result: data + meta (both withPages and withCursor return this shape).
 */
export interface IPagingResult<T> {
  data: T[];
  meta: IPagingMeta;
}

/**
 * Parsed query shape passed to Prisma findMany/count.
 */
export interface ParsedPrismaQuery {
  where?: Record<string, unknown>;
  select?: Record<string, boolean>;
  orderBy?: Array<Record<string, "asc" | "desc">>;
}

/** Options for page-number pagination (withPages). */
export interface PageNumberPaginationOptions extends IPagingParam {
  /** Current page (1-based), used with withPages. */
  current?: number;
}

/** Get cursor string from a result row (e.g. (row) => String(row.id)). */
export type GetCursorFunction<T = unknown> = (result: T) => string;

/** Parse cursor string into Prisma cursor object (e.g. (cursor) => ({ id: Number(cursor) })). */
export type ParseCursorFunction<T = Record<string, unknown>> = (cursor: string) => T;

/** Options for cursor-based pagination (withCursor). */
export interface CursorPaginationOptions<TResult = unknown, TCursor = Record<string, unknown>> extends IPagingParam {
  after?: string;
  before?: string;
  getCursor?: GetCursorFunction<TResult>;
  parseCursor?: ParseCursorFunction<TCursor>;
}

/** Return type of model.paginate(): chain with .withPages() or .withCursor(). */
export interface IPaginateChain<T, A> {
  withPages(options?: PageNumberPaginationOptions): Promise<[Prisma.Result<T, A, "findMany">, IPagingMeta]>;
  withCursor(options?: CursorPaginationOptions): Promise<[Prisma.Result<T, A, "findMany">, IPagingMeta]>;
}

export type PrismaFindManyQuery<T, A> = Prisma.Exact<A, Omit<Prisma.Args<T, "findMany">, "cursor" | "take" | "skip">>;

export type PrismaModel = {
  [k in "findMany" | "count"]: CallableFunction;
};
