# Chat lateral e Google Chat

O painel **Troca de ideias** fica à direita do Hub, acompanha a navegação e pode ser recolhido pelo ícone no cabeçalho. Nas telas grandes, começa aberto e reserva espaço para o conteúdo; nas menores, abre sobre a página. Escape recolhe o painel quando o foco está nele.

**Equipe Hub** é uma conversa persistente compartilhada entre usuários com `chat.read`. Administradores e técnicos podem enviar com `chat.write`; Consulta tem somente leitura. A atualização ocorre a cada cinco segundos enquanto o painel está aberto. Há paginação de mensagens anteriores, texto de até 4.000 caracteres e envio por botão ou Ctrl+Enter. Falhas mantêm o rascunho; repetir o mesmo envio utiliza uma chave para evitar duplicação.

**Google Chat** usa autorização individual OAuth, lista os espaços acessíveis à conta conectada, mostra mensagens e envia texto como essa conta. Não há replicação automática entre a conversa Equipe Hub e os espaços Google. Mensagens do Google são consultadas diretamente e não são armazenadas no histórico local nem enviadas ao assistente. Cartões/anexos são indicados para consulta no Google Chat; não há upload de arquivos, edição/exclusão de mensagens, bot, notificações de demandas ou associação a uma thread por demanda nesta versão.

## Ativar Google Chat

1. Crie ou selecione um projeto da organização no Google Cloud e habilite **Google Chat API**. Configure o aplicativo e a tela de consentimento OAuth conforme as políticas da organização.
2. Crie credenciais OAuth do tipo **Aplicativo da Web**. Cadastre exatamente este URI de redirecionamento para desenvolvimento: `http://localhost:5173/api/chat/google/callback`.
3. Solicite os escopos `chat.spaces.readonly`, `chat.messages.readonly` e `chat.messages.create`, todos sob `https://www.googleapis.com/auth/`. Configure usuários de teste/visibilidade ou publicação interna conforme o projeto. A disponibilidade e autorização dependem da conta e das políticas do Google Workspace.
4. Preencha no arquivo `.env` local, sem compartilhar segredos em chats:

```dotenv
GOOGLE_CHAT_CLIENT_ID=seu-client-id
GOOGLE_CHAT_CLIENT_SECRET=seu-client-secret
GOOGLE_CHAT_REDIRECT_URI=http://localhost:5173/api/chat/google/callback
GOOGLE_CHAT_ENCRYPTION_KEY=chave-aleatoria-de-32-bytes-em-64-caracteres-hexadecimais
```

5. Reinicie a API. No painel à direita, abra **Google Chat → Conectar Google Chat**, escolha a conta e autorize os três escopos. Depois selecione o espaço para conversar.

Em produção, use HTTPS e o URI correspondente ao domínio do Hub, encaminhando `/api` ao backend. `CORS_ORIGIN` deve apontar para esse mesmo frontend. Tokens não são expostos ao navegador; ficam criptografados com AES-GCM no banco. Preserve a chave de criptografia em backup seguro. Trocar a chave invalida a leitura das conexões existentes e exige removê-las e autorizar novamente.

O OAuth usa estado aleatório de uso único, com dez minutos de validade e vínculo ao navegador por cookie HttpOnly/SameSite=Lax. O verificador PKCE é criptografado. A permissão do usuário é revalidada no retorno. **Desconectar conta** remove a conexão e autorizações pendentes do Hub; para revogar o consentimento também no Google, use a gestão de aplicativos da conta Google.

## Estado desta entrega

Chat interno validado por HTTP com PostgreSQL real. OAuth, armazenamento criptografado e encaminhamento à API Google verificados com respostas simuladas. A conexão Google não foi ativada porque as credenciais não estão configuradas, e não houve login/consentimento Google real. Sem configuração, a interface informa essa condição e não simula mensagens Google. A inspeção visual pelo navegador permanece indisponível pela política da ferramenta.

Referências: [autorização OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [autenticação do Chat](https://developers.google.com/workspace/chat/authenticate-authorize), [listagem de mensagens](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list) e [envio de mensagens](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/create).
