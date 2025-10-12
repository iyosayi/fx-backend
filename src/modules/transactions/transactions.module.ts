import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Conversion, ConversionSchema } from '../../schemas/conversion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversion.name, schema: ConversionSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}

