import { defineConfig } from 'prisma/config'

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env
  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const port = DB_PORT || '5432'
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`
  }
  // prisma generate는 URL 없이 동작, prisma migrate deploy는 런타임에 연결 실패로 에러
  return 'postgresql://'
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: buildDatabaseUrl() },
})
