import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversion, ConversionDocument } from '../../schemas/conversion.schema';
import { GetTransactionsDto } from './dto/get-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<ConversionDocument>,
  ) {}

  async getTransactionHistory(userId: string, filters: GetTransactionsDto) {
    const query: any = { userId: new Types.ObjectId(userId) };

    // Apply status filter if provided
    if (filters.status) {
      query.status = filters.status.toUpperCase();
    }

    // Map frontend sortBy field names to database field names
    const sortByMapping: Record<string, string> = {
      timestamp: 'createdAt',
      rate: 'exchangeRate',
      amountSent: 'fromAmount',
      amountReceived: 'toAmount',
    };

    const dbSortBy = filters.sortBy ? sortByMapping[filters.sortBy] : 'createdAt';

    // Sorting
    const sortOptions: any = {};
    sortOptions[dbSortBy] = filters.sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const limit = filters.limit || 10;
    const page = filters.page || 1;
    const skip = (page - 1) * limit;

    // Execute query
    const [conversions, totalRecords] = await Promise.all([
      this.conversionModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversionModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    // Map response to match frontend requirements
    const data = conversions.map((conv) => ({
      id: conv._id.toString(),
      fromCurrency: conv.fromCurrency,
      toCurrency: conv.toCurrency,
      amountSent: conv.fromAmount,
      amountReceived: conv.toAmount,
      exchangeRate: conv.exchangeRate,
      createdAt: conv.createdAt.toISOString(),
      status: conv.status.toLowerCase(),
    }));

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        itemsPerPage: limit,
      },
    };
  }
}

