import { Controller, Post, Body } from '@nestjs/common';
import { AbtestConclusionService } from './abtest-conclusion.service';

@Controller('api')
export class AbtestConclusionController {
  constructor(private readonly service: AbtestConclusionService) {}

  @Post('abtest-conclusion')
  async setConclusion(
    @Body() body: { primaryId: string; conclusion?: string | null },
  ): Promise<{ ok: boolean }> {
    await this.service.setConclusion(body.primaryId, body.conclusion ?? null);
    return { ok: true };
  }
}
