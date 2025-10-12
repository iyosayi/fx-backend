import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.auditLogModel.create(entry);
    } catch (error) {
      // Log but don't throw - audit failures shouldn't break the app
      console.error('Failed to create audit log:', error);
    }
  }

  async getUserLogs(filters: AuditLogFilters) {
    const query: any = { userId: filters.userId };

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [logs, totalItems] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit)
        .lean(),
      this.auditLogModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalItems / filters.limit);

    return {
      logs,
      pagination: {
        currentPage: filters.page,
        totalPages,
        totalItems,
        itemsPerPage: filters.limit,
      },
    };
  }
}

