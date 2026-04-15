import 'dotenv/config'
import { PrismaClient } from '../prisma/generated/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env
  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const port = DB_PORT || '5432'
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`
  }
  throw new Error('DB 연결 설정이 없습니다. DATABASE_URL 또는 DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD를 설정하세요.')
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({ connectionString: buildDatabaseUrl() })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
