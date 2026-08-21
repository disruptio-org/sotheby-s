/** Every user-facing string produced by an action, in one place (pt-PT). */

const quote = (value: string) => `«${value}»`;

export const messages = {
  errors: {
    nameRequired: 'O nome é obrigatório.',
    emailInvalid: 'É necessário um endereço de e-mail válido.',
  },

  agentQueued: (name: string, model: string) => `Teste de ${quote(name)} em fila no ${model}.`,
  agentCreated: (name: string) => `Agente ${quote(name)} criado.`,
  agentUpdated: 'Agente atualizado.',
  agentDeleted: 'Agente eliminado.',
  confirmDeleteAgent: (name: string) =>
    `Eliminar o agente ${quote(name)}? Os workflows que o usam ficarão sem agente.`,

  skillCreated: (name: string) => `Skill ${quote(name)} criada.`,
  skillUpdated: 'Skill atualizada.',
  skillDeleted: 'Skill eliminada.',
  confirmDeleteSkill: (name: string) =>
    `Eliminar a skill ${quote(name)}? Será removida de todos os agentes e workflows.`,

  inviteSent: (email: string) => `Convite enviado para ${email}.`,
  userRoleChanged: (name: string, roleName: string) => `${name} é agora ${roleName}.`,
  passwordResetSent: (email: string) =>
    `Ligação de reposição de palavra-passe enviada para ${email}.`,
  userSuspended: (name: string) => `Conta de ${name} suspensa.`,
  userReactivated: (name: string) => `Conta de ${name} reativada.`,
  userDeleted: 'Utilizador eliminado.',
  confirmDeleteUser: (name: string) => `Eliminar ${name}? O acesso é revogado de imediato.`,

  workflowCreated: 'Workflow criado — adicione os passos no canvas.',
  workflowNeedsStep: 'Adicione pelo menos um passo primeiro.',
  workflowFinished: (name: string, steps: number) =>
    `${quote(name)} executado — ${steps} ${steps === 1 ? 'passo concluído.' : 'passos concluídos.'}`,
  workflowDeleted: 'Workflow eliminado.',
  confirmDeleteWorkflow: (name: string) => `Eliminar o workflow ${quote(name)}?`,

  roleCreated: 'Perfil criado — atribua as permissões abaixo.',
  roleUpdated: 'Perfil atualizado.',
  roleDeleted: 'Perfil eliminado.',
  roleLocked: 'O perfil Administrador está bloqueado e tem sempre todas as permissões.',
  roleReassignFirst: (count: number) =>
    count === 1
      ? 'Reatribua primeiro o utilizador deste perfil.'
      : `Reatribua primeiro os ${count} utilizadores deste perfil.`,
  confirmDeleteRole: (name: string) => `Eliminar o perfil ${quote(name)}?`,

  keyVerified: (provider: string) => `Ligação a ${provider} verificada com sucesso.`,
  settingsSaved: 'Definições guardadas.',
} as const;
