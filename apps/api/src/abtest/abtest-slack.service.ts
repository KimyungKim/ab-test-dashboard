import { Injectable } from '@nestjs/common';
import { SlackService } from '../slack/slack.service';
import { SlackClassifierService } from '../slack/slack-classifier.service';
import type { ClassifyInputMessage } from '../slack/slack-classifier.service';
import { SlackAbtestDto } from './dto/slack-abtest.dto';

@Injectable()
export class AbtestSlackService {
  constructor(
    private readonly slackService: SlackService,
    private readonly slackClassifier: SlackClassifierService,
  ) {}

  async fetchAndClassify(dto: SlackAbtestDto): Promise<unknown> {
    // Normalize testIds from dto.testIds array OR dto.testId comma-split
    let testIds: string[] = [];
    if (dto.testIds && dto.testIds.length > 0) {
      testIds = dto.testIds;
    } else if (dto.testId) {
      testIds = dto.testId
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    const { testName, startDate, endDate } = dto;

    const slackData = await this.slackService.fetchAbTestSlackData({
      testIds,
      testName,
      startDate,
      endDate,
    });

    if (!slackData.found) {
      return slackData;
    }

    // Classify each thread and filter those with an announcement
    const classifiedThreads = slackData.threads
      .map((thread) => {
        const classified = this.slackClassifier.classifyThreadMessages(
          thread.messages as ClassifyInputMessage[],
          testIds,
        );
        if (!classified.announcement) return null;
        return {
          channelId: thread.channelId,
          channelName: thread.channelName,
          permalink: thread.permalink,
          announcement: classified.announcement,
          analysisResults: classified.analysisResults,
          outcome: classified.outcome,
        };
      })
      .filter(Boolean);

    return {
      found: classifiedThreads.length > 0,
      threads: classifiedThreads,
      images: slackData.images,
    };
  }
}
