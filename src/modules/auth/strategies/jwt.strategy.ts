import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AppException } from '../../../common/filters/http-exception.filter';
import { COOKIE_CONFIG } from '../../../config/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from cookie
        (request: Request) => {
          return request?.cookies?.[COOKIE_CONFIG.ACCESS_TOKEN_NAME];
        },
        // Fallback to Authorization header (for backward compatibility)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: { userId: string; email: string }) {
    const user = await this.authService.validateUser(payload.userId);

    if (!user) {
      throw new AppException(401, 'UNAUTHORIZED', 'User not found');
    }

    return {
      id: payload.userId,
      email: payload.email,
    };
  }
}

