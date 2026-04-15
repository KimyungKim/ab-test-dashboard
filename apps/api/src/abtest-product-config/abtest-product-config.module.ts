import { Module } from '@nestjs/common';
import { AbtestProductConfigController } from './abtest-product-config.controller';
import { AbtestProductConfigService } from './abtest-product-config.service';

@Module({
  controllers: [AbtestProductConfigController],
  providers: [AbtestProductConfigService],
  exports: [AbtestProductConfigService],
})
export class AbtestProductConfigModule {}
