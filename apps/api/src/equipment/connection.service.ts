import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import { PrismaService } from '../common/prisma.service';
const execute = promisify(execFile);
@Injectable()
export class ConnectionService {
  constructor(private readonly db: PrismaService) {}
  async test(id: string, userId: string) {
    const equipment = await this.db.equipment.findUnique({
      where: { id },
      include: { equipmentNetwork_equipment: true },
    });
    if (!equipment) throw new NotFoundException('Equipamento não encontrado.');
    const warning =
      'A ausência de resposta não significa necessariamente que o equipamento esteja desligado, pois ICMP pode estar bloqueado.';
    if (process.env.ENABLE_CONNECTION_TEST !== 'true')
      return {
        mode: 'DISABLED',
        message: `Teste real desativado. Nenhum pacote ICMP foi enviado. ${warning}`,
      };
    const ip = equipment.equipmentNetwork_equipment?.ip;
    if (!ip || isIP(ip) !== 4 || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip))
      throw new BadRequestException('Teste limitado a endereços IPv4 de rede privada cadastrados.');
    const started = Date.now();
    let responding = false;
    let latencyMs: number | undefined;
    try {
      const { stdout } = await execute(
        'ping',
        process.platform === 'win32' ? ['-n', '1', '-w', '2000', ip] : ['-c', '1', '-W', '2', ip],
        { timeout: 3500, windowsHide: true, maxBuffer: 8192 },
      );
      const match = stdout.match(/(?:time|tempo)[=<]\s*(\d+(?:\.\d+)?)\s*ms/i);
      responding = !!match;
      latencyMs = match ? Number(match[1]) : undefined;
    } catch {
      responding = false;
    }
    await this.db.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_CONNECTION_TEST',
        entityType: 'equipment',
        entityId: id,
        after: { ip, responding, durationMs: Date.now() - started },
      },
    });
    return {
      mode: 'MANUAL',
      host: equipment.hostname,
      ip,
      responding,
      latencyMs,
      message: `${responding ? `Respondendo · Latência: ${latencyMs ?? 'n/d'} ms` : 'Sem resposta'}. ${warning}`,
    };
  }
}
