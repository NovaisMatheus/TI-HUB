import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export class SecretVault {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('A chave de criptografia deve ter 32 bytes.');
  }
  encrypt(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join('.');
  }
  decrypt(envelope: string) {
    const [iv, tag, encrypted] = envelope.split('.').map((v) => Buffer.from(v, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
