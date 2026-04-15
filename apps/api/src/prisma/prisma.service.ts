import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { prisma } from '@ab-test-dashboard/database'
import type { PrismaClient } from '@ab-test-dashboard/database'

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client = prisma as unknown as PrismaClient & {
    $queryRaw: (...args: unknown[]) => Promise<unknown>
    $disconnect: () => Promise<void>
  }

  async onModuleInit() {
    await (this.client as any).$connect()
  }

  async onModuleDestroy() {
    await this.client.$disconnect()
  }

  get $queryRaw() {
    return (this.client as any).$queryRaw.bind(this.client)
  }

  get abTestManualAnnouncement() {
    return (this.client as any).abtestManualAnnouncement
  }

  get abTestManualAnalysisItem() {
    return (this.client as any).abtestManualAnalysisItem
  }

  get abTestManualOutcome() {
    return (this.client as any).abtestManualOutcome
  }

  get abTestConclusion() {
    return (this.client as any).abtestConclusion
  }

  get abTestProductConfig() {
    return (this.client as any).abtestProductConfig
  }

  get abTestAnalysisCache() {
    return (this.client as any).abtestAnalysisCache
  }
}
