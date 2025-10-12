import { IsOptional, IsString, IsIn } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../config/constants';

export class GetRatesDto {
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Invalid base currency' })
  base?: string = 'USD';

  @IsOptional()
  @IsString()
  symbols?: string;
}

