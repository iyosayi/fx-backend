import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AppException } from '../../common/filters/http-exception.filter';
import { WinstonLoggerService } from '../../utils/logger.service';
import { RATE_CACHE_TTL, CURRENCY_METADATA, CurrencyMetadata } from '../../config/constants';

interface RateCache {
  [key: string]: {
    value: number;
    timestamp: number;
    ttl: number;
  };
}

@Injectable()
export class RatesService {
  private client: AxiosInstance;
  private cache: RateCache = {};
  private cacheTTL: number;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService,
  ) {
    this.client = axios.create({
      baseURL: this.configService.get<string>('EXCHANGE_RATE_API_URL') || 'https://api.exchangerate-api.com/v4/latest',
      timeout: 10000,
    });

    this.cacheTTL = RATE_CACHE_TTL;

    // Start cache cleanup
    this.startCacheCleanup();
  }

  async getRate(from: string, to: string): Promise<number> {
    // Check cache first
    const cacheKey = `${from}_${to}`;
    const cachedRate = this.getCachedRate(cacheKey);

    if (cachedRate !== null) {
      this.logger.debug(`Using cached exchange rate for ${from} to ${to}`, 'RatesService');
      return cachedRate;
    }

    // Fetch from API
    try {
      const rate = await this.fetchRateFromAPI(from, to);
      this.setCacheRate(cacheKey, rate);
      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate from ${from} to ${to}`, error.message, 'RatesService');
      throw new AppException(503, 'RATE_API_ERROR', 'Unable to fetch exchange rate at this time');
    }
  }

  async getRates(base: string, symbols?: string[]): Promise<{ base: string; rates: Record<string, number>; timestamp: string }> {
    try {
      const response = await this.client.get(`/${base}`);
      let rates = response.data.rates || response.data.conversion_rates;

      // Filter by symbols if provided
      if (symbols && symbols.length > 0) {
        rates = Object.keys(rates)
          .filter((key) => symbols.includes(key))
          .reduce((obj, key) => {
            obj[key] = rates[key];
            return obj;
          }, {});
      }

      return {
        base,
        rates,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch rates for base ${base}`, error.message, 'RatesService');
      throw new AppException(503, 'RATE_API_ERROR', 'Unable to fetch exchange rates at this time');
    }
  }

  async convertCurrency(from: string, to: string, amount: number = 1): Promise<{ from: string; to: string; rate: number; amount: number; convertedAmount: number; timestamp: string }> {
    const rate = await this.getRate(from, to);
    const convertedAmount = amount * rate;

    return {
      from,
      to,
      rate,
      amount,
      convertedAmount,
      timestamp: new Date().toISOString(),
    };
  }

  getCurrencies(): CurrencyMetadata[] {
    return Object.values(CURRENCY_METADATA);
  }

  private async fetchRateFromAPI(from: string, to: string): Promise<number> {
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.get(`/${from}`);
        const rates = response.data.rates || response.data.conversion_rates;

        if (!rates || !rates[to]) {
          throw new Error(`Rate for ${to} not found`);
        }

        return rates[to];
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Rate API attempt ${attempt} failed: ${error.message}`, 'RatesService');

        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError;
  }

  private getCachedRate(key: string): number | null {
    const entry = this.cache[key];

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl * 1000;

    if (isExpired) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  private setCacheRate(key: string, value: number): void {
    this.cache[key] = {
      value,
      timestamp: Date.now(),
      ttl: this.cacheTTL,
    };
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      Object.keys(this.cache).forEach((key) => {
        const entry = this.cache[key];
        if (now - entry.timestamp > entry.ttl * 1000) {
          delete this.cache[key];
        }
      });
    }, 60000); // Cleanup every minute
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

