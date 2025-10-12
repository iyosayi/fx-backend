import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    transform: function (_doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AuditLog {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    required: [true, 'Action is required'],
    index: true,
  })
  action: string;

  @Prop({
    required: [true, 'Resource is required'],
  })
  resource: string;

  @Prop()
  resourceId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Create compound indexes for efficient queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });

