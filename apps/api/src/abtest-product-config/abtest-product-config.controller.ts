import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { AbtestProductConfigService } from './abtest-product-config.service';

@Controller('api')
export class AbtestProductConfigController {
  constructor(private readonly service: AbtestProductConfigService) {}

  @Get('abtest-product-config')
  getProductConfig(@Query('key') key: string): Promise<{ productTypes: string[] }> {
    return this.service.getProductConfig(key ?? '');
  }

  @Post('abtest-product-config')
  setProductConfig(
    @Body() body: { key: string; productTypes: string[] },
  ): Promise<{ productTypes: string[] }> {
    return this.service.setProductConfig(body.key, body.productTypes);
  }

  @Delete('abtest-product-config')
  async clearProductConfig(
    @Body() body: { key: string },
  ): Promise<{ ok: boolean }> {
    await this.service.clearProductConfig(body.key);
    return { ok: true };
  }
}
