import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { SystemLogsService } from '../../modules/system-logs/system-logs.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logsService: SystemLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const user = request.user;
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    // console.log('LoggingInterceptor', user, method, url);

    return next.handle().pipe(
      tap(() => {
        const userId = user?.sub || user?.id;
        void this.logsService.create({
          userId: userId,
          action: `${method} ${url}`,
          ip: ip,
          userAgent: userAgent,
          description: `SUCCESS - status: ${response.statusCode}`,
        });
      }),

      catchError((err) => {
        const userId = user?.sub || user?.id;
        void this.logsService.create({
          userId: userId,
          action: `${method} ${url}`,
          ip: ip,
          userAgent: userAgent,
          description: `ERROR - ${err.message}`,
        });

        return throwError(() => err);
      }),
    );
  }
}
