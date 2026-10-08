# HTTPS do TI Hub na rede local

O gateway HTTPS está em **https://ti-hub.192-168-10-9.sslip.io**, porta 443, no IP 192.168.10.9. Também atende **https://192.168.10.9**. A regra do Windows permite conexões da rede 192.168.0.0/16. A API e o PostgreSQL continuam em loopback; o gateway encaminha frontend, API e WebSocket do Vite.

O nome utiliza um domínio de desenvolvimento e é mapeado localmente no arquivo hosts. Não exige criar uma zona DNS institucional e não publica o Hub na internet. Cada PC precisa executar o configurador. O acesso por IP serve para o Hub, mas o OAuth do Google utiliza o nome HTTPS.

## Preparar cada computador cliente

1. Abra o Hub por HTTP em `http://192.168.10.9:5173` e vá a **Meu perfil → Acesso HTTPS na rede → Baixar configurador HTTPS deste PC**. Também é possível baixar diretamente `http://192.168.10.9:5173/downloads/instalar-acesso-ti-hub.ps1`.
2. Abra PowerShell **como administrador** e execute o arquivo baixado. Para a pasta Downloads padrão:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\instalar-acesso-ti-hub.ps1"
```

3. O script adiciona `192.168.10.9 ti-hub.192-168-10-9.sslip.io` ao hosts, preserva cópia do arquivo anterior e instala a CA pública do Hub no repositório de confiança do Windows. Se o nome já apontar para outro IP, ele interrompe para revisão.
4. Reinicie o navegador e abra **https://ti-hub.192-168-10-9.sslip.io**. Entre novamente; a sessão do endereço HTTP anterior não é compartilhada com esse nome.
5. Configure a extensão Chrome com esse mesmo endereço HTTPS e sua credencial. A chave privada do certificado nunca é distribuída pelo configurador.

O configurador instala uma autoridade certificadora **local**, não um certificado emitido por uma autoridade pública. Confirme que está usando o arquivo fornecido pelo servidor TI Hub. A impressão SHA-256 da CA nesta instalação é `E4:20:40:6B:34:0E:B5:AB:BD:93:53:32:EA:A3:46:85:83:3E:C8:66:D7:33:A0:AD:BB:AD:54:87:26:EB:36:0D`. Se a CA for renovada, atualize esse registro e redistribua sua confiança. Navegadores que usam repositório próprio podem precisar importar a CA pública manualmente.

## Concluir Google Chat

No **Google Cloud → APIs e serviços → Credenciais → cliente OAuth Web existente**, adicione exatamente este URI em **URIs de redirecionamento autorizados** e salve:

```text
https://ti-hub.192-168-10-9.sslip.io/api/chat/google/callback
```

O `.env` operacional já aponta para esse retorno. Entre no Hub pelo nome HTTPS para conectar o Google Chat; usar o IP inicia a orientação para mudar de endereço. O cadastro no Google Cloud e o consentimento real pelo usuário ainda precisam ser concluídos. Caso o console exija validação de propriedade do domínio para essa configuração ou publicação, será necessário usar um domínio administrado pela organização. Este nome de desenvolvimento não transfere sua propriedade à prefeitura.

Consulte as [regras do Google para callbacks OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#redirect-uri-validation). Não compartilhe o segredo OAuth nem a chave de criptografia. Conexões existentes ficam vinculadas aos mesmos usuários; mudar o retorno não altera as chaves que criptografam os tokens.

## Inicialização e manutenção do servidor

`pnpm dev` inicia API, frontend e o gateway HTTPS quando existe `.local/tls/config.json`. Mantenha o PostgreSQL e esse comando ativos. Para outra instalação Windows:

```powershell
pnpm https:prepare
# Como administrador, executar scripts/configurar-rede-local.ps1.
pnpm dev
```

Na instalação nova, antes de iniciar a API, inclua as origens HTTPS no `.env` e defina o retorno Google correspondente:

```dotenv
CORS_ORIGIN=https://ti-hub.192-168-10-9.sslip.io
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.10.9:5173,https://192.168.10.9
GOOGLE_CHAT_REDIRECT_URI=https://ti-hub.192-168-10-9.sslip.io/api/chat/google/callback
```

O preparo preserva certificados existentes. A senha do PFX e a configuração ficam em `.local/tls`, com ACL restrita ao usuário do servidor, SYSTEM e Administradores; não entram no Git. A chave privada da CA fica no repositório pessoal do Windows e não é exportável. Os downloads contêm somente a CA pública e o configurador. Proteja o perfil do Windows e os backups do PFX; não envie esses arquivos a clientes.

O certificado do servidor vence em **07/10/2027**; a CA vence em **07/10/2031**. Planeje a renovação antes dessas datas. O script não implementa renovação automática. Reemissão deve preservar a CA ou redistribuir a nova confiança e atualizar o PFX/configuração antes de reiniciar o gateway. A mudança do IP exige revisar SAN do certificado, hosts dos clientes, firewall, CORS e retorno OAuth.

Para desinstalar o acesso de um cliente, remova apenas a linha identificada `UGB TI Hub HTTPS interno` do hosts e a CA `UGB TI Hub - CA da rede local` do repositório de autoridades confiáveis do Windows, conferindo a impressão do certificado. A implantação com domínio institucional e certificado público continua sendo a opção para eliminar a instalação por PC.
