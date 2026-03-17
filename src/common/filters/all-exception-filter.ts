import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected server error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exceptionResponse;

    } else if (exception instanceof Error) {
      const error = exception as any;

      this.logger.error(`[${request.method}] ${request.url} - ${error.message}`, error.stack);

      // Catch specific MySQL error codes
      switch (error.code) {
        case 'ER_DUP_ENTRY':
          status = HttpStatus.CONFLICT; // 409
          message = 'Data already exists in the system (e.g., Email or Room Number is already taken).';
          break;
        case 'ER_ROW_IS_REFERENCED_2':
        case 'ER_NO_REFERENCED_ROW_2':
          status = HttpStatus.BAD_REQUEST; // 400
          message = 'Data integrity violation. Cannot proceed because the record is tied to other data (Foreign Key Constraint).';
          break;
        case 'ER_BAD_NULL_ERROR':
          status = HttpStatus.BAD_REQUEST;
          message = 'A required field is missing and cannot be null.';
          break;
        case 'ER_BAD_FIELD_ERROR':
          status = HttpStatus.INTERNAL_SERVER_ERROR; // 500
          message = 'Database query error (Invalid column name). Please contact the administrator.';
          break;
        default:
          message = 'Internal database or system error. Please try again later.';
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      method: request.method,
      message: message,
      timestamp: new Date().toISOString(),
    });
  }
}