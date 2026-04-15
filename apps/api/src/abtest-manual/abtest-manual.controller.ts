import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
} from '@nestjs/common';
import { AbtestManualService } from './abtest-manual.service';
import type {
  ManualAnnouncementDto,
  ManualAnalysisDto,
  ManualOutcomeDto,
  ManualAnalysisReorderDto,
  ManualAnalysisDeleteDto,
} from './dto/manual.dto';

@Controller('api/abtest-manual')
export class AbtestManualController {
  constructor(private readonly abtestManualService: AbtestManualService) {}

  @Get()
  getManualData(@Query('key') key: string) {
    return this.abtestManualService.getManualData(key);
  }

  @Post('announcement')
  setAnnouncement(@Body() body: ManualAnnouncementDto) {
    return this.abtestManualService.setAnnouncement(body);
  }

  @Delete('announcement')
  clearAnnouncement(@Body() body: { key: string }) {
    return this.abtestManualService.clearAnnouncement(body.key);
  }

  @Post('analysis')
  addAnalysisItem(@Body() body: ManualAnalysisDto) {
    return this.abtestManualService.addAnalysisItem(body);
  }

  @Delete('analysis')
  removeAnalysisItem(@Body() body: ManualAnalysisDeleteDto) {
    return this.abtestManualService.removeAnalysisItem(body.key, body.id);
  }

  @Post('analysis-reorder')
  reorderAnalysisItems(@Body() body: ManualAnalysisReorderDto) {
    return this.abtestManualService.reorderAnalysisItems(
      body.key,
      body.orderedIds,
    );
  }

  @Post('outcome')
  setOutcome(@Body() body: ManualOutcomeDto) {
    return this.abtestManualService.setOutcome(body);
  }

  @Delete('outcome')
  clearOutcome(@Body() body: { key: string }) {
    return this.abtestManualService.clearOutcome(body.key);
  }

  @Delete('all')
  clearAll(@Body() body: { key: string }) {
    return this.abtestManualService.clearAll(body.key);
  }
}
