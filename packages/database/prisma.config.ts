import 'dotenv/config'
import { defineConfig } from 'prisma/config'

function buildDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env
  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const port = DB_PORT || '5432'
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`
  }
  return undefined
}

const url = buildDatabaseUrl()

export default defineConfig({
  schema: './prisma/schema.prisma',
  ...(url !== undefined ? { datasource: { url } } : {}),
})
