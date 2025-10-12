import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSummaryDto } from './dto/get-summary.dto';
import { GetTimelineDto } from './dto/get-timeline.dto';
import { GetDashboardStatsDto } from './dto/get-dashboard-stats.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: any, @Query() query: GetSummaryDto) {
    const result = await this.analyticsService.getSummary(
      user.id,
      query.startDate,
      query.endDate,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('timeline')
  async getTimeline(@CurrentUser() user: any, @Query() query: GetTimelineDto) {
    const result = await this.analyticsService.getTimeline(
      user.id,
      query.startDate,
      query.endDate,
      query.interval,
      query.currency,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('dashboard/stats')
  async getDashboardStats(
    @CurrentUser() user: any,
    @Query() query: GetDashboardStatsDto,
  ) {
    const result = await this.analyticsService.getDashboardStats(
      user.id,
      query.days,
    );

    return {
      success: true,
      data: result,
    };
  }
}

