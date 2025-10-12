import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ConversionStatus } from '../config/constants';

export type ConversionDocument = Conversion & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (_doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Conversion {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: [true, 'Source currency is required'],
    uppercase: true,
    trim: true,
    length: 3,
  })
  fromCurrency: string;

  @Prop({
    required: [true, 'Target currency is required'],
    uppercase: true,
    trim: true,
    length: 3,
  })
  toCurrency: string;

  @Prop({
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be at least 0.01'],
    max: [1000000, 'Amount cannot exceed 1,000,000'],
  })
  fromAmount: number;

  @Prop({
    required: [true, 'Converted amount is required'],
  })
  toAmount: number;

  @Prop({
    required: [true, 'Exchange rate is required'],
  })
  exchangeRate: number;

  @Prop({
    type: String,
    enum: Object.values(ConversionStatus),
    default: ConversionStatus.COMPLETED,
  })
  status: ConversionStatus;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ConversionSchema = SchemaFactory.createForClass(Conversion);

// Create compound indexes for efficient queries
ConversionSchema.index({ userId: 1, createdAt: -1 });
ConversionSchema.index({ fromCurrency: 1, toCurrency: 1 });
ConversionSchema.index({ createdAt: -1 });
ConversionSchema.index({ status: 1 });

