import { allPermissions, permissionsFrom } from '@sothebys/domain';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/crypto.js';

const prisma = new PrismaClient();

/**
 * Development seed. Mirrors the content of the original design prototype, but
 * every record is real: passwords are hashed, skills carry instructions the
 * runner actually executes, and ids come from the database.
 */

const DEV_PASSWORD = process.env.SEED_PASSWORD ?? 'back-office-2026';

const KNOWLEDGE = [
  'Guia de Estilo da Marca.pdf',
  'Feed do Portefólio de Imóveis',
  'FAQ de Clientes.docx',
  'Tabela de Preços 2026.xlsx',
];

const TOOLS = ['Pesquisa Web', 'CRM', 'Base de Imóveis', 'E-mail', 'Calendário'];

const SKILLS = [
  {
    name: 'Descrição de Imóvel — PT & EN',
    cat: 'CONTENT' as const,
    desc: 'Texto editorial de listagem a partir da ficha do imóvel.',
    instr:
      'A partir da ficha de imóvel em contexto, escreve uma descrição editorial de listagem com 150 a 200 palavras em português de Portugal e, a seguir, a versão inglesa. Destaca localização, área, acabamentos e o argumento de venda principal. Não inventes características que não constem da ficha.',
  },
  {
    name: 'Tradução de Listagens',
    cat: 'CONTENT' as const,
    desc: 'Tradução EN ⇄ PT afinada ao tom da marca.',
    instr:
      'Traduz o texto em contexto entre português de Portugal e inglês, mantendo o registo sóbrio e editorial da marca. Preserva números, unidades e nomes próprios. Devolve apenas a tradução.',
  },
  {
    name: 'Resumo de Vendas Comparáveis',
    cat: 'ANALYSIS' as const,
    desc: 'Tabela de comparáveis e narrativa de preço por freguesia.',
    instr:
      'Com base nos dados em contexto, produz uma tabela markdown de vendas comparáveis (morada, área, preço, preço/m², data) seguida de dois parágrafos de análise sobre o posicionamento de preço. Assinala explicitamente quaisquer dados em falta.',
  },
  {
    name: 'Classificação de Leads',
    cat: 'CRM' as const,
    desc: 'Pontua contactos por orçamento, intenção e prazo.',
    instr:
      'Classifica o contacto descrito em contexto numa escala de 0 a 100, ponderando orçamento (40%), intenção de compra (35%) e prazo (25%). Devolve a pontuação, a justificação por eixo e a próxima ação recomendada.',
  },
  {
    name: 'Rascunho de E-mail ao Cliente',
    cat: 'COMMUNICATION' as const,
    desc: 'E-mails de seguimento personalizados, no tom da marca.',
    instr:
      'Redige um e-mail de seguimento em português de Portugal a partir do contexto. Máximo 180 palavras, tratamento formal, assunto incluído. Termina com uma proposta concreta de próximo passo.',
  },
  {
    name: 'Legendas e Alt Text de Fotografia',
    cat: 'MEDIA' as const,
    desc: 'Legendas editoriais para fotografia de imóveis.',
    instr:
      'Para cada fotografia descrita em contexto, escreve uma legenda editorial de uma linha e um texto alternativo acessível com menos de 125 caracteres. Devolve em lista numerada.',
  },
];

const AGENTS = [
  {
    name: 'Redator de Listagens',
    model: 'claude-sonnet-4-5',
    temp: 0.7,
    status: 'ACTIVE' as const,
    desc: 'Transforma fichas de imóveis em textos de listagem prontos a publicar, em ambas as línguas.',
    prompt:
      'Escreves para uma marca de imobiliário de luxo em Portugal. Tom: sóbrio, preciso, editorial. Nunca exageras nem inventas características.',
    skills: [0, 1, 5],
    knowledge: [0, 1],
    tools: [2],
    limitRuns: 200,
    limitBudgetCents: 15000,
  },
  {
    name: 'Concierge de Leads',
    model: 'claude-opus-4-1',
    temp: 0.3,
    status: 'ACTIVE' as const,
    desc: 'Qualifica contactos recebidos e redige a primeira resposta personalizada.',
    prompt:
      'És a primeira linha de contacto para pedidos de imóveis de alto valor. Respondes com discrição, rapidez e rigor factual.',
    skills: [3, 4],
    knowledge: [2],
    tools: [1, 3],
    limitRuns: 500,
    limitBudgetCents: 30000,
  },
  {
    name: 'Analista de Mercado',
    model: 'gpt-5',
    temp: 0.2,
    status: 'PAUSED' as const,
    desc: 'Prepara briefings semanais de preços e análises comparáveis por região.',
    prompt:
      'Produzes briefings de mercado concisos e fundamentados em dados. Distingues sempre facto de estimativa.',
    skills: [2, 4],
    knowledge: [1, 3],
    tools: [0, 2],
    limitRuns: 50,
    limitBudgetCents: 10000,
  },
];

const WORKFLOWS = [
  { name: 'Lançamento de Novo Imóvel', agent: 0, steps: [0, 1, 5, 4] },
  { name: 'Triagem de Leads', agent: 1, steps: [3, 4] },
  { name: 'Briefing Semanal de Mercado', agent: 2, steps: [2, 4] },
];

async function main(): Promise<void> {
  const [admin, manager, consultant] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'Administrador' },
      update: { permissions: allPermissions() },
      create: {
        name: 'Administrador',
        desc: 'Acesso sem restrições a todos os módulos e ações.',
        system: true,
        permissions: allPermissions(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'Gestor de Operações de IA' },
      update: {},
      create: {
        name: 'Gestor de Operações de IA',
        desc: 'Cria e executa agentes, skills e workflows. Apenas leitura em utilizadores.',
        system: false,
        permissions: permissionsFrom([
          'agents.view',
          'agents.create',
          'agents.edit',
          'agents.run',
          'agents.delete',
          'skills.view',
          'skills.create',
          'skills.edit',
          'skills.delete',
          'workflows.view',
          'workflows.create',
          'workflows.edit',
          'workflows.run',
          'workflows.delete',
          'apps.view',
          'users.view',
          'settings.view',
        ]),
      },
    }),
    prisma.role.upsert({
      where: { name: 'Consultor' },
      update: {},
      create: {
        name: 'Consultor',
        desc: 'Visibilidade só de leitura do património de IA. Sem administração.',
        system: false,
        permissions: permissionsFrom([
          'agents.view',
          'skills.view',
          'workflows.view',
          'apps.view',
        ]),
      },
    }),
  ]);

  const passwordHash = await hashPassword(DEV_PASSWORD);

  const users = [
    { name: 'Mariana Costa', email: 'mariana.costa@sothebysrealty.pt', roleId: admin.id, active: true },
    { name: 'Duarte Almeida', email: 'duarte.almeida@sothebysrealty.pt', roleId: manager.id, active: true },
    { name: 'Sofia Mendes', email: 'sofia.mendes@sothebysrealty.pt', roleId: consultant.id, active: true },
    { name: 'Ricardo Faria', email: 'ricardo.faria@sothebysrealty.pt', roleId: consultant.id, active: false },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, roleId: user.roleId },
      create: {
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        status: user.active ? 'ACTIVE' : 'INVITED',
        ...(user.active ? { passwordHash } : {}),
      },
    });
  }

  const knowledge = [];
  for (const name of KNOWLEDGE) {
    const existing = await prisma.knowledgeFile.findFirst({ where: { name } });
    knowledge.push(existing ?? (await prisma.knowledgeFile.create({ data: { name } })));
  }

  const tools = [];
  for (const name of TOOLS) {
    const existing = await prisma.toolIntegration.findFirst({ where: { name } });
    tools.push(existing ?? (await prisma.toolIntegration.create({ data: { name } })));
  }

  const skills = [];
  for (const skill of SKILLS) {
    const existing = await prisma.skill.findFirst({ where: { name: skill.name } });
    skills.push(
      existing
        ? await prisma.skill.update({ where: { id: existing.id }, data: skill })
        : await prisma.skill.create({ data: skill }),
    );
  }

  const agents = [];
  for (const agent of AGENTS) {
    const existing = await prisma.agent.findFirst({ where: { name: agent.name } });
    const data = {
      name: agent.name,
      model: agent.model,
      temp: agent.temp,
      status: agent.status,
      desc: agent.desc,
      prompt: agent.prompt,
      limitRuns: agent.limitRuns,
      limitBudgetCents: agent.limitBudgetCents,
    };

    const row = existing
      ? await prisma.agent.update({ where: { id: existing.id }, data })
      : await prisma.agent.create({ data });

    await prisma.agentSkill.deleteMany({ where: { agentId: row.id } });
    await prisma.agentKnowledge.deleteMany({ where: { agentId: row.id } });
    await prisma.agentTool.deleteMany({ where: { agentId: row.id } });

    await prisma.agentSkill.createMany({
      data: agent.skills.map((i) => ({ agentId: row.id, skillId: skills[i]!.id })),
    });
    await prisma.agentKnowledge.createMany({
      data: agent.knowledge.map((i) => ({ agentId: row.id, knowledgeFileId: knowledge[i]!.id })),
    });
    await prisma.agentTool.createMany({
      data: agent.tools.map((i) => ({ agentId: row.id, toolId: tools[i]!.id })),
    });

    agents.push(row);
  }

  for (const workflow of WORKFLOWS) {
    const existing = await prisma.workflow.findFirst({ where: { name: workflow.name } });
    const agentId = agents[workflow.agent]!.id;

    const row = existing
      ? await prisma.workflow.update({ where: { id: existing.id }, data: { agentId } })
      : await prisma.workflow.create({ data: { name: workflow.name, agentId } });

    await prisma.workflowStep.deleteMany({ where: { workflowId: row.id } });
    await prisma.workflowStep.createMany({
      data: workflow.steps.map((skillIndex, index) => ({
        workflowId: row.id,
        skillId: skills[skillIndex]!.id,
        index,
      })),
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      budgetCents: 75000,
      alertPct: 80,
      hardStop: true,
    },
  });

  console.log('Seed completo.');
  console.log(`  Utilizadores ativos: ${users.filter((u) => u.active).length}`);
  console.log(`  Palavra-passe de desenvolvimento: ${DEV_PASSWORD}`);
  console.log('  Ricardo Faria fica como convidado, sem palavra-passe.');
  console.log('  Nenhuma chave de API é semeada — configure-a em Definições.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
