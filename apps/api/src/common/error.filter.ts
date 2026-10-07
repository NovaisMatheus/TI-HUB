import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const status = error.code === 'P2002' ? 409 : error.code === 'P2025' ? 404 : 400;
      response.status(status).json({
        message:
          error.code === 'P2002'
            ? 'Já existe um registro com esse identificador.'
            : 'Não foi possível salvar. Verifique os vínculos e campos.',
      });
      return;
    }
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request_failed',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    response.status(500).json({ message: 'Falha interna. Consulte o log do serviço.' });
  }
}
