import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { WinstonLoggerService } from '../../utils/logger.service';

@Module({
  imports: [ConfigModule],
  controllers: [RatesController],
  providers: [RatesService, WinstonLoggerService],
  exports: [RatesService],
})
export class RatesModule {}

