# Usuários e acessos

Entre com o usuário (por exemplo `nome.sobrenome`) ou e-mail. Ambos são normalizados para minúsculas. Novas contas são cadastradas em **Administração → Usuários e acessos**, com nome, usuário único, e-mail único, perfil e senha de 12 a 72 caracteres (limite de 72 bytes do bcrypt).

- **Administrador:** operação completa, auditoria e gestão de usuários.
- **Técnico:** operação dos módulos e escrita no chat, sem gestão de usuários e sem auditoria administrativa.
- **Consulta:** leitura dos módulos e do chat, sem alterar registros ou enviar mensagens.

Um administrador pode editar dados, redefinir a senha e ativar/desativar contas. Não pode remover seu próprio acesso administrativo ou desativar sua conta. A API também protege o último administrador ativo. Contas são desativadas para preservar a autoria e o histórico dos registros.

Cada usuário troca sua senha em **Meu perfil → Minha senha**, confirmando a senha atual. A troca invalida as sessões existentes e as credenciais da extensão 1Doc; entre novamente e gere outra credencial da extensão. A desativação também invalida sessões, impedindo sua reutilização após reativação. Os perfis são conferidos a cada requisição.

Senhas e hashes não são retornados na listagem nem incluídos na auditoria. Alterações cadastrais registram autor e dados modificados. Credenciais iniciais locais ficam em `.local`, fora do Git, e devem ser substituídas no primeiro uso. Não há envio de senhas por e-mail, recuperação automática ou cadastro público nesta versão.

`pnpm test:users` verifica cadastro, duplicidade, login por usuário/e-mail, restrições de acesso, troca de senha, invalidação de sessões e desativação via HTTP e banco local. A conta fictícia de QA criada pelo teste permanece inativa.
