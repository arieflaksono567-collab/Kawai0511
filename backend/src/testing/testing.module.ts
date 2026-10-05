import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { SimulationService } from './simulation.service';

@Module({
  controllers: [TestingController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class TestingModule {}
