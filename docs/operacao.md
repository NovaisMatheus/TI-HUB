# Operação do UGB TI Hub

## Começar a alimentar a base

1. Entre com sua conta de uso. Cadastre os demais usuários reais em Administração → Usuários e acessos, atribuindo Técnico ou Consulta conforme a função. Contas de teste antigas estão inativas.
2. Cadastre os setores reais em Equipamentos → Setores. Informe localização real; os setores da demonstração foram removidos.
3. Cadastre os equipamentos, patrimônio, serial, responsável, rede e hardware. Registre intervenções no equipamento para formar seu histórico.
4. Insira os POPs e descritivos realmente utilizados pela equipe. Confira conteúdo e requisitos antes de salvar; novas revisões criam versões.
5. Cadastre fornecedores e alimente requisições e processos na ordem da cadeia descrita na [especificação](especificacao-projeto.md). Não reutilize dados de exemplo como evidência de compra.
6. Na extensão 1Doc, configure uma credencial gerada pela sua própria conta. Coletar permite revisão; Salvar/Atualizar efetiva o registro. Os dois documentos reais já coletados foram preservados.
7. Cadastre sistemas com os endereços reais. Não há catálogo fictício ou links example.invalid na base operacional após a limpeza.

## Inicialização de uma instalação nova

Execute `pnpm setup:local`, revise `.env`, inicie PostgreSQL, aplique migrations e gere o Prisma Client conforme README. Antes do primeiro `pnpm db:seed`, preencha:

```dotenv
BOOTSTRAP_NAME=Nome da pessoa administradora
BOOTSTRAP_EMAIL=nome@instituicao.gov.br
BOOTSTRAP_USERNAME=nome.sobrenome
BOOTSTRAP_PASSWORD=defina-localmente-uma-senha-forte
HUB_DEMO_DATA=false
HUB_ALLOW_TEST_DATA=false
```

O bootstrap cria administrador apenas se não houver administrador ativo. Contas já existentes são preservadas. Após o primeiro cadastro, retire BOOTSTRAP_PASSWORD do ambiente e troque a senha em Meu perfil. Segredos não devem ser copiados para documentação, commits ou chats.

## Separar uso e homologação

A base de uso não deve receber fixtures. `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` não inserem registros fictícios.

Para testar fluxos HTTP, prepare **outra base e outra instância da API**. Habilite HUB_DEMO_DATA=true somente nessa instalação e execute seed. A API/URL usada pelos scripts deve apontar para essa base de homologação. Em um terminal de homologação, habilite explicitamente:

```powershell
$env:HUB_ALLOW_TEST_DATA = 'true'
pnpm test:smoke
pnpm test:chain
pnpm test:interface
pnpm test:1doc
pnpm test:chat
pnpm test:users
```

Esse sinalizador libera a execução; ele não seleciona ou isola o banco automaticamente. Alguns scripts usam localhost:3001 e outros o proxy localhost:5173. Não execute com a instância operacional nessas portas. Scripts HTTP criam registros e eventos de auditoria; alguns exigem as contas e o dataset de demonstração.

Na base operacional, `pnpm db:seed` padrão mantém permissões/administrador e não repovoa dados de demonstração. Não habilite HUB_DEMO_DATA nessa base.

## Backup e recuperação

Antes da limpeza de 07/10/2026 foi salvo um snapshot consistente em `.local/backups/antes-limpeza-2026-10-07T17-01-35-043Z.json`. O resumo está em `.local/backups/resultado-limpeza-20261007.json`. Ambos estão fora do Git.

O snapshot contém os registros escalares dos modelos Prisma, incluindo senhas em hash, dados pessoais e tokens criptografados. Não é um dump PostgreSQL de schema, migrations, permissões ou arquivos anexos. Para recuperar dados dessa limpeza, um mantenedor deve restaurar primeiro em uma base isolada, usando as migrations da versão correspondente e respeitando a ordem de chaves estrangeiras; conferir os registros desejados e só então planejar sua reinclusão. Não sobreponha a base já alimentada com registros reais.

Para uso institucional, disponibilize as ferramentas PostgreSQL de backup/restauração, estabeleça dumps regulares ou política equivalente administrada pelo banco e ensaie a restauração em outro ambiente. Faça backup separado e protegido de configurações/chave GOOGLE_CHAT_ENCRYPTION_KEY; tokens criptografados não podem ser recuperados sem ela. Defina retenção, acesso e responsável antes de produção.

## Diagnóstico habitual

| Sintoma                           | Verificação                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Não entra                         | Conta ativa, usuário/e-mail e senha; após troca, entrar novamente                                                        |
| Extensão deixou de salvar         | Hub/API disponíveis, URL correta, credencial válida e permissão demands.write; gerar nova credencial após troca de senha |
| Google lê mas não envia           | Configurar aplicativo na Google Chat API do mesmo projeto OAuth; consultar código/detalhe mostrado pelo Hub              |
| Relação não aparece no formulário | Cadastro anterior, perfil de acesso e limite atual de 100 opções; editor com pesquisa é evolução prevista                |
| Análise não conclui ATENDE        | Conferir todos os requisitos; pendências/divergências impedem essa conclusão                                             |
| Mudança de vínculo é recusada     | Preservação de evidência: criar novo registro quando processo/fornecedor/vínculos precisarem mudar                       |
| Campo aparece vazio               | Confirmar cadastro real e versões; a base não é preenchida com exemplos automaticamente                                  |

Após atualização, aplique migrations, gere o Prisma Client quando o schema mudar, execute verificações e reinicie a API. Mantenha o PostgreSQL ativo. Em produção, use infraestrutura homologada; os comandos locais e o Compose atual são uma base de desenvolvimento.
