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
import { createHash } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
export interface AuthRequest extends Request {
  user: SessionUser;
}
export const Public = () => SetMetadata('public', true);
export const Permission = (key: string) => SetMetadata('permission', key);
export const ExtensionAllowed = () => SetMetadata('extensionAllowed', true);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly db: PrismaService,
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
    const extensionToken = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : undefined;
    const token =
      extensionToken ?? (request.cookies as Record<string, string> | undefined)?.hub_session;
    if (!token) throw new UnauthorizedException('Entre para continuar.');
    try {
      if (extensionToken) {
        if (
          !this.reflector.getAllAndOverride<boolean>('extensionAllowed', [
            context.getHandler(),
            context.getClass(),
          ])
        )
          throw new UnauthorizedException();
        const credential = await this.db.extensionCredential.findUnique({
          where: { tokenHash: createHash('sha256').update(token).digest('hex') },
        });
        if (!credential || credential.revokedAt || credential.expiresAt <= new Date())
          throw new UnauthorizedException();
        request.user = await this.auth.user(credential.userId);
      } else {
        const payload = await this.jwt.verifyAsync<{ sub: string; version?: number }>(token);
        const account = await this.db.user.findUnique({
          where: { id: payload.sub },
          select: { sessionVersion: true },
        });
        if (!account || account.sessionVersion !== (payload.version ?? 0))
          throw new UnauthorizedException();
        request.user = await this.auth.user(payload.sub);
      }
    } catch {
      throw new UnauthorizedException('Sua sessão expirou.');
    }
    if (
      request.method !== 'GET' &&
      !extensionToken &&
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
