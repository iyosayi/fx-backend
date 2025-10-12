export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'CAD', 'ZAR', 'KES', 'GHS'] as const;

export type Currency = typeof SUPPORTED_CURRENCIES[number];

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  flag: string;
  name: string;
}

export const CURRENCY_METADATA: Record<string, CurrencyMetadata> = {
  USD: {
    code: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    name: 'US Dollar',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    flag: '🇳🇬',
    name: 'Nigerian Naira',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    name: 'British Pound Sterling',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    name: 'Euro',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    flag: '🇨🇦',
    name: 'Canadian Dollar',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    flag: '🇿🇦',
    name: 'South African Rand',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    flag: '🇰🇪',
    name: 'Kenyan Shilling',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    flag: '🇬🇭',
    name: 'Ghanaian Cedi',
  },
};

export enum ConversionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
};

export const COOKIE_CONFIG = {
  ACCESS_TOKEN_NAME: 'accessToken',
  REFRESH_TOKEN_NAME: 'refreshToken',
  OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const,
    path: '/',
  },
  ACCESS_TOKEN_MAX_AGE: 15 * 60 * 1000, // 15 minutes in milliseconds
  REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const RATE_CACHE_TTL = parseInt(process.env.RATE_CACHE_TTL || '3600', 10);

export const API_PREFIX = process.env.API_PREFIX || '/api';

