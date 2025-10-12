import { IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSummaryDto {
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsIn(['currency', 'day', 'week', 'month'])
  groupBy?: string = 'currency';
}

