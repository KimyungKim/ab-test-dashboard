import { Module } from '@nestjs/common';
import { SlackModule } from '../slack/slack.module';
import { AbtestManualController } from './abtest-manual.controller';
import { AbtestManualService } from './abtest-manual.service';

@Module({
  imports: [SlackModule],
  controllers: [AbtestManualController],
  providers: [AbtestManualService],
})
export class AbtestManualModule {}
