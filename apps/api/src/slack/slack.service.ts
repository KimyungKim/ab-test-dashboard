import { Injectable, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';

const SLACK_API = 'https://slack.com/api';

const ALLOWED_CHANNELS = ['cvs-economy', 'cvs-ba', 'cvs-team-crm', 'cvs-metadesign'];

const SIX_MONTHS_SEC = 6 * 30 * 24 * 3600;

export interface SlackImage {
  fileId: string;
  name: string;
  url: string;
  thumb?: string;
  proxyUrl?: string;
  width: number | null;
  height: number | null;
}

export interface SlackMessage {
  ts: string;
  text: string;
  images: SlackImage[];
}

export interface SlackThread {
  channelId: string;
  channelName: string;
  permalink: string | undefined;
  threadTs: string;
  messages: SlackMessage[];
}

export interface AbTestSlackData {
  found: boolean;
  threads: SlackThread[];
  images: SlackImage[];
}

export interface ChannelInfo {
  name: string;
  isPrivate: boolean | null;
}

export interface FetchAbTestSlackDataParams {
  testName?: string;
  testIds?: (string | number)[];
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class SlackService {
  private getToken(): string {
    const token = (process.env.SLACK_USER_TOKEN || '').trim();
    if (!token) {
      throw new ServiceUnavailableException('SLACK_USER_TOKEN is not configured.');
    }
    return token;
  }

  private async slackGet(method: string, params: Record<string, string | number | undefined | null>, retries = 3): Promise<any> {
    const token = this.getToken();
    const url = new URL(`${SLACK_API}/${method}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json() as any;
    if (!payload.ok) {
      if (payload.error === 'ratelimited' && retries > 0) {
        const retryAfter = Number(response.headers.get('Retry-After') || 1);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return this.slackGet(method, params, retries - 1);
      }
      throw new BadGatewayException(`Slack API error: ${payload.error || 'unknown'}`);
    }

    return payload;
  }

  private async searchAbTestMessages({
    testName,
    testIds = [],
    startDate,
    endDate,
  }: FetchAbTestSlackDataParams): Promise<any[]> {
    const allMatches = new Map<string, any>();

    let afterStr = '';
    let beforeStr = '';
    if (startDate) {
      const after = new Date(startDate);
      after.setDate(after.getDate() - 7);
      afterStr = ` after:${after.toISOString().slice(0, 10)}`;
    }
    if (endDate) {
      const before = new Date(endDate);
      before.setDate(before.getDate() + 30);
      beforeStr = ` before:${before.toISOString().slice(0, 10)}`;
    }

    // [TAG], (괄호 내용) 제거한 핵심 이름 키워드
    const nameKeyword = testName
      ? testName
          .replace(/\[[^\]]*\]/g, '')
          .replace(/\([^)]*\)/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40)
      : '';

    // 검색 쿼리: 이름 키워드 + 대표 ID 1개 (채널당 각 1번)
    const queries: string[] = [];
    if (nameKeyword) {
      for (const channel of ALLOWED_CHANNELS) {
        queries.push(`${nameKeyword} in:${channel}${afterStr}${beforeStr}`);
      }
    }
    if (testIds.length > 0) {
      // ID가 여러 개여도 첫 번째 하나로만 검색 — 이후 다른 ID로 필터링
      const firstId = testIds[0];
      for (const channel of ALLOWED_CHANNELS) {
        queries.push(`"${firstId}" in:${channel}${afterStr}${beforeStr}`);
      }
    }

    for (const query of queries) {
      const result = await this.slackGet('search.messages', {
        query,
        count: 20,
        sort: 'timestamp',
        sort_dir: 'desc',
      });

      for (const match of result.messages?.matches || []) {
        const channelName = match.channel?.name || '';
        if (!ALLOWED_CHANNELS.includes(channelName)) continue;

        const rootTs = match.thread_ts || match.ts;
        const key = `${match.channel?.id}:${rootTs}`;
        if (!allMatches.has(key)) {
          allMatches.set(key, { ...match, _rootTs: rootTs });
        }
      }
    }

    return [...allMatches.values()];
  }

  private async getThread(channelId: string, threadTs: string): Promise<any[]> {
    const messages: any[] = [];
    let cursor: string | undefined;
    do {
      const result = await this.slackGet('conversations.replies', {
        channel: channelId,
        ts: threadTs,
        limit: 200,
        ...(cursor ? { cursor } : {}),
      });
      messages.push(...(result.messages || []));
      cursor = result.response_metadata?.next_cursor;
    } while (cursor);
    return messages;
  }

  private extractImages(messages: any[]): SlackImage[] {
    const images: SlackImage[] = [];
    for (const msg of messages) {
      for (const file of msg.files || []) {
        if (file.mimetype?.startsWith('image/')) {
          images.push({
            fileId: file.id,
            name: file.name,
            url: file.url_private,
            thumb: file.thumb_360 || file.thumb_160,
            messageTs: msg.ts,
          } as any);
        }
      }
    }
    return images;
  }

  private resolveRootTs(match: any): string {
    const ts = Number(match.ts);

    let threadTsStr: string | undefined = match.thread_ts;
    if (!threadTsStr && match.permalink) {
      const m = match.permalink.match(/[?&]thread_ts=([0-9.]+)/);
      if (m) threadTsStr = m[1];
    }

    const threadTs = threadTsStr ? Number(threadTsStr) : null;
    if (threadTs && threadTs !== ts && ts - threadTs <= SIX_MONTHS_SEC) {
      return String(threadTs);
    }
    return String(ts);
  }

  private idPattern(id: string): RegExp {
    return new RegExp(`(?<![0-9A-Za-z\uAC00-\uD7A3])${id}(?![0-9A-Za-z\uAC00-\uD7A3])`);
  }

  private threadContainsId(thread: SlackThread, id: string): boolean {
    return thread.messages.some(m => this.idPattern(id).test(m.text));
  }

  private filterThreadsByIds(threads: SlackThread[], testIds: (string | number)[]): SlackThread[] {
    if (threads.length <= 1 || testIds.length <= 1) return threads;

    const otherIds = testIds.slice(1).map(String);
    const filtered = threads.filter(t => otherIds.some(id => this.threadContainsId(t, id)));
    return filtered.length > 0 ? filtered : threads;
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    try {
      const result = await this.slackGet('conversations.info', { channel: channelId });
      const ch = result.channel || {};
      return {
        name: ch.name || channelId,
        isPrivate: !!(ch.is_private || ch.is_im || ch.is_mpim),
      };
    } catch {
      return { name: channelId, isPrivate: null };
    }
  }

  async fetchSlackThread(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    const allMessages = await this.getThread(channelId, threadTs);
    return allMessages
      .map(msg => ({
        ts: msg.ts,
        text: msg.text || '',
        images: (msg.files || [])
          .filter((f: any) => f.mimetype?.startsWith('image/'))
          .map((f: any) => ({
            fileId: f.id,
            name: f.name,
            url: f.url_private,
            proxyUrl: `/api/slack-file?url=${encodeURIComponent(f.url_private)}`,
            width: f.original_w || null,
            height: f.original_h || null,
          })),
      }))
      .filter(msg => msg.text || msg.images.length > 0);
  }

  async fetchAbTestSlackData({
    testName,
    testIds = [],
    startDate,
    endDate,
  }: FetchAbTestSlackDataParams): Promise<AbTestSlackData> {
    const matches = await this.searchAbTestMessages({ testName, testIds, startDate, endDate });

    if (matches.length === 0) {
      return { found: false, threads: [], images: [] };
    }

    const threads: SlackThread[] = [];
    const allImages: SlackImage[] = [];
    const seenThreads = new Set<string>();

    for (const match of matches) {
      const channelId = match.channel?.id as string | undefined;
      if (!channelId) continue;

      const threadTs = this.resolveRootTs(match);
      const threadKey = `${channelId}:${threadTs}`;
      if (seenThreads.has(threadKey)) continue;
      seenThreads.add(threadKey);

      let allMessages: any[];
      try {
        allMessages = await this.getThread(channelId, threadTs);
      } catch {
        continue;
      }

      const messages: SlackMessage[] = allMessages
        .map(msg => ({
          ts: msg.ts,
          text: msg.text || '',
          images: (msg.files || [])
            .filter((f: any) => f.mimetype?.startsWith('image/'))
            .map((f: any) => ({
              fileId: f.id,
              name: f.name,
              url: f.url_private,
              thumb: f.thumb_360 || f.thumb_160,
              proxyUrl: `/api/slack-file?url=${encodeURIComponent(f.url_private)}`,
              width: f.original_w || null,
              height: f.original_h || null,
            })),
        }))
        .filter(msg => msg.text || msg.images.length > 0);

      const images = this.extractImages(allMessages);
      allImages.push(...images);

      threads.push({
        channelId,
        channelName: match.channel?.name || channelId,
        permalink: match.permalink,
        threadTs,
        messages,
      });
    }

    const filteredThreads = this.filterThreadsByIds(threads, testIds);

    return { found: filteredThreads.length > 0, threads: filteredThreads, images: allImages };
  }
}
