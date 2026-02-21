import type { IPagingMeta } from "../src/paging";
import { describe, expect, it } from "vitest";

import { pagingExtension } from "../src/paging";
import { USERS_PER_PAGE } from "./helpers/consts";
import { prisma, prismaRaw } from "./helpers/prisma";

describe("paginate with cursor", () => {
  it("accepts default options", async () => {
    const pageSize = USERS_PER_PAGE;

    const prismaX = prismaRaw.$extends(
      pagingExtension({
        cursor: { pageSize },
      })
    );

    const [results, meta] = await prismaX.user.paginate().withCursor();

    const expectedResults = await prismaX.user.findMany({
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: false,
      hasNextPage: true,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("override default options", async () => {
    const pageSize = USERS_PER_PAGE;

    const prismaX = prismaRaw.$extends(
      pagingExtension({
        cursor: { pageSize: pageSize * 2 },
      })
    );

    const [results, meta] = await prismaX.user.paginate().withCursor({
      pageSize,
    });

    const expectedResults = await prismaX.user.findMany({
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: false,
      hasNextPage: true,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load first page", async () => {
    const pageSize = USERS_PER_PAGE;
    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize,
    });

    const expectedResults = await prisma.user.findMany({
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: false,
      hasNextPage: true,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load next page", async () => {
    const pageSize = USERS_PER_PAGE;

    const { id: cursor } = await prisma.user.findFirstOrThrow({
      skip: pageSize - 1,
    });

    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize,
      after: cursor.toString(),
    });

    const expectedResults = await prisma.user.findMany({
      skip: pageSize,
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: true,
      hasNextPage: true,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load previous page", async () => {
    const pageSize = USERS_PER_PAGE;

    const { id: cursor } = await prisma.user.findFirstOrThrow({
      skip: pageSize * 2,
    });

    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize,
      before: cursor.toString(),
    });

    const expectedResults = await prisma.user.findMany({
      skip: pageSize,
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: true,
      hasNextPage: true,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load last page", async () => {
    const pageSize = USERS_PER_PAGE;

    const { id: cursor } = await prisma.user.findFirstOrThrow({
      skip: 1,
      take: -1,
    });

    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize,
      after: cursor.toString(),
    });

    const expectedResults = await prisma.user.findMany({
      take: -1,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: true,
      hasNextPage: false,
      startCursor: expectedResults[0].id.toString(),
      endCursor: expectedResults[expectedResults.length - 1].id.toString(),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load next to last page", async () => {
    const pageSize = USERS_PER_PAGE;

    const { id: cursor } = await prisma.user.findFirstOrThrow({
      take: -1,
    });

    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize,
      after: cursor.toString(),
    });

    expect(results).toStrictEqual([]);

    expect(meta).toStrictEqual({
      hasPreviousPage: true,
      hasNextPage: false,
      startCursor: null,
      endCursor: null,
      pageSize,
    } satisfies IPagingMeta);
  });

  it("custom cursor", async () => {
    const pageSize = USERS_PER_PAGE;
    const getCursor = (postId: number, userId: number) => [postId, userId].join(":");

    const { postId, userId } = await prisma.postOnUser.findFirstOrThrow({
      select: {
        postId: true,
        userId: true,
      },
      skip: 5,
    });

    const [results, meta] = await prisma.postOnUser
      .paginate({
        select: {
          postId: true,
          userId: true,
        },
      })
      .withCursor({
        pageSize,
        after: getCursor(postId, userId),
        getCursor({ postId, userId }) {
          return getCursor(postId, userId);
        },
        parseCursor(cursor) {
          const [postIdStr, userIdStr] = cursor.split(":");

          return {
            userId_postId: {
              postId: Number.parseInt(postIdStr),
              userId: Number.parseInt(userIdStr),
            },
          };
        },
      });

    const expectedResults = await prisma.postOnUser.findMany({
      select: {
        postId: true,
        userId: true,
      },
      skip: 6,
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: true,
      hasNextPage: true,
      startCursor: getCursor(
        expectedResults[0].postId,
        expectedResults[0].userId
      ),
      endCursor: getCursor(
        expectedResults[expectedResults.length - 1].postId,
        expectedResults[expectedResults.length - 1].userId
      ),
      pageSize,
    } satisfies IPagingMeta);
  });

  it("throw error if options are invalid", async () => {
    await expect(
      prisma.user.paginate().withCursor({
        pageSize: 0,
      })
    ).rejects.toThrow(Error);

    await expect(
      prisma.user.paginate().withCursor({
        pageSize: 1,
        after: "1",
        before: "1",
      })
    ).rejects.toThrow(Error);

    await expect(
      prisma.user.paginate().withCursor({
        pageSize: 1,
        after: "invalid",
      })
    ).rejects.toThrow(Error);

    await expect(
      prisma.postOnUser.paginate().withCursor({
        pageSize: 1,
      })
    ).rejects.toThrow("Default getCursor requires result to have an id field");
  });

  it("pageSize: null should return all results", async () => {
    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize: null,
    });

    const expectedResults = await prisma.user.findMany();

    expect(results).toStrictEqual(expectedResults);

    expect(meta).toStrictEqual({
      hasPreviousPage: false,
      hasNextPage: false,
      startCursor: expectedResults.at(0)!.id.toString(),
      endCursor: expectedResults.at(-1)!.id.toString(),
      pageSize: undefined,
    } satisfies IPagingMeta);
  });
});

describe("Dynamic query (filter, sort, select) with cursor", () => {
  it("filter as JSON string applies where condition", async () => {
    const [results, meta] = await prisma.post.paginate().withCursor({
      pageSize: 4,
      filter: '{"title": "Untitled"}',
      sort: "id.asc",
    });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      take: 4,
    });

    expect(results).toStrictEqual(expected);
    expect(results.every((p) => p.title === "Untitled")).toBe(true);
    expect(meta.startCursor).toBe(String(expected[0].id));
    expect(meta.endCursor).toBe(String(expected[expected.length - 1].id));
  });

  it("filter as object applies where condition", async () => {
    const [results] = await prisma.post.paginate().withCursor({
      pageSize: 3,
      filter: { title: "Untitled" },
      sort: "id.asc",
    });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
  });

  it("sort string applies orderBy for cursor", async () => {
    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize: 3,
      sort: "id.asc",
    });

    const expected = await prisma.user.findMany({
      orderBy: { id: "asc" },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
    expect(meta.startCursor).toBe(String(expected[0].id));
    expect(meta.endCursor).toBe(String(expected[expected.length - 1].id));
  });

  it("sort id.desc gives correct cursor order", async () => {
    const [results, meta] = await prisma.user.paginate().withCursor({
      pageSize: 2,
      sort: "id.desc",
    });

    const expected = await prisma.user.findMany({
      orderBy: { id: "desc" },
      take: 2,
    });

    expect(results).toStrictEqual(expected);
    expect(results[0].id).toBeGreaterThanOrEqual(results[1].id);
    expect(meta.startCursor).toBe(String(expected[0].id));
    expect(meta.endCursor).toBe(String(expected[expected.length - 1].id));
  });

  it("select string returns only requested fields", async () => {
    const [results] = await prisma.user.paginate().withCursor({
      pageSize: 2,
      select: "id",
      sort: "id.asc",
    });

    expect(results).toHaveLength(2);
    expect(results.every((u) => Object.keys(u).sort().join(",") === "id")).toBe(true);
    const expected = await prisma.user.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    expect(results).toStrictEqual(expected);
  });

  it("filter + sort + select combined", async () => {
    const [results, meta] = await prisma.post.paginate().withCursor({
      pageSize: 3,
      filter: '{"title": "Untitled"}',
      sort: "id.asc",
      select: "id,title",
    });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      select: { id: true, title: true },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
    expect(results.every((p) => p.title === "Untitled")).toBe(true);
    expect(Object.keys(results[0]).sort()).toEqual(["id", "title"]);
    expect(meta.endCursor).toBe(String(expected[2].id));
  });

  it("after cursor with dynamic filter and sort", async () => {
    const first = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      take: 2,
    });
    const cursor = first[1].id.toString();

    const [results, meta] = await prisma.post.paginate().withCursor({
      pageSize: 2,
      after: cursor,
      filter: '{"title": "Untitled"}',
      sort: "id.asc",
    });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      skip: 2,
      take: 2,
    });

    expect(results).toStrictEqual(expected);
    expect(meta.hasPreviousPage).toBe(true);
  });

  it("dynamic filter merges with paginate() where", async () => {
    const [results] = await prisma.post
      .paginate({
        where: { id: { lte: 30 } },
      })
      .withCursor({
        pageSize: 2,
        filter: '{"title": "Untitled"}',
        sort: "id.asc",
      });

    const expected = await prisma.post.findMany({
      where: {
        id: { lte: 30 },
        title: "Untitled",
      },
      orderBy: { id: "asc" },
      take: 2,
    });

    expect(results).toStrictEqual(expected);
  });
});
