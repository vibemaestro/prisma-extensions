import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "generated/prisma/client";
import { pagingExtension } from "../../src";


const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/test.db' })

export const prismaRaw = new PrismaClient({ adapter })
export const prisma = new PrismaClient({ adapter }).$extends(pagingExtension())