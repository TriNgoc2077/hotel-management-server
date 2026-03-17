import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exception-filter';
import { TransformInterceptor } from './common/interceptors/transform-interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.useGlobalFilters(new AllExceptionsFilter());

  const reflector = app.get(Reflector);
  // app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  const allowedOrigins = configService.get<string>('ORIGIN')?.split(',') || [];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // Config Versioning
  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  }); // api/v

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
  }); //1

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
