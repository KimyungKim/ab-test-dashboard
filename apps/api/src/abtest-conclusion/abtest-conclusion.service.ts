import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbtestConclusionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllConclusions(): Promise<Record<string, string | null>> {
    const rows = await this.prisma.abTestConclusion.findMany();
    return Object.fromEntries(rows.map((r: any) => [r.primaryId, r.conclusion ?? null]));
  }

  async setConclusion(primaryId: string, conclusion: string | null): Promise<void> {
    if (!conclusion) {
      await this.prisma.abTestConclusion.deleteMany({ where: { primaryId } });
    } else {
      await this.prisma.abTestConclusion.upsert({
        where: { primaryId },
        create: { primaryId, conclusion },
        update: { conclusion },
      });
    }
  }
}
