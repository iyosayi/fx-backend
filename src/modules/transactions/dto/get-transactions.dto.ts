import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversionStatus } from '../../../config/constants';

export class GetTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50], { message: 'Limit must be one of: 10, 20, 50' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['timestamp', 'rate', 'amountSent', 'amountReceived'], {
    message: 'sortBy must be one of: timestamp, rate, amountSent, amountReceived',
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @IsIn(['completed', 'pending', 'failed'], {
    message: 'status must be one of: completed, pending, failed',
  })
  status?: string;
}

