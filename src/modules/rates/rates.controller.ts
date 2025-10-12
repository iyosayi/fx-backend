import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetRatesDto } from './dto/get-rates.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

@Controller('rates')
@UseGuards(JwtAuthGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  async getRates(@Query() query: GetRatesDto) {
    const symbols = query.symbols ? query.symbols.split(',') : undefined;
    const result = await this.ratesService.getRates(query.base || 'USD', symbols);

    return {
      success: true,
      data: {
        ...result,
        source: 'exchangerate-api',
      },
    };
  }

  @Get('convert')
  async convertCurrency(@Query() query: ConvertCurrencyDto) {
    const result = await this.ratesService.convertCurrency(
      query.from,
      query.to,
      query.amount,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('currencies')
  async getCurrencies() {
    const currencies = this.ratesService.getCurrencies();

    return {
      success: true,
      data: {
        currencies,
      },
    };
  }
}

