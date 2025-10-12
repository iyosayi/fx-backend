import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Conversion, ConversionSchema } from '../../schemas/conversion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Conversion.name, schema: ConversionSchema }]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

