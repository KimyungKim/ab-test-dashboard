import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlackService } from '../slack/slack.service';
import { SlackClassifierService } from '../slack/slack-classifier.service';
import type {
  ManualAnnouncementDto,
  ManualAnalysisDto,
  ManualOutcomeDto,
} from './dto/manual.dto';

interface ParsedSlackUrl {
  channelId: string;
  msgTs: string;
  threadTs: string;
}

@Injectable()
export class AbtestManualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slackService: SlackService,
    private readonly slackClassifier: SlackClassifierService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private parseSlackUrl(slackUrl: string): ParsedSlackUrl {
    const m = String(slackUrl).match(/archives\/([A-Z0-9]+)\/p(\d+)/);
    if (!m) {
      throw new HttpException(
        '유효한 Slack 링크가 아닙니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const channelId = m[1];
    const tsRaw = m[2];
    const msgTs = `${tsRaw.slice(0, -6)}.${tsRaw.slice(-6)}`;
    const threadTs =
      new URL(slackUrl).searchParams.get('thread_ts') ?? msgTs;
    return { channelId, msgTs, threadTs };
  }

  private async guardPrivateChannel(channelId: string): Promise<void> {
    const channelInfo = await this.slackService.getChannelInfo(channelId);
    if (channelInfo.isPrivate) {
      throw new HttpException(
        '비공개 채널 또는 DM은 추가할 수 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getManualData(key: string): Promise<{
    announcement: object | null;
    analysisItems: object[];
    outcome: object | null;
  }> {
    const [announcement, analysisItems, outcome] = await Promise.all([
      this.prisma.abTestManualAnnouncement.findUnique({ where: { testKey: key } }),
      this.prisma.abTestManualAnalysisItem.findMany({
        where: { testKey: key },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.abTestManualOutcome.findUnique({ where: { testKey: key } }),
    ]);

    return {
      announcement: announcement ?? null,
      analysisItems: analysisItems ?? [],
      outcome: outcome ?? null,
    };
  }

  async setAnnouncement(dto: ManualAnnouncementDto): Promise<object> {
    const { key, slackUrl, testIds = [] } = dto;
    const { channelId, threadTs } = this.parseSlackUrl(slackUrl);

    await this.guardPrivateChannel(channelId);

    const allMessages = await this.slackService.fetchSlackThread(
      channelId,
      threadTs,
    );
    const classified = this.slackClassifier.classifyThreadMessages(
      allMessages,
      testIds.map(String),
    );

    const msg =
      classified.announcement ??
      (allMessages[0] ? { text: allMessages[0].text } : null);

    if (!msg?.text) {
      throw new HttpException(
        '공지 메시지를 찾을 수 없습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saved = await this.prisma.abTestManualAnnouncement.upsert({
      where: { testKey: key },
      update: { url: slackUrl, text: msg.text, imageUrls: [] },
      create: { testKey: key, url: slackUrl, text: msg.text, imageUrls: [] },
    });

    return saved;
  }

  async clearAnnouncement(key: string): Promise<{ ok: boolean }> {
    await this.prisma.abTestManualAnnouncement.deleteMany({
      where: { testKey: key },
    });
    return { ok: true };
  }

  async addAnalysisItem(dto: ManualAnalysisDto): Promise<{ added: object[] }> {
    const { key, slackUrl, testIds = [] } = dto;
    const { msgTs, channelId, threadTs } = this.parseSlackUrl(slackUrl);

    await this.guardPrivateChannel(channelId);

    const allMessages = await this.slackService.fetchSlackThread(
      channelId,
      threadTs,
    );
    const classified = this.slackClassifier.classifyThreadMessages(
      allMessages,
      testIds.map(String),
    );

    const toAdd =
      classified.analysisResults.length > 0
        ? classified.analysisResults
        : [
            allMessages.find(
              (msg) => Number(msg.ts) === Number(msgTs),
            ) ?? allMessages[0],
          ]
            .filter(Boolean)
            .map((msg) => ({
              text: msg.text,
              images: (msg as any).images ?? [],
            }));

    if (toAdd.length === 0) {
      throw new HttpException(
        '추가할 분석 메시지를 찾을 수 없습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determine current max sortOrder for this key
    const existing = await this.prisma.abTestManualAnalysisItem.findMany({
      where: { testKey: key },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' },
    });
    const maxOrder =
      existing.length > 0 ? (existing[0].sortOrder as number) : -1;

    const added: object[] = [];
    for (let i = 0; i < toAdd.length; i++) {
      const r = toAdd[i];
      const imageUrls: string[] =
        ((r as any).images as Array<{ url: string }> | undefined)?.map(
          (img) => img.url,
        ) ?? [];
      const item = await this.prisma.abTestManualAnalysisItem.create({
        data: {
          testKey: key,
          url: slackUrl,
          text: r.text ?? '',
          imageUrls,
          sortOrder: maxOrder + 1 + i,
        },
      });
      added.push(item);
    }

    return { added };
  }

  async removeAnalysisItem(
    key: string,
    id: string,
  ): Promise<{ ok: boolean }> {
    const result = await this.prisma.abTestManualAnalysisItem.deleteMany({
      where: { id, testKey: key },
    });
    return { ok: result.count > 0 };
  }

  async reorderAnalysisItems(
    key: string,
    orderedIds: string[],
  ): Promise<{ ok: boolean }> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.abTestManualAnalysisItem.updateMany({
          where: { id, testKey: key },
          data: { sortOrder: index },
        }),
      ),
    );
    return { ok: true };
  }

  async setOutcome(dto: ManualOutcomeDto): Promise<object> {
    const { key, slackUrl, testIds = [] } = dto;
    const { channelId, threadTs } = this.parseSlackUrl(slackUrl);

    await this.guardPrivateChannel(channelId);

    const allMessages = await this.slackService.fetchSlackThread(
      channelId,
      threadTs,
    );
    const classified = this.slackClassifier.classifyThreadMessages(
      allMessages,
      testIds.map(String),
    );

    const msg = classified.outcome ?? allMessages.at(-1) ?? null;

    if (!msg?.text) {
      throw new HttpException(
        '결과 메시지를 찾을 수 없습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saved = await this.prisma.abTestManualOutcome.upsert({
      where: { testKey: key },
      update: { url: slackUrl, text: msg.text, imageUrls: [] },
      create: { testKey: key, url: slackUrl, text: msg.text, imageUrls: [] },
    });

    return saved;
  }

  async clearOutcome(key: string): Promise<{ ok: boolean }> {
    await this.prisma.abTestManualOutcome.deleteMany({
      where: { testKey: key },
    });
    return { ok: true };
  }

  async clearAll(key: string): Promise<{ ok: boolean }> {
    await Promise.all([
      this.prisma.abTestManualAnnouncement.deleteMany({
        where: { testKey: key },
      }),
      this.prisma.abTestManualAnalysisItem.deleteMany({
        where: { testKey: key },
      }),
      this.prisma.abTestManualOutcome.deleteMany({
        where: { testKey: key },
      }),
    ]);
    return { ok: true };
  }
}
