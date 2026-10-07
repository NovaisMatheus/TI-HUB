import { afterEach, describe, expect, it, vi } from 'vitest';
import { allowedOrigins, originAllowed } from '../apps/api/src/common/origins';
import { requestId } from '../apps/web/src/services/request-id';
import { hubOrigin } from '../extensions/chrome-1doc/hub-url.js';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('Acesso LAN com origens explícitas', () => {
  it('permite localhost e LAN configurados, recusando outros endereços', () => {
    vi.stubEnv('CORS_ORIGIN', 'http://localhost:5173');
    vi.stubEnv('CORS_ORIGINS', 'http://127.0.0.1:5173, http://192.168.10.9:5173');
    expect(allowedOrigins()).toHaveLength(3);
    expect(originAllowed('http://192.168.10.9:5173')).toBe(true);
    expect(originAllowed('http://192.168.10.9:9999')).toBe(false);
    expect(originAllowed('https://example.invalid')).toBe(false);
  });
  it('recusa wildcard e caminhos na configuração de origem', () => {
    vi.stubEnv('CORS_ORIGINS', '*');
    expect(allowedOrigins).toThrow();
    vi.stubEnv('CORS_ORIGINS', 'http://192.168.10.9:5173/api');
    expect(allowedOrigins).toThrow();
  });
  it('gera UUID v4 criptográfico sem randomUUID no HTTP da rede', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1);
        return bytes;
      },
    });
    expect(requestId()).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
  });
  it('extensão aceita HTTP privado e recusa HTTP público ou URL com senha', () => {
    expect(hubOrigin('http://192.168.10.9:5173')).toBe('http://192.168.10.9:5173');
    expect(hubOrigin('http://10.1.2.3:5173')).toBe('http://10.1.2.3:5173');
    expect(hubOrigin('http://172.16.0.9:5173')).toBe('http://172.16.0.9:5173');
    expect(() => hubOrigin('http://172.11.0.9:5173')).toThrow();
    expect(() => hubOrigin('http://example.com:5173')).toThrow();
    expect(() => hubOrigin('http://name:password@192.168.10.9:5173')).toThrow();
  });
});
