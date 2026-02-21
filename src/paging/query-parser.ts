import type { IPagingParam, ParsedPrismaQuery } from "./types";

const PRISMA_LOGICAL_KEYS: Record<string, string> = {
  and: "AND",
  or: "OR",
};

/**
 * Recursively maps logical keys (and/or) to Prisma's AND/OR in a where object.
 */
function mapLogicalKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const mappedKey = PRISMA_LOGICAL_KEYS[key] ?? key;
    const value = obj[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[mappedKey] = mapLogicalKeys(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[mappedKey] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? mapLogicalKeys(item as Record<string, unknown>)
          : item
      );
    } else {
      result[mappedKey] = value;
    }
  }
  return result;
}

/**
 * Parses filter from JSON string or object into Prisma-compatible where.
 */
function parseFilter(filter: string | Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (filter === undefined || filter === null) return undefined;
  const raw = typeof filter === "string" ? (JSON.parse(filter || "{}") as Record<string, unknown>) : filter;
  if (Object.keys(raw).length === 0) return undefined;
  return mapLogicalKeys(raw);
}

/**
 * Parses comma-separated select string into Prisma select object (e.g. "id,name" -> { id: true, name: true }).
 */
function parseSelect(select: string | undefined): Record<string, boolean> | undefined {
  if (!select || typeof select !== "string") return undefined;
  const fields = select
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fields.length === 0) return undefined;
  return Object.fromEntries(fields.map((f) => [f, true]));
}

/**
 * Parses sort string into Prisma orderBy (e.g. "createdAt.desc,name.asc" -> [{ createdAt: "desc" }, { name: "asc" }]).
 */
function parseSort(sort: string | undefined): Array<Record<string, "asc" | "desc">> | undefined {
  if (!sort || typeof sort !== "string") return undefined;
  const entries = sort
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return undefined;
  const orderBy: Array<Record<string, "asc" | "desc">> = [];
  for (const entry of entries) {
    const [field, dir] = entry.split(".");
    const direction = (dir?.toLowerCase() === "desc" ? "desc" : "asc") as "asc" | "desc";
    if (field) orderBy.push({ [field]: direction });
  }
  return orderBy.length > 0 ? orderBy : undefined;
}

/**
 * Builds ParsedPrismaQuery from IPagingParam (select, sort, filter).
 * Prisma native args (where, orderBy, select, include) are merged in buildQuery via baseArgs.
 */
export function parsePagingParam(param: IPagingParam | undefined): ParsedPrismaQuery {
  const parsed: ParsedPrismaQuery = {};
  const where = parseFilter(param?.filter);
  if (where && Object.keys(where).length > 0) parsed.where = where;
  const select = parseSelect(param?.select);
  if (select && Object.keys(select).length > 0) parsed.select = select;
  const orderBy = parseSort(param?.sort);
  if (orderBy && orderBy.length > 0) parsed.orderBy = orderBy;
  return parsed;
}
