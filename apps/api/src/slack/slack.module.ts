import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackClassifierService } from './slack-classifier.service';

@Module({
  providers: [SlackService, SlackClassifierService],
  exports: [SlackService, SlackClassifierService],
})
export class SlackModule {}
