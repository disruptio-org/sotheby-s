/** Every user-facing string produced by a client action, in one place (pt-PT). */

const quote = (value: string) => `«${value}»`;

export const messages = {
  errors: {
    nameRequired: 'O nome é obrigatório.',
    emailInvalid: 'É necessário um endereço de e-mail válido.',
    credentialsRequired: 'Introduza o e-mail e a palavra-passe.',
    passwordFieldsRequired: 'Preencha os três campos.',
    passwordTooShort: (min: number) =>
      `A nova palavra-passe tem de ter pelo menos ${min} caracteres.`,
    passwordMismatch: 'A confirmação não coincide com a nova palavra-passe.',
  },

  agentCreated: (name: string) => `Agente ${quote(name)} criado.`,
  agentUpdated: 'Agente atualizado.',
  agentDeleted: 'Agente eliminado.',
  agentPaused: (name: string) => `${quote(name)} pausado.`,
  agentResumed: (name: string) => `${quote(name)} ativado.`,
  confirmDeleteAgent: (name: string) =>
    `Eliminar o agente ${quote(name)}? Os workflows que o usam têm de ser reatribuídos primeiro.`,

  skillCreated: (name: string) => `Skill ${quote(name)} criada.`,
  skillUpdated: 'Skill atualizada.',
  skillDeleted: (workflows: number) =>
    workflows === 0
      ? 'Skill eliminada.'
      : `Skill eliminada e removida de ${workflows} workflow${workflows === 1 ? '' : 's'}.`,
  confirmDeleteSkill: (name: string) =>
    `Eliminar a skill ${quote(name)}? Será removida de todos os agentes e workflows.`,

  inviteSent: (email: string) => `Convite enviado para ${email}.`,
  inviteNotSent: (email: string) =>
    `A conta foi criada, mas o convite não chegou a ${email}. Reenvie o convite.`,
  inviteResendFailed: (email: string) =>
    `Não foi possível enviar o convite para ${email}. Tente novamente.`,
  inviteAccepted: 'Palavra-passe definida. Bem-vindo.',
  confirmResendInvitation: (name: string) =>
    `Enviar um novo convite a ${name}? A ligação anterior deixa de funcionar.`,
  userRoleChanged: (name: string, roleName: string) => `${name} é agora ${roleName}.`,
  userSuspended: (name: string) => `Conta de ${name} suspensa.`,
  userReactivated: (name: string) => `Conta de ${name} reativada.`,
  userDeleted: 'Utilizador eliminado.',
  confirmDeleteUser: (name: string) => `Eliminar ${name}? O acesso é revogado de imediato.`,
  confirmResetPassword: (name: string) =>
    `Gerar uma nova palavra-passe temporária para ${name}? As sessões abertas terminam de imediato.`,

  workflowCreated: 'Workflow criado — adicione os passos no canvas.',
  workflowUpdated: 'Workflow atualizado.',
  workflowDeleted: 'Workflow eliminado.',
  confirmDeleteWorkflow: (name: string) =>
    `Eliminar o workflow ${quote(name)}? O histórico de execuções é mantido.`,

  runQueued: (name: string) => `${quote(name)} em fila.`,
  runFinished: (name: string, steps: number) =>
    `${quote(name)} executado — ${steps} ${steps === 1 ? 'passo concluído.' : 'passos concluídos.'}`,
  runFailed: (name: string, detail: string) => `${quote(name)} falhou: ${detail}`,
  runCanceled: 'Execução cancelada.',

  roleCreated: 'Perfil criado — atribua as permissões abaixo.',
  roleUpdated: 'Perfil atualizado.',
  roleDeleted: 'Perfil eliminado.',
  roleLocked: 'O perfil de sistema está bloqueado e tem sempre todas as permissões.',
  permissionsSaved: 'Permissões guardadas. Quem tem este perfil terá de iniciar sessão novamente.',
  confirmDeleteRole: (name: string) => `Eliminar o perfil ${quote(name)}?`,

  keyStored: (provider: string) => `Chave de ${provider} guardada.`,
  keyCleared: (provider: string) => `Chave de ${provider} removida.`,
  keyVerified: (provider: string) => `Ligação a ${provider} verificada com sucesso.`,
  keyRejected: (provider: string, detail: string) => `${provider} recusou a chave: ${detail}`,
  settingsSaved: 'Definições guardadas.',
  passwordChanged: 'Palavra-passe alterada.',
} as const;
