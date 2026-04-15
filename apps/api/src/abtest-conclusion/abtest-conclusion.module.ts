import { Module } from '@nestjs/common';
import { AbtestConclusionController } from './abtest-conclusion.controller';
import { AbtestConclusionService } from './abtest-conclusion.service';

@Module({
  controllers: [AbtestConclusionController],
  providers: [AbtestConclusionService],
  exports: [AbtestConclusionService],
})
export class AbtestConclusionModule {}
