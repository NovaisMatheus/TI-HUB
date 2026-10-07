# Segurança

- Sessão JWT de oito horas em cookie HttpOnly/SameSite Strict; Secure em NODE_ENV=production. Usuário ativo e permissões são consultados a cada requisição. Desativar a conta revoga seu acesso mesmo com token ainda válido.
- Hash bcrypt com custo 12 no seed. JWT_SECRET é obrigatório com pelo menos 32 caracteres. Segredos locais são ignorados pelo Git.
- APIs privadas por padrão. Permission keys extensíveis; consulta não possui escrita. Auditoria requer admin.audit.read.
- Zod estrito, limites de texto, quantidades inteiras, URLs http/https e IP IPv4. Prisma parametriza acesso ao banco. React apresenta conteúdo como texto; não utiliza HTML bruto.
- CORS explícito, Helmet, rate limit de login e API. Escritas autenticadas rejeitam Origin diferente de CORS_ORIGIN. Clientes sem Origin continuam autorizados pela sessão; adotar proteção CSRF adicional caso a política de cookie ou topologia mude.
- Dados técnicos, auditoria e eventos de processo persistem em transações. Nenhuma IA altera entidades ou executa ferramentas.
- Logs estruturados não incluem corpo, passwordHash, token, cookie ou chave. AuditLog armazena estados de entidades operacionais, sem tabelas de credenciais.
- Teste de rede manual, desativado por padrão, limitado a endereço IPv4 privado cadastrado, argumentos separados sem shell, timeout e processo invisível no Windows.

## Antes da homologação

Gerência administrativa de usuários/roles e política granular de leitura ainda precisam de interface e testes adicionais. Validar a topologia real, proxy/TLS, CORS, limites e classificação de cada registro. Não habilitar providers externos antes de aplicar INSTITUTIONAL_ONLY e NO_AI a todo contexto enviado.

Preparar backup/restauração do PostgreSQL, retenção e integridade da auditoria, alertas operacionais, gerenciamento de segredos, desligamento de contas seed, scanning de dependências e testes de carga. Os containers fornecidos servem para desenvolvimento; não constituem homologação de segurança de produção.
