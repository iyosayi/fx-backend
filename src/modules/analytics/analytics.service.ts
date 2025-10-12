import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversion, ConversionDocument } from '../../schemas/conversion.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<ConversionDocument>,
  ) {}

  async getSummary(userId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { userId: new Types.ObjectId(userId) };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    // Total conversions
    const totalConversions = await this.conversionModel.countDocuments(matchStage);

    // Total value by currency
    const totalByCurrency = await this.conversionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$fromCurrency',
          totalAmount: { $sum: '$fromAmount' },
          conversionCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Currency pair stats
    const currencyPairStats = await this.conversionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            from: '$fromCurrency',
            to: '$toCurrency',
          },
          count: { $sum: 1 },
          totalFromAmount: { $sum: '$fromAmount' },
          totalToAmount: { $sum: '$toAmount' },
          avgRate: { $avg: '$exchangeRate' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      totalConversions,
      totalValueByCurrency: totalByCurrency.map((item) => ({
        currency: item._id,
        totalAmount: item.totalAmount,
        conversionCount: item.conversionCount,
      })),
      currencyPairStats: currencyPairStats.map((item) => ({
        fromCurrency: item._id.from,
        toCurrency: item._id.to,
        count: item.count,
        totalFromAmount: item.totalFromAmount,
        totalToAmount: item.totalToAmount,
        avgRate: item.avgRate,
      })),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  async getTimeline(
    userId: string,
    startDate: Date,
    endDate: Date,
    interval: string = 'day',
    currency?: string,
  ) {
    const matchStage: any = {
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (currency) {
      matchStage.fromCurrency = currency;
    }

    // Determine grouping format based on interval
    let dateFormat: string;
    switch (interval) {
      case 'hour':
        dateFormat = '%Y-%m-%dT%H:00:00.000Z';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const timeline = await this.conversionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          conversionCount: { $sum: 1 },
          totalAmount: { $sum: '$fromAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      timeline: timeline.map((item) => ({
        timestamp: item._id,
        conversionCount: item.conversionCount,
        totalAmount: item.totalAmount,
        currency: currency || 'ALL',
      })),
      interval,
      period: { startDate, endDate },
    };
  }

  async getDashboardStats(userId: string, days: number = 7) {
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(now.getDate() - days);

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(currentPeriodStart.getDate() - days);

    const userObjectId = new Types.ObjectId(userId);

    // Get current period stats
    const currentPeriodConversions = await this.conversionModel.find({
      userId: userObjectId,
      createdAt: { $gte: currentPeriodStart, $lte: now },
    });

    // Get previous period stats
    const previousPeriodConversions = await this.conversionModel.find({
      userId: userObjectId,
      createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart },
    });

    // Group conversions by destination currency
    const currentByCurrency: Record<string, number> = {};
    currentPeriodConversions.forEach((conv) => {
      if (!currentByCurrency[conv.toCurrency]) {
        currentByCurrency[conv.toCurrency] = 0;
      }
      currentByCurrency[conv.toCurrency] += conv.toAmount;
    });

    const previousByCurrency: Record<string, number> = {};
    previousPeriodConversions.forEach((conv) => {
      if (!previousByCurrency[conv.toCurrency]) {
        previousByCurrency[conv.toCurrency] = 0;
      }
      previousByCurrency[conv.toCurrency] += conv.toAmount;
    });

    // Get all unique currencies
    const allCurrencies = new Set([
      ...Object.keys(currentByCurrency),
      ...Object.keys(previousByCurrency),
    ]);

    // Generate trend data per currency
    const trendDataByCurrency = await this.generateTrendDataByCurrency(userId, days, 7);

    // Build totalConverted object with data for each currency
    const totalConverted: Record<string, { value: number; change: number; trendData: number[] }> = {};
    
    allCurrencies.forEach((currency) => {
      const currentValue = currentByCurrency[currency] || 0;
      const previousValue = previousByCurrency[currency] || 0;
      const change = this.calculatePercentageChange(previousValue, currentValue);

      totalConverted[currency] = {
        value: Math.round(currentValue * 100) / 100,
        change: Math.round(change * 10) / 10,
        trendData: trendDataByCurrency[currency] || [],
      };
    });

    // Calculate total transactions
    const currentTransactionCount = currentPeriodConversions.length;
    const previousTransactionCount = previousPeriodConversions.length;
    const transactionCountChange = this.calculatePercentageChange(
      previousTransactionCount,
      currentTransactionCount,
    );

    // Find most converted currency pair
    const pairCounts: Record<string, { count: number; fromCurrency: string; toCurrency: string }> = {};
    currentPeriodConversions.forEach((conv) => {
      const pairKey = `${conv.fromCurrency}-${conv.toCurrency}`;
      if (!pairCounts[pairKey]) {
        pairCounts[pairKey] = {
          count: 0,
          fromCurrency: conv.fromCurrency,
          toCurrency: conv.toCurrency,
        };
      }
      pairCounts[pairKey].count++;
    });

    const mostConvertedPair = Object.values(pairCounts).sort((a, b) => b.count - a.count)[0] || {
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      count: 0,
    };

    // Calculate change for most converted pair
    const previousPairCount = previousPeriodConversions.filter(
      (conv) =>
        conv.fromCurrency === mostConvertedPair.fromCurrency &&
        conv.toCurrency === mostConvertedPair.toCurrency,
    ).length;
    const mostConvertedChange = this.calculatePercentageChange(
      previousPairCount,
      mostConvertedPair.count,
    );

    // Generate trend data for transactions and most converted pair
    const generalTrendData = await this.generateTrendData(userId, days, 7);

    return {
      totalConverted,
      totalTransactions: {
        value: currentTransactionCount,
        change: Math.round(transactionCountChange * 10) / 10,
        trendData: generalTrendData.transactions,
      },
      mostConverted: {
        fromCurrency: mostConvertedPair.fromCurrency,
        toCurrency: mostConvertedPair.toCurrency,
        change: Math.round(mostConvertedChange * 10) / 10,
        trendData: generalTrendData.mostConverted,
      },
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private async generateTrendData(
    userId: string,
    days: number,
    dataPoints: number,
  ): Promise<{ transactions: number[]; mostConverted: number[] }> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - days);

    const intervalDays = Math.ceil(days / dataPoints);
    const userObjectId = new Types.ObjectId(userId);

    const transactionsTrend: number[] = [];
    const mostConvertedTrend: number[] = [];

    // Get most converted pair for consistency
    const recentConversions = await this.conversionModel.find({
      userId: userObjectId,
      createdAt: { $gte: periodStart, $lte: now },
    });

    const pairCounts: Record<string, { count: number; fromCurrency: string; toCurrency: string }> = {};
    recentConversions.forEach((conv) => {
      const pairKey = `${conv.fromCurrency}-${conv.toCurrency}`;
      if (!pairCounts[pairKey]) {
        pairCounts[pairKey] = {
          count: 0,
          fromCurrency: conv.fromCurrency,
          toCurrency: conv.toCurrency,
        };
      }
      pairCounts[pairKey].count++;
    });

    const mostConvertedPair = Object.values(pairCounts).sort((a, b) => b.count - a.count)[0];

    // Generate data points
    for (let i = 0; i < dataPoints; i++) {
      const intervalStart = new Date(periodStart);
      intervalStart.setDate(periodStart.getDate() + i * intervalDays);

      const intervalEnd = new Date(intervalStart);
      intervalEnd.setDate(intervalStart.getDate() + intervalDays);

      const intervalConversions = await this.conversionModel.find({
        userId: userObjectId,
        createdAt: { $gte: intervalStart, $lt: intervalEnd },
      });

      // Transaction count in interval
      transactionsTrend.push(intervalConversions.length);

      // Most converted pair count in interval
      if (mostConvertedPair) {
        const pairCount = intervalConversions.filter(
          (conv) =>
            conv.fromCurrency === mostConvertedPair.fromCurrency &&
            conv.toCurrency === mostConvertedPair.toCurrency,
        ).length;
        mostConvertedTrend.push(pairCount);
      } else {
        mostConvertedTrend.push(0);
      }
    }

    return {
      transactions: transactionsTrend,
      mostConverted: mostConvertedTrend,
    };
  }

  private async generateTrendDataByCurrency(
    userId: string,
    days: number,
    dataPoints: number,
  ): Promise<Record<string, number[]>> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - days);

    const intervalDays = Math.ceil(days / dataPoints);
    const userObjectId = new Types.ObjectId(userId);

    const trendDataByCurrency: Record<string, number[]> = {};

    // Generate data points
    for (let i = 0; i < dataPoints; i++) {
      const intervalStart = new Date(periodStart);
      intervalStart.setDate(periodStart.getDate() + i * intervalDays);

      const intervalEnd = new Date(intervalStart);
      intervalEnd.setDate(intervalStart.getDate() + intervalDays);

      const intervalConversions = await this.conversionModel.find({
        userId: userObjectId,
        createdAt: { $gte: intervalStart, $lt: intervalEnd },
      });

      // Group by currency for this interval
      const intervalByCurrency: Record<string, number> = {};
      intervalConversions.forEach((conv) => {
        if (!intervalByCurrency[conv.toCurrency]) {
          intervalByCurrency[conv.toCurrency] = 0;
        }
        intervalByCurrency[conv.toCurrency] += conv.toAmount;
      });

      // Add to trend arrays
      Object.keys(intervalByCurrency).forEach((currency) => {
        if (!trendDataByCurrency[currency]) {
          // Initialize with zeros for previous intervals
          trendDataByCurrency[currency] = new Array(i).fill(0);
        }
        trendDataByCurrency[currency].push(Math.round(intervalByCurrency[currency]));
      });

      // Fill zeros for currencies that didn't have conversions in this interval
      Object.keys(trendDataByCurrency).forEach((currency) => {
        if (trendDataByCurrency[currency].length < i + 1) {
          trendDataByCurrency[currency].push(0);
        }
      });
    }

    return trendDataByCurrency;
  }
}

