import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversionsService } from './conversions.service';
import { ConversionsController } from './conversions.controller';
import { Conversion, ConversionSchema } from '../../schemas/conversion.schema';
import { RatesModule } from '../rates/rates.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Conversion.name, schema: ConversionSchema }]),
    RatesModule,
    AuditModule,
  ],
  controllers: [ConversionsController],
  providers: [ConversionsService],
  exports: [ConversionsService],
})
export class ConversionsModule {}

