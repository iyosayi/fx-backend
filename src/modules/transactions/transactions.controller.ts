import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetTransactionsDto } from './dto/get-transactions.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactionHistory(
    @CurrentUser() user: any,
    @Query() query: GetTransactionsDto,
  ) {
    const result = await this.transactionsService.getTransactionHistory(user.id, query);

    return {
      success: true,
      data: result,
    };
  }
}

