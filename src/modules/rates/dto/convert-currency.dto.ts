import { IsNotEmpty, IsIn, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CURRENCIES } from '../../../config/constants';

export class ConvertCurrencyDto {
  @IsNotEmpty({ message: 'Source currency is required' })
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Unsupported source currency' })
  from: string;

  @IsNotEmpty({ message: 'Target currency is required' })
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Unsupported target currency' })
  to: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount?: number = 1;
}

