import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';
import { AuthRequest, Permission } from './auth.guard';

const role = z.enum(['ADMINISTRADOR', 'TECNICO', 'CONSULTA']);
const password = z
  .string()
  .min(12, 'Use pelo menos 12 caracteres.')
  .max(72, 'Use até 72 caracteres.')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'A senha excede 72 bytes.');
const account = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(
        /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
        'Use letras minúsculas, números, ponto, hífen ou sublinhado.',
      ),
    name: z.string().trim().min(2).max(150),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    role,
    active: z.boolean().default(true),
  })
  .strict();
const selection = {
  id: true,
  username: true,
  name: true,
  email: true,
  active: true,
  createdAt: true,
  userRole_user: { select: { role: { select: { name: true } } } },
} as const;

@Controller()
export class UsersController {
  constructor(private readonly db: PrismaService) {}
  @Get('users')
  @Permission('users.read')
  async list() {
    const users = await this.db.user.findMany({ select: selection, orderBy: { name: 'asc' } });
    return users.map(({ userRole_user, ...user }) => ({
      ...user,
      roles: userRole_user.map((r) => r.role.name),
    }));
  }
  @Post('users')
  @Permission('users.write')
  async create(@Body() body: unknown, @Req() req: AuthRequest) {
    const data = validate(account.extend({ password }), body);
    const passwordHash = await hash(data.password, 12);
    return this.db.$transaction(async (tx) => {
      const assigned = await tx.role.findUniqueOrThrow({ where: { name: data.role } });
      const user = await tx.user.create({
        data: {
          username: data.username,
          name: data.name,
          email: data.email,
          active: data.active,
          passwordHash,
          userRole_user: { create: { roleId: assigned.id } },
        },
        select: { id: true, username: true, name: true, email: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: user.id,
          after: { ...user, role: data.role },
        },
      });
      return user;
    });
  }
  @Patch('users/:id')
  @Permission('users.write')
  async update(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    const data = validate(account.extend({ password: password.optional() }), body);
    if (id === req.user.id && (!data.active || data.role !== 'ADMINISTRADOR'))
      throw new BadRequestException('Sua própria conta deve permanecer ativa e administradora.');
    const passwordHash = data.password ? await hash(data.password, 12) : undefined;
    return this.db.$transaction(async (tx) => {
      // Serialize administrator changes so concurrent requests cannot remove the last administrator.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(717024)`;
      const before = await tx.user.findUnique({ where: { id }, select: selection });
      if (!before) throw new NotFoundException('Usuário não encontrado.');
      if (
        before.active &&
        before.userRole_user.some((r) => r.role.name === 'ADMINISTRADOR') &&
        (!data.active || data.role !== 'ADMINISTRADOR')
      ) {
        const count = await tx.user.count({
          where: { active: true, userRole_user: { some: { role: { name: 'ADMINISTRADOR' } } } },
        });
        if (count <= 1)
          throw new BadRequestException('Mantenha pelo menos um administrador ativo.');
      }
      const assigned = await tx.role.findUniqueOrThrow({ where: { name: data.role } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId: assigned.id } });
      const user = await tx.user.update({
        where: { id },
        data: {
          username: data.username,
          name: data.name,
          email: data.email,
          active: data.active,
          ...(passwordHash ? { passwordHash } : {}),
          ...(passwordHash || before.active !== data.active
            ? { sessionVersion: { increment: 1 } }
            : {}),
        },
        select: { id: true, username: true, name: true, email: true, active: true },
      });
      if (!data.active || passwordHash) {
        await tx.extensionCredential.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.googleOAuthAttempt.deleteMany({ where: { userId: id } });
      }
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: id,
          before: {
            name: before.name,
            email: before.email,
            active: before.active,
            roles: before.userRole_user.map((r) => r.role.name),
          },
          after: { ...user, role: data.role, passwordChanged: !!passwordHash },
        },
      });
      return user;
    });
  }
  @Post('auth/password')
  async changePassword(@Body() body: unknown, @Req() req: AuthRequest) {
    const data = validate(
      z.object({ currentPassword: z.string().min(1).max(256), password }).strict(),
      body,
    );
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.id } });
    if (!(await compare(data.currentPassword, user.passwordHash)))
      throw new BadRequestException('Senha atual incorreta.');
    const passwordHash = await hash(data.password, 12);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.extensionCredential.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.googleOAuthAttempt.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({
        data: { userId: user.id, action: 'PASSWORD_CHANGE', entityType: 'User', entityId: user.id },
      });
    });
    return { success: true };
  }
}
