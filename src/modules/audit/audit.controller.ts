import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query() query: GetAuditLogsDto,
  ) {
    const result = await this.auditService.getUserLogs({
      userId: user.id,
      action: query.action,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page || 1,
      limit: query.limit || 50,
    });

    return {
      success: true,
      data: result,
    };
  }
}

