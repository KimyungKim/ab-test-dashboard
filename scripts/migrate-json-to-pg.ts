/**
 * Wave 4: Data Migration Script
 * JSON files → PostgreSQL (via Prisma)
 *
 * Source files:
 *   config/abtest-manual.json         → AbtestManualAnnouncement, AbtestManualAnalysisItem, AbtestManualOutcome
 *   data/abtest-conclusions.json      → AbtestConclusion
 *   config/abtest-product-config.json → AbtestProductConfig
 *   data/analysis-cache/*.json        → AbtestAnalysisCache
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx ts-node --esm scripts/migrate-json-to-pg.ts [--dry-run]
 *
 *   Or from project root:
 *   pnpm --filter @ab-test-dashboard/api exec ts-node ../scripts/migrate-json-to-pg.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..') // AB Test Dashboard root

const isDryRun = process.argv.includes('--dry-run')

const prisma = new PrismaClient({
  log: isDryRun ? [] : ['warn', 'error'],
})

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// ── 1. abtest-manual.json ─────────────────────────────────────────────────────

interface ManualItem {
  id: string
  slackUrl?: string
  url?: string
  text: string
  channelName?: string
  permalink?: string
  images?: string[]
  imageUrls?: string[]
}

interface ManualRecord {
  announcement: ManualItem | null
  analysisItems: ManualItem[]
  outcome: ManualItem | null
}

type ManualStore = Record<string, ManualRecord>

async function migrateManual() {
  const filePath = path.join(ROOT, 'config', 'abtest-manual.json')
  const data = await readJson<ManualStore>(filePath)
  if (!data) {
    console.log('  [manual] 파일 없음, 스킵')
    return
  }

  const keys = Object.keys(data)
  console.log(`  [manual] ${keys.length}개 테스트 키 발견`)

  for (const testKey of keys) {
    const record = data[testKey]
    if (!record) continue

    // Announcement
    if (record.announcement) {
      const item = record.announcement
      const url = item.slackUrl || item.url || item.permalink || ''
      const imageUrls = item.imageUrls || item.images || []
      if (!isDryRun) {
        await prisma.abtestManualAnnouncement.upsert({
          where: { testKey },
          create: { id: item.id, testKey, url, text: item.text, imageUrls },
          update: { url, text: item.text, imageUrls },
        })
      }
      console.log(`    announcement [${testKey}]: "${item.text.slice(0, 40)}..."`)
    }

    // AnalysisItems
    for (let i = 0; i < record.analysisItems.length; i++) {
      const item = record.analysisItems[i]
      const url = item.slackUrl || item.url || item.permalink || ''
      const imageUrls = item.imageUrls || item.images || []
      if (!isDryRun) {
        await prisma.abtestManualAnalysisItem.upsert({
          where: { id: item.id },
          create: { id: item.id, testKey, url, text: item.text, imageUrls, sortOrder: i },
          update: { url, text: item.text, imageUrls, sortOrder: i },
        })
      }
      console.log(`    analysisItem [${testKey}][${i}]: "${item.text.slice(0, 40)}..."`)
    }

    // Outcome
    if (record.outcome) {
      const item = record.outcome
      const url = item.slackUrl || item.url || item.permalink || ''
      const imageUrls = item.imageUrls || item.images || []
      if (!isDryRun) {
        await prisma.abtestManualOutcome.upsert({
          where: { testKey },
          create: { id: item.id, testKey, url, text: item.text, imageUrls },
          update: { url, text: item.text, imageUrls },
        })
      }
      console.log(`    outcome [${testKey}]: "${item.text.slice(0, 40)}..."`)
    }
  }
}

// ── 2. abtest-conclusions.json ────────────────────────────────────────────────

type ConclusionStore = Record<string, string>

async function migrateConclusions() {
  const filePath = path.join(ROOT, 'data', 'abtest-conclusions.json')
  const data = await readJson<ConclusionStore>(filePath)
  if (!data) {
    console.log('  [conclusions] 파일 없음, 스킵')
    return
  }

  const entries = Object.entries(data)
  console.log(`  [conclusions] ${entries.length}개 항목 발견`)

  for (const [primaryId, conclusion] of entries) {
    if (!conclusion) continue
    if (!isDryRun) {
      await prisma.abtestConclusion.upsert({
        where: { primaryId },
        create: { primaryId, conclusion },
        update: { conclusion },
      })
    }
    console.log(`    [${primaryId}] → ${conclusion}`)
  }
}

// ── 3. abtest-product-config.json ─────────────────────────────────────────────

interface ProductConfigRecord {
  productTypes: string[]
}

type ProductConfigStore = Record<string, ProductConfigRecord>

async function migrateProductConfig() {
  const filePath = path.join(ROOT, 'config', 'abtest-product-config.json')
  const data = await readJson<ProductConfigStore>(filePath)
  if (!data) {
    console.log('  [product-config] 파일 없음, 스킵')
    return
  }

  const entries = Object.entries(data)
  console.log(`  [product-config] ${entries.length}개 항목 발견`)

  for (const [testKey, config] of entries) {
    const productTypes = Array.isArray(config?.productTypes) ? config.productTypes : []
    if (!isDryRun) {
      await prisma.abtestProductConfig.upsert({
        where: { testKey },
        create: { testKey, productTypes },
        update: { productTypes },
      })
    }
    console.log(`    [${testKey}] → [${productTypes.join(', ')}]`)
  }
}

// ── 4. analysis-cache/*.json ──────────────────────────────────────────────────

async function migrateAnalysisCache() {
  const cacheDir = path.join(ROOT, 'data', 'analysis-cache')
  let files: string[]
  try {
    files = await readdir(cacheDir)
  } catch {
    console.log('  [analysis-cache] 디렉토리 없음, 스킵')
    return
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'))
  console.log(`  [analysis-cache] ${jsonFiles.length}개 파일 발견`)

  for (const file of jsonFiles) {
    const cacheKey = file.replace('.json', '')
    const filePath = path.join(cacheDir, file)
    const data = await readJson<Record<string, unknown>>(filePath)
    if (!data) continue

    // Validate: must have dailyPreRevRows
    if (!Array.isArray(data.dailyPreRevRows)) {
      console.log(`    [cache] ${cacheKey}: dailyPreRevRows 없음, 스킵`)
      continue
    }

    if (!isDryRun) {
      await prisma.abtestAnalysisCache.upsert({
        where: { cacheKey },
        create: { cacheKey, data: data as object },
        update: { data: data as object },
      })
    }
    console.log(`    [cache] ${cacheKey}: OK`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== AB Test Dashboard 데이터 마이그레이션 ===`)
  console.log(`모드: ${isDryRun ? 'DRY RUN (DB 변경 없음)' : '실제 실행'}`)
  console.log(`소스 루트: ${ROOT}`)
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
  console.log()

  if (!isDryRun && !process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL 환경변수가 필요합니다.')
    process.exit(1)
  }

  console.log('[1/4] Manual 데이터 마이그레이션...')
  await migrateManual()

  console.log('[2/4] Conclusions 마이그레이션...')
  await migrateConclusions()

  console.log('[3/4] Product Config 마이그레이션...')
  await migrateProductConfig()

  console.log('[4/4] Analysis Cache 마이그레이션...')
  await migrateAnalysisCache()

  console.log('\n마이그레이션 완료!')
  if (isDryRun) {
    console.log('(DRY RUN — DB에 저장된 내용 없음. --dry-run 제거 후 재실행하세요.)')
  }
}

main()
  .catch(err => {
    console.error('마이그레이션 실패:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
