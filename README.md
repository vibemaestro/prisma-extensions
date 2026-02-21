<p align="center">
<a href="https://vibemaestro.io.vn/" target="blank"><img src="logo.svg" width="120" alt="Vibemaestro Logo" /></a>
</p>
<h1 align="center">Vibemaestro Prisma Extensions</h1>

<p align="center">
  Prisma client extensions for Vibemaestro projects.
  <p align="center">
    <a href="https://www.npmjs.com/package/@vibemaestro/prisma-extensions" target="_blank"><img alt="npm version" src="https://img.shields.io/npm/v/@vibemaestro/prisma-extensions" /></a>
    <a href="https://www.npmjs.com/package/@vibemaestro/prisma-extensions" target="_blank"><img alt="NPM" src="https://img.shields.io/npm/l/@vibemaestro/prisma-extensions" /></a>
    <a href="https://www.npmjs.com/package/@vibemaestro/prisma-extensions" target="_blank"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@vibemaestro/prisma-extensions" /></a>
     <a href="https://coveralls.io/github/vibemaestro/prisma-extensions?branch=main" target="_blank"><img alt="coverage" src="https://coveralls.io/repos/github/vibemaestro/prisma-extensions/badge.svg?branch=main" /></a>
  </p>
</p>

## Table of Contents

- [Description](#description)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Page-number pagination](#page-number-pagination)
- [Cursor-based pagination](#cursor-based-pagination)
- [Dynamic query](#dynamic-query)
- [Extension options](#extension-options)
- [API summary](#api-summary)
- [Scripts](#scripts)
- [License](#license)

## Description

Prisma Client extension that adds **page-number** and **cursor-based** pagination to all models, with optional dynamic query support (filter, sort, select).

## Requirements

- **Node.js** ≥ 22
- **Prisma** 7.x
- Your Prisma Client must be generated with the same schema (or compatible) so that the extension’s `Prisma` types resolve (e.g. via `generated/prisma/client` or your output path).

## Installation

```bash
pnpm add @vibemaestro/prisma-extensions
# or
npm install @vibemaestro/prisma-extensions
```

## Quick start

Extend your Prisma Client with the paging extension, then call `paginate()` on any model and chain `.withPages()` or `.withCursor()`.

```ts
import { PrismaClient } from "./generated/prisma/client"; // or your client path
import { pagingExtension } from "@vibemaestro/prisma-extensions";

const prisma = new PrismaClient().$extends(pagingExtension());

// Page-number pagination
const [users, meta] = await prisma.user
  .paginate()
  .withPages({ current: 1, pageSize: 10 });

// Cursor-based pagination
const [users, cursorMeta] = await prisma.user
  .paginate()
  .withCursor({ pageSize: 10, after: "42" });
```

## Page-number pagination

Use when you need page index and total count (e.g. “page 2 of 5”).

```ts
const [data, meta] = await prisma.user.paginate().withPages({
  current: 2,      // 1-based page (default: 1)
  pageSize: 10,    // items per page
});

// meta: IPagingMeta
// - current, pageSize, total, pageCount
// - isFirstPage, isLastPage, previousPage, nextPage
```

You can pass **Prisma findMany args** to `paginate()` (e.g. `where`, `orderBy`, `select`, `include`). Paging options go in `.withPages()`.

```ts
const [data, meta] = await prisma.user
  .paginate({
    where: { name: { not: null } },
    orderBy: { createdAt: "desc" },
  })
  .withPages({ current: 1, pageSize: 20 });
```

## Cursor-based pagination

Use for infinite scroll or when you prefer opaque cursors over page numbers.

```ts
const [data, meta] = await prisma.user.paginate().withCursor({
  pageSize: 10,
  after: meta.endCursor,  // next page
});

// meta: IPagingMeta
// - hasNextPage, hasPreviousPage
// - startCursor, endCursor
// - pageSize
```

- **`after`**: cursor of the last item from the previous page (exclusive).
- **`before`**: cursor of the first item of the next page (exclusive); use for “previous page”.
- You must provide a stable **`orderBy`** (e.g. in `paginate({ orderBy: { id: "asc" } })`) for consistent cursor.

Default cursor is **`id`** (number or string). For composite keys or custom fields, use `getCursor` and `parseCursor`.

### Custom cursor (e.g. composite key)

```ts
const [data, meta] = await prisma.postOnUser
  .paginate({
    select: { postId: true, userId: true },
  })
  .withCursor({
    pageSize: 10,
    after: "1:2",
    getCursor({ postId, userId }) {
      return [postId, userId].join(":");
    },
    parseCursor(cursor) {
      const [postId, userId] = cursor.split(":").map(Number);
      return { userId_postId: { postId, userId } };
    },
  });
```

## Dynamic query

Options for `.withPages()` and `.withCursor()` extend **`IPagingParam`**, so you can pass client-driven filter, sort, and select from the same options object:

| Option    | Type   | Description                                                                 |
| --------- | ------ | --------------------------------------------------------------------------- |
| `filter`  | string \| object | Prisma-style `where` (e.g. `'{"isActive": true}'` or `{ name: { contains: "x" } }`) |
| `sort`    | string | Comma-separated `field.direction` (e.g. `"createdAt.desc,name.asc"`)        |
| `select`  | string | Comma-separated fields (e.g. `"id,name,email"`)                             |
| `current` | number | Page number (1-based), for `.withPages()` only                              |
| `pageSize`| number \| null | Items per page; `null` means “return all” (page-number only)        |

Example:

```ts
const [data, meta] = await prisma.user
  .paginate({ where: { role: "user" } })
  .withPages({
    current: 1,
    pageSize: 10,
    filter: '{"name": { "contains": "alice" }}',
    sort: "createdAt.desc",
    select: "id,name,email",
  });
```

Parsed `filter` / `sort` / `select` are merged with the args you pass to `paginate()`; options in `paginate()` (e.g. `where`, `orderBy`) act as the base.

## Extension options

You can set default paging when creating the extension:

```ts
const prisma = new PrismaClient().$extends(
  pagingExtension({
    pages: {
      pageSize: 20,  // default for .withPages()
    },
    cursor: {
      pageSize: 20,  // default for .withCursor()
      getCursor: (row) => String((row as { id: number }).id),
      parseCursor: (cursor) => ({ id: Number(cursor) }),
    },
  })
);

// Then .withPages() / .withCursor() can omit pageSize when default is set
const [data, meta] = await prisma.user.paginate().withPages({ current: 2 });
```

## API summary

- **`pagingExtension(options?)`**  
  Returns a Prisma extension that adds `paginate(args?)` to every model.

- **`model.paginate(args?)`**  
  Accepts Prisma findMany-style args (without `skip`/`take`/`cursor`). Returns a chain with:
  - **`.withPages(options?)`** → `Promise<[data, meta]>` (page-number).
  - **`.withCursor(options?)`** → `Promise<[data, meta]>` (cursor).

- **`IPagingMeta`** (unified meta for both styles):
  - Page-number: `current`, `pageSize`, `total`, `pageCount`, `isFirstPage`, `isLastPage`, `previousPage`, `nextPage`.
  - Cursor: `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`, `pageSize`.

- **`createPaginator(options?)`**  
  Lower-level factory if you need a custom extension shape; most apps use `pagingExtension()`.

- **`PAGE_SIZE`**  
  Default page size constant (`20`).

## Scripts

```bash
pnpm build        # build dist + types
pnpm prisma:setup # generate client + migrate + db push
pnpm test         # run tests (Vitest)
```

## License

MIT
