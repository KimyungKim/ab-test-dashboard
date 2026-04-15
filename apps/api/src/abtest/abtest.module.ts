import { Module } from '@nestjs/common';
import { AbtestController } from './abtest.controller';
import { AbtestListService } from './abtest-list.service';
import { AbtestSlackService } from './abtest-slack.service';
import { DatabricksModule } from '../databricks/databricks.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [DatabricksModule, SlackModule],
  controllers: [AbtestController],
  providers: [AbtestListService, AbtestSlackService],
  exports: [AbtestListService],
})
export class AbtestModule {}
