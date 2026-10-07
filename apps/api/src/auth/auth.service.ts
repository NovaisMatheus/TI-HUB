import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
  ) {}
  async user(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      include: {
        userRole_user: {
          include: {
            role: { include: { rolePermission_role: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user?.active) throw new UnauthorizedException('Sessão inválida.');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      theme:
        user.theme === 'light'
          ? ('light' as const)
          : user.theme === 'dark'
            ? ('dark' as const)
            : ('system' as const),
      permissions: [
        ...new Set(
          user.userRole_user.flatMap((r) =>
            r.role.rolePermission_role.map((p) => p.permission.key),
          ),
        ),
      ],
    };
  }
  async login(email: string, password: string) {
    const user = await this.db.user.findFirst({ where: { OR: [{ email }, { username: email }] } });
    if (!user?.active || !(await compare(password, user.passwordHash)))
      throw new UnauthorizedException('Usuário, e-mail ou senha inválidos.');
    return {
      token: await this.jwt.signAsync({ sub: user.id, version: user.sessionVersion }),
      user: await this.user(user.id),
    };
  }
}
