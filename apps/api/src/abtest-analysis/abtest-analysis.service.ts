import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabricksService } from '../databricks/databricks.service';
import { AbtestProductConfigService } from '../abtest-product-config/abtest-product-config.service';
import { runAbtestAnalysis } from './analysis-engine';

@Injectable()
export class AbtestAnalysisService {
  constructor(
    private readonly databricks: DatabricksService,
    private readonly productConfig: AbtestProductConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async runAnalysis(abTestId: string, gameCode: string): Promise<any> {
    const testKey = String(abTestId)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b)
      .join(',');

    const productConfig = await this.productConfig.getProductConfig(`${gameCode || 'cvs'}-${testKey}`);
    const selectedProductTypes = productConfig.productTypes || [];

    return runAbtestAnalysis({
      abTestId,
      gameCode,
      selectedProductTypes,
      runDatabricksStatement: (params) => this.databricks.runStatement(params),
    });
  }

  async getCachedAnalysis(cacheKey: string): Promise<any | null> {
    const row = await this.prisma.abTestAnalysisCache.findUnique({
      where: { cacheKey },
    });
    if (!row) return null;
    const data = row.data as any;
    if (!Array.isArray(data?.dailyPreRevRows)) return null; // stale cache check
    return data;
  }

  async setCachedAnalysis(cacheKey: string, data: any): Promise<void> {
    await this.prisma.abTestAnalysisCache.upsert({
      where: { cacheKey },
      create: { cacheKey, data },
      update: { data },
    });
  }

  async clearAllCache(): Promise<number> {
    const result = await this.prisma.abTestAnalysisCache.deleteMany();
    return result.count;
  }

  async clearCacheByKey(cacheKey: string): Promise<boolean> {
    try {
      await this.prisma.abTestAnalysisCache.delete({ where: { cacheKey } });
      return true;
    } catch {
      return false;
    }
  }
}
