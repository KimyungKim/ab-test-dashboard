import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabricksService } from '../databricks/databricks.service';

const GAME_CODE_TO_SCHEMA: Record<string, string> = {
  cvs: 'slots1_db_prod',
  cbn: 'slots3_db_prod',
  jpm: 'slots4_db_prod',
};

const ABTEST_QUERY = `
SELECT id, start_timestamp, end_timestamp, setting, description
FROM ab_test
WHERE setting NOT LIKE '%"population_weight": [1]%'
  AND (
    lower(description) NOT LIKE '%not a/b%'
    AND lower(description) NOT LIKE '%prod test%'
    AND description NOT LIKE '%사내테스트%'
    OR description IS NULL
  )
  AND lower(setting) NOT LIKE '%not a/b%'
  AND lower(setting) NOT LIKE '%not for a/b%'
  AND lower(setting) NOT LIKE '%prod test%'
ORDER BY CAST(id AS INT) DESC
`;

interface AbTestRow {
  id: string | number;
  start_timestamp: string | number | null;
  end_timestamp: string | number | null;
  setting: string;
  description: string | null;
}

interface AbTestSetting {
  name?: string;
  test_name?: string;
  title?: string;
  population_weight?: number[];
}

interface AbTestResult {
  ids: string[];
  primaryId: string;
  startTs: string | null;
  endTs: string | null;
  name: string;
  populationWeight: number[] | null;
  conclusion: string | null;
}

function toIso(ts: string | number | null | undefined): string | null {
  if (ts === null || ts === undefined || ts === '') return null;

  const numeric = Number(ts);
  if (!isNaN(numeric) && numeric > 0) {
    // Treat as epoch seconds if reasonably sized, else milliseconds
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(ms);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  const date = new Date(String(ts));
  if (!isNaN(date.getTime())) return date.toISOString();

  return null;
}

@Injectable()
export class AbtestListService {
  constructor(
    private readonly databricksService: DatabricksService,
    private readonly prismaService: PrismaService,
  ) {}

  async getList(gameCode = 'cvs'): Promise<{ rows: AbTestResult[] }> {
    const schema = GAME_CODE_TO_SCHEMA[gameCode] ?? GAME_CODE_TO_SCHEMA['cvs'];
    const query = ABTEST_QUERY.replace('ab_test', `cvs.${schema}.ab_test`);

    const result = await this.databricksService.runStatement({ statement: query, parameters: [], rowLimit: 2000 });
    const rawRows = result.rows as unknown as AbTestRow[];

    // Group rows by name + startTs + endTs
    const groupMap = new Map<
      string,
      {
        ids: string[];
        startTs: string | null;
        endTs: string | null;
        name: string;
        populationWeight: number[] | null;
      }
    >();

    for (const row of rawRows) {
      const id = String(row.id);
      const startTs = toIso(row.start_timestamp);
      const endTs = toIso(row.end_timestamp);

      let setting: AbTestSetting = {};
      try {
        setting = JSON.parse(row.setting) as AbTestSetting;
      } catch {
        // leave as empty object if parse fails
      }

      const name =
        setting.name ?? setting.test_name ?? setting.title ?? `Test ${id}`;
      const populationWeight = setting.population_weight ?? null;

      const groupKey = `${name}||${startTs}||${endTs}`;

      const existing = groupMap.get(groupKey);
      if (existing) {
        existing.ids.push(id);
      } else {
        groupMap.set(groupKey, {
          ids: [id],
          startTs,
          endTs,
          name,
          populationWeight,
        });
      }
    }

    // Fetch all conclusions
    const conclusionRecords = await this.prismaService.abTestConclusion.findMany({
      select: { primaryId: true, conclusion: true },
    });
    const conclusionMap = new Map<string, string | null>(
      conclusionRecords.map((c: any) => [c.primaryId, c.conclusion ?? null]),
    );

    // Build result rows
    const rows: AbTestResult[] = [];
    for (const group of groupMap.values()) {
      const numericIds = group.ids.map((id) => parseInt(id, 10));
      const primaryId = String(Math.min(...numericIds));
      const conclusion = conclusionMap.get(primaryId) ?? null;

      rows.push({
        ids: group.ids,
        primaryId,
        startTs: group.startTs,
        endTs: group.endTs,
        name: group.name,
        populationWeight: group.populationWeight,
        conclusion,
      });
    }

    // Sort: null startTs last, otherwise by startTs desc
    rows.sort((a, b) => {
      if (a.startTs === null && b.startTs === null) return 0;
      if (a.startTs === null) return 1;
      if (b.startTs === null) return -1;
      return b.startTs.localeCompare(a.startTs);
    });

    return { rows };
  }
}
