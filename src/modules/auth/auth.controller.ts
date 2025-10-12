import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { COOKIE_CONFIG } from '../../config/constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    
    // Set cookies
    response.cookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, result.accessToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    });
    
    response.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, result.refreshToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    });
    
    return {
      success: true,
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    
    // Set cookies
    response.cookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, result.accessToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    });
    
    response.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, result.refreshToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    });
    
    return {
      success: true,
      data: result,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    
    // Update cookies with new tokens
    response.cookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, result.accessToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    });
    
    response.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, result.refreshToken, {
      ...COOKIE_CONFIG.OPTIONS,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    });
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@CurrentUser() user: any) {
    const result = await this.authService.getCurrentUser(user.id);
    return {
      success: true,
      data: {
        user: result,
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear cookies
    response.clearCookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, COOKIE_CONFIG.OPTIONS);
    response.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, COOKIE_CONFIG.OPTIONS);
    
    const result = await this.authService.logout();
    return result;
  }
}

