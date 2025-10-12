import { Controller, Post, Get, Body, Query, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { GetConversionsDto } from './dto/get-conversions.dto';

@Controller('conversions')
@UseGuards(JwtAuthGuard)
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConversion(
    @CurrentUser() user: any,
    @Body() createConversionDto: CreateConversionDto,
  ) {
    const conversion = await this.conversionsService.createConversion(
      user.id,
      createConversionDto,
    );

    return {
      success: true,
      data: conversion,
    };
  }

  @Get()
  async getConversions(
    @CurrentUser() user: any,
    @Query() query: GetConversionsDto,
  ) {
    const result = await this.conversionsService.getConversions(user.id, query);

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  async getConversionById(@CurrentUser() user: any, @Param('id') id: string) {
    const conversion = await this.conversionsService.getConversionById(id, user.id);

    return {
      success: true,
      data: conversion,
    };
  }
}

