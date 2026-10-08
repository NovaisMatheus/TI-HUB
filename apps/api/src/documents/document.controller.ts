import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthRequest, ExtensionAllowed, Permission } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { canAccess } from '../resources/access';
import { DocumentService } from './document.service';

@Controller()
export class DocumentController {
  constructor(
    private readonly db: PrismaService,
    private readonly files: DocumentService,
  ) {}
  @ExtensionAllowed()
  @Permission('demands.write')
  @Post('extension/documents')
  upload(@Body() input: unknown, @Req() req: AuthRequest) {
    return this.files.upload(input, req.user.id);
  }

  @Permission('documents.read')
  @Get('documents/:id/file')
  async download(@Param('id') id: string, @Req() req: AuthRequest, @Res() res: Response) {
    const reference = await this.db.documentReference.findUniqueOrThrow({
      where: { id },
      include: { file: true },
    });
    if (!canAccess(reference.entityType, req.user))
      throw new ForbiddenException('Acesso não permitido.');
    if (!reference.file)
      throw new NotFoundException(
        'Arquivo ainda não copiado; atualize a coleta ou anexe o arquivo.',
      );
    res.setHeader('Content-Type', reference.file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(reference.file.name)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(Buffer.from(reference.file.data));
  }

  @Permission('documents.write')
  @Post('documents/:id/upload')
  async attach(@Param('id') id: string, @Body() input: unknown, @Req() req: AuthRequest) {
    const reference = await this.db.documentReference.findUniqueOrThrow({ where: { id } });
    if (!canAccess(reference.entityType, req.user, true))
      throw new ForbiddenException('Acesso não permitido.');
    const result = await this.files.upload(input, req.user.id);
    await this.db.$transaction(async (tx) => {
      await tx.documentReference.update({ where: { id }, data: { fileId: result.fileId } });
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ATTACH_FILE',
          entityType: 'documents',
          entityId: id,
          after: result,
        },
      });
    });
    return result;
  }
}
