import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversion, ConversionDocument } from '../../schemas/conversion.schema';
import { RatesService } from '../rates/rates.service';
import { AuditService } from '../audit/audit.service';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { GetConversionsDto } from './dto/get-conversions.dto';
import { AppException } from '../../common/filters/http-exception.filter';
import { ConversionStatus } from '../../config/constants';

@Injectable()
export class ConversionsService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<ConversionDocument>,
    private ratesService: RatesService,
    private auditService: AuditService,
  ) {}

  async createConversion(userId: string, createConversionDto: CreateConversionDto) {
    const { fromCurrency, toCurrency, amount } = createConversionDto;

    // Validate that currencies are different
    if (fromCurrency === toCurrency) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Source and target currencies must be different');
    }

    try {
      // Fetch exchange rate
      const rate = await this.ratesService.getRate(fromCurrency, toCurrency);

      // Calculate converted amount
      const toAmount = amount * rate;

      // Create conversion
      const conversion = await this.conversionModel.create({
        userId: new Types.ObjectId(userId),
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount,
        exchangeRate: rate,
        status: ConversionStatus.COMPLETED,
      });

      // Log audit event
      await this.auditService.log({
        userId,
        action: 'CONVERSION_CREATED',
        resource: 'conversion',
        resourceId: conversion._id.toString(),
        metadata: {
          fromCurrency,
          toCurrency,
          amount,
        },
      });

      return conversion.toJSON();
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(500, 'CONVERSION_FAILED', 'Failed to create conversion', { cause: error.message });
    }
  }

  async getConversions(userId: string, filters: GetConversionsDto) {
    const query: any = { userId: new Types.ObjectId(userId) };

    // Apply filters
    if (filters.fromCurrency) {
      query.fromCurrency = filters.fromCurrency;
    }
    if (filters.toCurrency) {
      query.toCurrency = filters.toCurrency;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    // Sorting
    const sortOptions: any = {};
    sortOptions[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);

    // Execute query
    const [conversions, totalItems] = await Promise.all([
      this.conversionModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(filters.limit || 20)
        .lean(),
      this.conversionModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalItems / (filters.limit || 20));

    return {
      conversions: conversions.map((conv) => ({
        id: conv._id.toString(),
        userId: conv.userId.toString(),
        fromCurrency: conv.fromCurrency,
        toCurrency: conv.toCurrency,
        fromAmount: conv.fromAmount,
        toAmount: conv.toAmount,
        exchangeRate: conv.exchangeRate,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      pagination: {
        currentPage: filters.page || 1,
        totalPages,
        totalItems,
        itemsPerPage: filters.limit || 20,
        hasNextPage: (filters.page || 1) < totalPages,
        hasPreviousPage: (filters.page || 1) > 1,
      },
    };
  }

  async getConversionById(id: string, userId: string) {
    const conversion = await this.conversionModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!conversion) {
      throw new AppException(404, 'CONVERSION_NOT_FOUND', 'Conversion not found');
    }

    return conversion.toJSON();
  }
}

