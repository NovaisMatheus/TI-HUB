import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { SessionUser } from '@hub/types';
import { AuthService } from './auth.service';
export interface AuthRequest extends Request {
  user: SessionUser;
}
export const Public = () => SetMetadata('public', true);
export const Permission = (key: string) => SetMetadata('permission', key);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.hub_session;
    if (!token) throw new UnauthorizedException('Entre para continuar.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      request.user = await this.auth.user(payload.sub);
    } catch {
      throw new UnauthorizedException('Sua sessão expirou.');
    }
    if (
      request.method !== 'GET' &&
      request.headers.origin &&
      request.headers.origin !== process.env.CORS_ORIGIN
    )
      throw new ForbiddenException('Origem não permitida.');
    const key = this.reflector.getAllAndOverride<string>('permission', [
      context.getHandler(),
      context.getClass(),
    ]);
    const scope = key?.split('.')[0];
    const required = key
      ? [
          key,
          ...(key.endsWith('.write') ? [scope + '.read'] : []),
          ...(scope === 'analysis' || scope === 'inspection'
            ? ['acquisition.read']
            : scope === 'maintenance'
              ? ['equipment.read']
              : []),
        ]
      : [];
    if (!required.every((permission) => request.user.permissions.includes(permission)))
      throw new ForbiddenException('Você não tem permissão para esta operação.');
    return true;
  }
}
