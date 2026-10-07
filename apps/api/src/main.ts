import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { json as expressJson } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { ErrorFilter } from './common/error.filter';
import { allowedOrigins } from './common/origins';
import type { Request, Response, NextFunction } from 'express';
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
config({ quiet: true });
async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres.');
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'], bodyParser: false });
  app.use('/api/imports/1doc', expressJson({ limit: '5mb' }));
  app.use(expressJson());
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const started = Date.now();
    response.on('finish', () => {
      console.log(
        JSON.stringify({
          level:
            response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
          event: 'http_request',
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Date.now() - started,
        }),
      );
    });
    next();
  });
  app.use(cookieParser());
  app.enableCors({ origin: allowedOrigins(), credentials: true });
  app.use(
    '/api/auth/login',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 240, standardHeaders: true, legacyHeaders: false }),
  );
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), process.env.API_HOST ?? '127.0.0.1');
  console.log(
    JSON.stringify({ level: 'info', event: 'api_ready', port: Number(process.env.PORT ?? 3001) }),
  );
}
bootstrap().catch((error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'startup_failed',
      message: error instanceof Error ? error.message : 'Falha',
    }),
  );
  process.exit(1);
});
