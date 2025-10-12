import { IsNotEmpty, IsIn, IsNumber, Min, Max } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../config/constants';

export class CreateConversionDto {
  @IsNotEmpty({ message: 'Source currency is required' })
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Unsupported source currency' })
  fromCurrency: string;

  @IsNotEmpty({ message: 'Target currency is required' })
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Unsupported target currency' })
  toCurrency: string;

  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Minimum amount is 0.01' })
  @Max(1000000, { message: 'Maximum amount is 1,000,000' })
  amount: number;
}

