import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { WinstonLoggerService } from '../../utils/logger.service';

export class AppException extends HttpException {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any,
  ) {
    super({ code, message, details }, statusCode);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    };

    if (exception instanceof AppException) {
      status = exception.statusCode;
      errorResponse = {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details && { details: exception.details }),
        },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          success: false,
          error: {
            code: exceptionResponse.code || exceptionResponse.error || 'BAD_REQUEST',
            message: exceptionResponse.message || exception.message,
            ...(exceptionResponse.details && { details: exceptionResponse.details }),
          },
        };
      } else {
        errorResponse = {
          success: false,
          error: {
            code: 'HTTP_EXCEPTION',
            message: exceptionResponse || exception.message,
          },
        };
      }
    } else if (exception.name === 'ValidationError') {
      // Mongoose validation error
      status = HttpStatus.BAD_REQUEST;
      const fields: Record<string, string> = {};
      Object.keys(exception.errors || {}).forEach((key) => {
        fields[key] = exception.errors[key].message;
      });

      errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fields },
        },
      };
    } else if (exception.name === 'MongoServerError' && exception.code === 11000) {
      // MongoDB duplicate key error
      status = HttpStatus.CONFLICT;
      const field = Object.keys(exception.keyPattern || {})[0] || 'field';
      errorResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: `${field} already exists`,
          details: { field },
        },
      };
    } else if (exception.name === 'CastError') {
      // Mongoose cast error (invalid ObjectId)
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid ID format',
        },
      };
    }

    // Log the error
    this.logger.error(
      `Error occurred: ${exception.message || exception}`,
      exception.stack,
      'ExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }
}

