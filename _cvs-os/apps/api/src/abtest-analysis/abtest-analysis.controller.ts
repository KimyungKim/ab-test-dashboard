import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AbtestAnalysisService } from './abtest-analysis.service';
import { AbtestProductConfigService } from '../abtest-product-config/abtest-product-config.service';

@Controller('api/abtest-analysis')
export class AbtestAnalysisController {
  constructor(
    private readonly analysisService: AbtestAnalysisService,
    private readonly productConfig: AbtestProductConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // POST /api/abtest-analysis/run
  // -------------------------------------------------------------------------

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runAnalysis(@Body() body: { abTestId: string; gameCode?: string }): Promise<any> {
    const { abTestId, gameCode } = body;

    // IDs sorted descending for cache key (order-independent cache hits)
    const sortedIds = String(abTestId)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => b - a)
      .join(',');

    // IDs sorted ascending for product config key (matches analysis engine primary-ID convention)
    const testKey = String(abTestId)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b)
      .join(',');

    const productConfigData = await this.productConfig.getProductConfig(`${gameCode || 'cvs'}-${testKey}`);
    const selectedProductTypes = productConfigData.productTypes || [];

    // Include selected product types in cache key when present
    const ptHash = selectedProductTypes.length
      ? `-pt${[...selectedProductTypes].sort().join('+')}`
      : '';
    const cacheKey = `${gameCode || 'cvs'}-${sortedIds}${ptHash}`;

    // Cache hit: return immediately without running Databricks queries
    const cached = await this.analysisService.getCachedAnalysis(cacheKey);
    if (cached) {
      console.log(`[cache] hit: ${cacheKey}`);
      return cached;
    }

    const result = await this.analysisService.runAnalysis(abTestId, gameCode ?? 'cvs');

    // Cache tests that ended 60+ days ago (fire-and-forget)
    if (result?.meta?.endPst) {
      const daysSinceEnd = (Date.now() - new Date(result.meta.endPst).getTime()) / 86_400_000;
      if (daysSinceEnd >= 60) {
        this.analysisService
          .setCachedAnalysis(cacheKey, result)
          .then(() => console.log(`[cache] saved: ${cacheKey}`))
          .catch((err: unknown) => console.error(`[cache] write error: ${cacheKey}`, err));
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // DELETE /api/abtest-analysis/cache/all
  // -------------------------------------------------------------------------

  @Delete('cache/all')
  @HttpCode(HttpStatus.OK)
  async clearAllCache(): Promise<{ ok: boolean; count: number }> {
    const count = await this.analysisService.clearAllCache();
    console.log(`[cache] cleared all (${count} entries)`);
    return { ok: true, count };
  }

  // -------------------------------------------------------------------------
  // DELETE /api/abtest-analysis/cache
  // -------------------------------------------------------------------------

  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async clearCache(
    @Body() body: { abTestId: string; gameCode?: string },
  ): Promise<{ ok: boolean; reason?: string }> {
    const { abTestId, gameCode } = body;

    const sortedIds = String(abTestId)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => b - a)
      .join(',');

    // Note: cache key for DELETE uses sortedIds only (no ptHash) to match original server.mjs behavior
    const cacheKey = `${gameCode || 'cvs'}-${sortedIds}`;

    const deleted = await this.analysisService.clearCacheByKey(cacheKey);
    if (deleted) {
      console.log(`[cache] cleared: ${cacheKey}`);
      return { ok: true };
    }
    return { ok: false, reason: 'no cache' };
  }
}
