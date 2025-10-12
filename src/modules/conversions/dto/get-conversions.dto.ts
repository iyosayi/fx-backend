import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CURRENCIES } from '../../../config/constants';

export class GetConversionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Invalid source currency' })
  fromCurrency?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Invalid target currency' })
  toCurrency?: string;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'fromAmount', 'toAmount'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

