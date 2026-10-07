import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthRequest, Public } from './auth.guard';
import { validate } from '../common/validation';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
    @Req() request: AuthRequest,
  ) {
    const data = validate(
      z
        .object({
          email: z
            .string()
            .trim()
            .min(2)
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(1).max(256),
        })
        .strict(),
      body,
    );
    const session = await this.auth.login(data.email, data.password);
    response.cookie('hub_session', session.token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production' || request.headers['x-forwarded-proto'] === 'https',
      sameSite: 'strict',
      maxAge: 8 * 3600000,
      path: '/api',
    });
    return session.user;
  }
  @Get('me') me(@Req() req: AuthRequest) {
    return this.auth.user(req.user.id);
  }
  @Post('logout') logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('hub_session', { path: '/api' });
    return { success: true };
  }
}
