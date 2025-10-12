import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from '../filters/http-exception.filter';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new AppException(401, 'TOKEN_EXPIRED', 'Token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new AppException(401, 'INVALID_TOKEN', 'Invalid token');
      }
      throw new AppException(401, 'UNAUTHORIZED', 'No token provided');
    }
    return user;
  }
}

