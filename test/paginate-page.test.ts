import type { IPagingMeta } from "../src/paging";
import { describe, expect, it } from "vitest";

import { pagingExtension } from "../src/paging";
import { POSTS_COUNT, USERS_PER_PAGE } from "./helpers/consts";
import { prisma, prismaRaw } from "./helpers/prisma";

describe("paginate with pages", () => {
  it("accepts default options", async () => {
    const current = 5;
    const pageSize = USERS_PER_PAGE;

    const prismaX = prismaRaw.$extends(
      pagingExtension({
        pages: { pageSize },
      })
    );

    const [results, meta] = await prismaX.user.paginate().withPages({
      current,
    });

    const expectedResults = await prisma.user.findMany({
      take: -pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    const expectedMeta: IPagingMeta = {
      current: 5,
      isFirstPage: false,
      isLastPage: true,
      previousPage: 4,
      nextPage: null,
      pageCount: 5,
      total: 20,
      pageSize,
    };

    expect(meta).toStrictEqual(expectedMeta);
  });

  it("load first page", async () => {
    const pageSize = USERS_PER_PAGE;
    const [results, meta] = await prisma.user.paginate().withPages({
      pageSize,
    });

    const expectedResults = await prisma.user.findMany({
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);
    expect(meta).toStrictEqual({
      current: 1,
      isFirstPage: true,
      isLastPage: false,
      previousPage: null,
      nextPage: 2,
      pageCount: 5,
      total: 20,
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load second page", async () => {
    const current = 2;
    const pageSize = USERS_PER_PAGE;

    const [results, meta] = await prisma.user.paginate().withPages({
      current,
      pageSize,
    });

    const expectedResults = await prisma.user.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);
    expect(meta).toStrictEqual({
      current: 2,
      isFirstPage: false,
      isLastPage: false,
      previousPage: 1,
      nextPage: 3,
      pageCount: 5,
      total: 20,
      pageSize,
    } satisfies IPagingMeta);
  });

  it("load last page", async () => {
    const current = 5;
    const pageSize = USERS_PER_PAGE;

    const query = prisma.user.paginate();

    const [results, meta] = await query.withPages({
      current,
      pageSize,
    });

    const expectedResults = await prisma.user.findMany({
      take: -pageSize,
    });

    expect(results).toStrictEqual(expectedResults);

    const expectedMeta: IPagingMeta = {
      current: 5,
      isFirstPage: false,
      isLastPage: true,
      previousPage: 4,
      nextPage: null,
      pageCount: 5,
      total: 20,
      pageSize,
    };

    expect(meta).toStrictEqual(expectedMeta);
  });

  it("calculate page count with where condition", async () => {
    const [results, meta] = await prisma.post
      .paginate({
        where: {
          title: "Untitled",
        },
      })
      .withPages({
        pageSize: 2,
        current: 2,
      });

    expect(results.length).toBe(2);
    expect(meta).toStrictEqual({
      current: 2,
      isFirstPage: false,
      isLastPage: false,
      previousPage: 1,
      nextPage: 3,
      pageCount: POSTS_COUNT / 2 / 2,
      total: 20,
      pageSize: 2,
    } satisfies IPagingMeta);
  });

  it("throw error if options are invalid", async () => {
    await expect(
      prisma.user.paginate().withPages({
        pageSize: 0,
      })
    ).rejects.toThrow(Error);

    await expect(
      prisma.user.paginate().withPages({
        pageSize: 1,
        current: -1,
      })
    ).rejects.toThrow(Error);
  });

  it("limit: null should return all results", async () => {
    const [results, meta] = await prisma.user.paginate().withPages({
      pageSize: null,
    });

    const expectedResults = await prisma.user.findMany();

    expect(results).toStrictEqual(expectedResults);
    expect(meta).toStrictEqual({
      current: 1,
      isFirstPage: true,
      isLastPage: true,
      previousPage: null,
      nextPage: null,
      pageCount: 1,
      total: 20,
      pageSize: null,
    } satisfies IPagingMeta);
  });

  it("regression: `current: undefined` should be the same as `current: 1`", async () => {
    function getResults(current?: number) {
      return prisma.user.paginate().withPages({
        pageSize: null,
        current,
      });
    }

    expect(await getResults()).toStrictEqual(await getResults(1));
  });

  it("using omit in query should not cause error", async () => {
    const pageSize = USERS_PER_PAGE;
    const [results, meta] = await prisma.user
      .paginate({
        omit: {
          name: true,
        },
      })
      .withPages({
        pageSize,
      });

    const expectedResults = await prisma.user.findMany({
      omit: {
        name: true,
      },
      take: pageSize,
    });

    expect(results).toStrictEqual(expectedResults);
    expect(meta).toStrictEqual({
      current: 1,
      isFirstPage: true,
      isLastPage: false,
      previousPage: null,
      nextPage: 2,
      pageCount: 5,
      total: 20,
      pageSize,
    } satisfies IPagingMeta);
  });
});

describe("Dynamic query (filter, sort, select) with pages", () => {
  it("filter as JSON string applies where condition", async () => {
    const [results, meta] = await prisma.post
      .paginate()
      .withPages({
        pageSize: 5,
        current: 1,
        filter: '{"title": "Untitled"}',
      });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      take: 5,
    });

    expect(results).toStrictEqual(expected);
    expect(results.every((p) => p.title === "Untitled")).toBe(true);
    expect(meta.total).toBe(POSTS_COUNT / 2);
  });

  it("filter as object applies where condition", async () => {
    const [results] = await prisma.post.paginate().withPages({
      pageSize: 3,
      current: 1,
      filter: { title: "Untitled" },
    });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
  });

  it("sort string applies orderBy (asc)", async () => {
    const [results] = await prisma.user.paginate().withPages({
      pageSize: 3,
      current: 1,
      sort: "id.asc",
    });

    const expected = await prisma.user.findMany({
      orderBy: { id: "asc" },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
    expect(results.map((u) => u.id)).toEqual(expected.map((u) => u.id));
    if (results.length >= 2) {
      expect(results[0].id).toBeLessThanOrEqual(results[1].id);
    }
  });

  it("sort string applies orderBy (desc)", async () => {
    const [results] = await prisma.user.paginate().withPages({
      pageSize: 3,
      current: 1,
      sort: "id.desc",
    });

    const expected = await prisma.user.findMany({
      orderBy: { id: "desc" },
      take: 3,
    });

    expect(results).toStrictEqual(expected);
    expect(results.map((u) => u.id)).toEqual(expected.map((u) => u.id));
    if (results.length >= 2) {
      expect(results[0].id).toBeGreaterThanOrEqual(results[1].id);
    }
  });

  it("sort with multiple fields", async () => {
    const [results] = await prisma.post.paginate().withPages({
      pageSize: 4,
      current: 1,
      sort: "title.asc,id.desc",
    });

    const expected = await prisma.post.findMany({
      orderBy: [{ title: "asc" }, { id: "desc" }],
      take: 4,
    });

    expect(results).toStrictEqual(expected);
  });

  it("select string returns only requested fields", async () => {
    const [results] = await prisma.user.paginate().withPages({
      pageSize: 2,
      current: 1,
      select: "id",
    });

    expect(results).toHaveLength(2);
    expect(results.every((u) => Object.keys(u).sort().join(",") === "id")).toBe(true);
    const expected = await prisma.user.findMany({
      select: { id: true },
      take: 2,
    });
    expect(results).toStrictEqual(expected);
  });

  it("select multiple fields", async () => {
    const [results] = await prisma.user.paginate().withPages({
      pageSize: 2,
      select: "id,name",
    });

    expect(results.every((u) => Object.keys(u).sort().join(",") === "id,name")).toBe(true);
    const expected = await prisma.user.findMany({
      select: { id: true, name: true },
      take: 2,
    });
    expect(results).toStrictEqual(expected);
  });

  it("filter + sort + select combined", async () => {
    const [results, meta] = await prisma.post
      .paginate()
      .withPages({
        pageSize: 2,
        current: 2,
        filter: '{"title": "Untitled"}',
        sort: "id.asc",
        select: "id,title",
      });

    const expected = await prisma.post.findMany({
      where: { title: "Untitled" },
      orderBy: { id: "asc" },
      select: { id: true, title: true },
      skip: 2,
      take: 2,
    });

    expect(results).toStrictEqual(expected);
    expect(results.every((p) => p.title === "Untitled")).toBe(true);
    expect(Object.keys(results[0]).sort()).toEqual(["id", "title"]);
    expect(meta.total).toBe(POSTS_COUNT / 2);
  });

  it("dynamic filter merges with paginate() where", async () => {
    const [results] = await prisma.post
      .paginate({
        where: { id: { gte: 1 } },
      })
      .withPages({
        pageSize: 2,
        filter: '{"title": "Untitled"}',
      });

    const expected = await prisma.post.findMany({
      where: {
        id: { gte: 1 },
        title: "Untitled",
      },
      take: 2,
    });

    expect(results).toStrictEqual(expected);
  });
});
