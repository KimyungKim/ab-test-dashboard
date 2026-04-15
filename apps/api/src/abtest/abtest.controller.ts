import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { AbtestListService } from './abtest-list.service';
import { AbtestSlackService } from './abtest-slack.service';
import { SlackAbtestDto } from './dto/slack-abtest.dto';
import { DatabricksService } from '../databricks/databricks.service';

@Controller('api')
export class AbtestController {
  constructor(
    private readonly abtestListService: AbtestListService,
    private readonly abtestSlackService: AbtestSlackService,
    private readonly databricksService: DatabricksService,
  ) {}

  @Get('abtest-list')
  async getAbtestList(@Query('game') game?: string) {
    return this.abtestListService.getList(game ?? 'cvs');
  }

  @Get('abtest-analysis-list')
  async getAbtestAnalysisList(@Query('game') game?: string) {
    return this.abtestListService.getList(game ?? 'cvs');
  }

  @Post('slack-abtest')
  async postSlackAbtest(@Body() body: SlackAbtestDto) {
    return this.abtestSlackService.fetchAndClassify(body);
  }

  @Get('health')
  getHealth() {
    return {
      ok: true,
      mode: this.databricksService.getConnectionMode(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('slack-file')
  async proxySlackFile(
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!url) {
      throw new BadRequestException('url query parameter is required');
    }

    if (!url.startsWith('https://files.slack.com/')) {
      throw new BadRequestException(
        'url must start with https://files.slack.com/',
      );
    }

    const token = process.env.SLACK_USER_TOKEN;
    if (!token) {
      throw new InternalServerErrorException('SLACK_USER_TOKEN is not set');
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new InternalServerErrorException('Failed to fetch Slack file');
      }

      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (err: unknown) {
      if (err instanceof InternalServerErrorException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to fetch Slack file: ${message}`,
      );
    }
  }
}
