import { IsNotEmpty, IsOptional, IsIn, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTimelineDto {
  @IsNotEmpty({ message: 'Start date is required' })
  @Type(() => Date)
  startDate: Date;

  @IsNotEmpty({ message: 'End date is required' })
  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  interval?: string = 'day';

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency must be 3 characters' })
  currency?: string;
}

