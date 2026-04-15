import { Module } from '@nestjs/common';
import { DatabricksModule } from '../databricks/databricks.module';
import { AbtestProductConfigModule } from '../abtest-product-config/abtest-product-config.module';
import { AbtestAnalysisController } from './abtest-analysis.controller';
import { AbtestAnalysisService } from './abtest-analysis.service';

@Module({
  imports: [DatabricksModule, AbtestProductConfigModule],
  controllers: [AbtestAnalysisController],
  providers: [AbtestAnalysisService],
})
export class AbtestAnalysisModule {}
