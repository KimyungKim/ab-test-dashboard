import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { DatabricksModule } from './databricks/databricks.module'
import { SlackModule } from './slack/slack.module'
import { AbtestModule } from './abtest/abtest.module'
import { AbtestManualModule } from './abtest-manual/abtest-manual.module'
import { AbtestConclusionModule } from './abtest-conclusion/abtest-conclusion.module'
import { AbtestProductConfigModule } from './abtest-product-config/abtest-product-config.module'
import { AbtestAnalysisModule } from './abtest-analysis/abtest-analysis.module'

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    DatabricksModule,
    SlackModule,
    AbtestModule,
    AbtestManualModule,
    AbtestConclusionModule,
    AbtestProductConfigModule,
    AbtestAnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
