import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
config({ quiet: true });
const db = new PrismaClient();
async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('Defina SEED_PASSWORD com pelo menos 12 caracteres.');
  const passwordHash = await hash(password, 12);
  const scopes = [
    'equipment',
    'maintenance',
    'knowledge',
    'acquisition',
    'analysis',
    'inspection',
    'documents',
    'systems',
    'demands',
  ];
  const keys = [
    ...scopes.flatMap((s) => [s + '.read', s + '.write']),
    'ai.read',
    'admin.audit.read',
  ];
  const roles = [
    ['ADMINISTRADOR', keys],
    ['TECNICO', keys.filter((k) => k !== 'admin.audit.read')],
    ['CONSULTA', keys.filter((k) => k.endsWith('.read') && k !== 'admin.audit.read')],
  ] as const;
  for (const [name, permissions] of roles) {
    const role = await db.role.upsert({ where: { name }, create: { name }, update: {} });
    for (const key of permissions) {
      const permission = await db.permission.upsert({
        where: { key },
        create: { key },
        update: {},
      });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
    const email = {
      ADMINISTRADOR: 'admin@hub.local',
      TECNICO: 'tecnico@hub.local',
      CONSULTA: 'consulta@hub.local',
    }[name];
    const user = await db.user.upsert({
      where: { email },
      create: {
        email,
        name: { ADMINISTRADOR: 'Alex Martins', TECNICO: 'Marina Costa', CONSULTA: 'Rafael Lima' }[
          name
        ],
        passwordHash,
      },
      update: {},
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
  }
  const user = await db.user.findUniqueOrThrow({ where: { email: 'admin@hub.local' } });
  if (await db.equipment.count()) {
    console.log('Seed já aplicado. Dados existentes preservados.');
    return;
  }
  const sectorNames = [
    'Financeiro',
    'Educação',
    'Saúde',
    'Administração',
    'Recursos Humanos',
    'Obras',
    'Tecnologia da Informação',
    'Gabinete',
  ];
  const departments = [];
  for (const [i, name] of sectorNames.entries())
    departments.push(
      await db.department.upsert({
        where: { name },
        create: { name, location: i % 2 ? 'Unidade descentralizada' : 'Paço Municipal' },
        update: {},
      }),
    );
  const equipment = [];
  for (let i = 0; i < 20; i++) {
    const dep = departments[i % 8];
    equipment.push(
      await db.equipment.create({
        data: {
          hostname:
            i === 0
              ? 'PC-FINANCEIRO-03'
              : `PC-${['FIN', 'EDU', 'SAU', 'ADM', 'RH', 'OBR', 'TI', 'GAB'][i % 8]}-${String(i + 1).padStart(2, '0')}`,
          assetTag: String(12345 + i).padStart(6, '0'),
          serial: `FICTICIO-2026-${i + 100}`,
          manufacturer: i % 2 ? 'Lenovo' : 'Dell',
          model: i % 2 ? 'ThinkCentre M70' : 'OptiPlex 7010',
          assignedUser: ['João Silva', 'Ana Oliveira', 'Paulo Santos', 'Beatriz Lima'][i % 4],
          departmentId: dep.id,
          status: i % 6 === 0 ? 'EM_MANUTENCAO' : 'OPERACIONAL',
          source: i % 3 === 0 ? 'GLPI_MOCK' : 'LOCAL',
          glpiId: i % 3 === 0 ? String(800 + i) : null,
          equipmentNetwork_equipment: {
            create: {
              ip: i === 0 ? '192.168.10.50' : `192.168.${10 + (i % 8)}.${51 + i}`,
              mac: `02:00:00:00:10:${String(i).padStart(2, '0')}`,
              vlan: String(10 + (i % 8)),
              gateway: `192.168.${10 + (i % 8)}.1`,
            },
          },
          equipmentHardware_equipment: {
            create: {
              cpu: 'Intel Core i5-12500',
              ram: '16 GB DDR4',
              storage: 'SSD NVMe 512 GB',
              os: 'Windows 11 Pro',
            },
          },
        },
      }),
    );
  }
  const problems = [
    'Lentidão e falha intermitente no SSD',
    'Impressora não reconhecida na rede',
    'Falha de autenticação no domínio',
    'Travamento ao abrir sistema financeiro',
    'Sem conexão após troca de porta',
  ];
  const maintenance = [];
  for (let i = 0; i < 30; i++)
    maintenance.push(
      await db.maintenanceRecord.create({
        data: {
          equipmentId: equipment[i % 20].id,
          technicianId: user.id,
          type: i % 3 === 0 ? 'TROCA_COMPONENTE' : 'DIAGNOSTICO',
          problem: problems[i % 5],
          diagnosis:
            i % 5 === 0
              ? 'SMART identificou setores defeituosos no SSD.'
              : 'Verificação de configuração e logs de eventos.',
          procedure:
            i % 5 === 0
              ? 'Backup validado; substituição do SSD e restauração do sistema.'
              : 'Revisão de configuração com o usuário.',
          solution:
            i % 5 === 0
              ? 'SSD substituído; desempenho normalizado.'
              : 'Configuração corrigida e validada.',
          components: i % 5 === 0 ? 'SSD NVMe 512 GB' : '',
          status: i % 4 === 0 ? 'ABERTA' : 'CONCLUIDA',
          occurredAt: new Date(Date.UTC(2026, 8, 5 + i)),
          maintenanceAction_record: {
            create: { description: 'Teste de funcionamento realizado presencialmente.' },
          },
        },
      }),
    );
  const popTitles = [
    'Diagnóstico de SSD',
    'Instalação de impressoras de rede',
    'Ingresso de estação no domínio',
    'Backup antes de manutenção',
    'Preparação de estação de trabalho',
    'Configuração de rede institucional',
    'Atendimento remoto autorizado',
    'Conferência de equipamento recebido',
    'Inventário e patrimônio',
    'Atualização de sistemas',
    'Registro de intervenção técnica',
    'Validação de conectividade',
  ];
  for (let i = 0; i < 12; i++)
    await db.knowledgeArticle.create({
      data: {
        code: `POP-${String(i + 1).padStart(3, '0')}`,
        title: popTitles[i],
        category: i % 2 ? 'Infraestrutura' : 'Suporte',
        tags: [i === 0 ? 'SSD' : 'Procedimento', 'TI'],
        authorId: user.id,
        status: 'VIGENTE',
        knowledgeArticleVersion_article: {
          create: {
            version: 1,
            authorId: user.id,
            content: `Objetivo: ${popTitles[i].toLowerCase()}.\n\n1. Confirmar a ocorrência com o solicitante e registrar o equipamento.\n2. Preservar dados e obter autorização para a intervenção.\n3. ${i === 0 ? 'Consultar indicadores SMART e testar leitura e gravação do SSD antes de formatar.' : 'Executar os passos de diagnóstico e registrar as evidências.'}\n4. Validar o resultado com o usuário e atualizar o histórico.\n\nResponsável: equipe UGB-TI. Documento fictício para desenvolvimento.`,
          },
        },
      },
    });
  for (let i = 0; i < 15; i++)
    await db.technicalRecommendation.create({
      data: {
        title:
          i === 0
            ? 'Verificar SSD antes de formatar'
            : `${['Validar backup', 'Documentar alterações de rede', 'Consultar logs antes de reinstalar', 'Confirmar versão do driver', 'Verificar fonte e energia'][i % 5]} · orientação ${i + 1}`,
        description:
          'Priorize diagnóstico registrado e preservação dos dados antes de substituir componentes.',
        authorId: user.id,
        category: 'Suporte',
        tags: ['Diagnóstico', 'SSD'],
        context: 'Estações apresentam lentidão recorrente após atualização.',
        justification: 'Casos anteriores apontaram falha física no armazenamento.',
        appliesWhen: 'Lentidão persistente ou alerta SMART.',
        doesNotApplyWhen: 'Incidentes confirmados de aplicação ou rede.',
        priority: i % 4 === 0 ? 'ATENCAO' : 'RECOMENDADO',
        maintenanceId: maintenance[i].id,
      },
    });
  for (let i = 0; i < 10; i++) {
    await db.knownSolution.create({
      data: {
        title: `${['Substituição de SSD defeituoso', 'Correção de DNS', 'Reinstalação de driver de impressão', 'Ajuste de perfil de usuário', 'Substituição de cabo de rede'][i % 5]} · caso ${i + 1}`,
        description: maintenance[i].solution,
        category: 'Suporte',
        tags: ['Caso resolvido'],
        maintenanceId: maintenance[i].id,
      },
    });
    await db.scriptEntry.create({
      data: {
        name: `${['Consultar discos', 'Consultar rede', 'Listar serviços', 'Consultar hostname', 'Consultar sistema'][i % 5]} · ${i + 1}`,
        description: 'Consulta local de diagnóstico. Revisar antes de usar fora do Hub.',
        language: 'PowerShell',
        category: 'Diagnóstico',
        code: [
          'Get-PhysicalDisk',
          'Get-NetIPConfiguration',
          'Get-Service',
          'hostname',
          'Get-ComputerInfo',
        ][i % 5],
        authorId: user.id,
      },
    });
  }
  const suppliers = [];
  for (let i = 0; i < 10; i++)
    suppliers.push(
      await db.supplier.create({
        data: {
          legalName: `Fornecedor Fictício ${i + 1} Tecnologia Ltda.`,
          tradeName: `${['Alvorada', 'Horizonte', 'Norte', 'Ponto', 'Via'][i % 5]} Tecnologia ${i + 1}`,
          cnpj: `00.000.000/000${i}-00`,
          phone: '(00) 0000-0000',
          email: `contato${i + 1}@example.invalid`,
          notes: 'Empresa e CNPJ fictícios para desenvolvimento.',
          supplierContact_supplier: {
            create: {
              name: 'Contato comercial fictício',
              email: `comercial${i}@example.invalid`,
              phone: '(00) 0000-0000',
            },
          },
        },
      }),
    );
  const specNames = [
    'Desktop padrão',
    'Notebook corporativo',
    'Monitor 24 polegadas',
    'Mouse USB',
    'Teclado ABNT2',
    'SSD NVMe',
    'Memória DDR4',
    'Impressora laser',
    'Switch gerenciável',
    'Access point',
    'Fonte ATX',
    'Nobreak',
  ];
  const versions = [];
  for (let i = 0; i < 12; i++) {
    const spec = await db.technicalSpecification.create({
      data: {
        code: `DT-${String(i + 1).padStart(3, '0')}`,
        name: specNames[i],
        category: i < 7 ? 'Hardware' : 'Infraestrutura',
        summary: `Padrão técnico institucional: ${specNames[i]}.`,
        responsibleId: user.id,
        specificationVersion_specification: {
          create: {
            version: 1,
            content: `${specNames[i]} com garantia mínima de 36 meses. Requisitos sujeitos à análise técnica manual.`,
            specificationRequirement_version: {
              create: [
                {
                  group: 'Garantia',
                  field: 'Prazo',
                  operator: '>=',
                  value: '36',
                  unit: 'meses',
                  valueType: 'numero',
                },
                {
                  group: 'Documentação',
                  field: 'Ficha técnica',
                  operator: '=',
                  value: 'Disponível',
                  unit: '',
                  valueType: 'texto',
                },
                {
                  group: 'Interfaces',
                  field: 'Portas USB 3.x',
                  operator: '>=',
                  value: '4',
                  unit: 'portas',
                  valueType: 'quantidade',
                },
                {
                  group: 'Armazenamento',
                  field: 'Velocidade de gravação SSD',
                  operator: '>=',
                  value: '1500',
                  unit: 'MB/s',
                  valueType: 'velocidade',
                },
              ],
            },
          },
        },
      },
    });
    versions.push(
      await db.specificationVersion.findFirstOrThrow({
        where: { specificationId: spec.id },
        include: { specificationRequirement_version: true },
      }),
    );
  }
  const requests = [];
  const requestItems = [];
  for (let i = 0; i < 10; i++) {
    const request = await db.purchaseRequest.create({
      data: {
        number: String(1042 + i),
        year: 2026,
        unit: 'Prefeitura Municipal',
        departmentId: departments[i % 8].id,
        responsibleId: user.id,
        object: `Aquisição de ${specNames[i].toLowerCase()}`,
        description: 'Renovação de infraestrutura para atendimento das unidades municipais.',
        purchaseRequestItem_request: {
          create: {
            description: specNames[i],
            quantity: 10 + i,
            specificationVersionId: versions[i].id,
          },
        },
      },
    });
    requests.push(request);
    requestItems.push(
      await db.purchaseRequestItem.findFirstOrThrow({ where: { requestId: request.id } }),
    );
  }
  const processes = [];
  for (let i = 0; i < 6; i++)
    processes.push(
      await db.purchaseProcess.create({
        data: {
          number: `PA-${String(86 + i).padStart(3, '0')}/2026`,
          title: requests[i].object,
          requestId: requests[i].id,
          responsibleId: user.id,
          status: i % 2 ? 'AGUARDANDO_ENTREGA' : 'EM_ANALISE',
        },
      }),
    );
  const proposalItems = [];
  for (let i = 0; i < 15; i++) {
    const p = i % 6;
    const proposal = await db.proposal.create({
      data: {
        processId: processes[p].id,
        supplierId: suppliers[i % 10].id,
        notes: 'Proposta fictícia aguardando avaliação da equipe.',
        proposalItem_proposal: {
          create: {
            requestItemId: requestItems[p].id,
            brand: ['Dell', 'Lenovo', 'HP'][i % 3],
            model: `Modelo Corporativo ${i + 1}`,
            manufacturer: 'Fabricante fictício',
            quantity: 10,
            price: 2450 + i * 100,
            offeredDescription:
              'Garantia de 36 meses; 3 portas USB 3.2; SSD NVMe 256 GB. Velocidade de gravação não informada.',
            manufacturerUrl: 'https://example.invalid/ficha-tecnica',
          },
        },
      },
    });
    proposalItems.push(
      await db.proposalItem.findFirstOrThrow({
        where: { proposalId: proposal.id },
        include: { proposal: true },
      }),
    );
  }
  for (let i = 0; i < 20; i++) {
    const item = proposalItems[i % 15],
      p = (i % 15) % 6;
    await db.technicalAnalysis.create({
      data: {
        processId: processes[p].id,
        proposalItemId: item.id,
        specificationVersionId: versions[p].id,
        technicianId: user.id,
        notes: 'Velocidade de gravação do SSD não informada na ficha técnica.',
        analysisRequirementResult_analysis: {
          create: versions[p].specificationRequirement_version.map((r, j) => ({
            requirementId: r.id,
            result: j === 2 ? 'DIVERGENCIA' : j === 3 ? 'PENDENTE' : 'ATENDE',
            offered:
              j === 2
                ? '3 portas USB 3.2'
                : j === 3
                  ? 'SSD NVMe 256 GB sem velocidades'
                  : 'Conforme ficha técnica',
            reason:
              j === 2
                ? 'Quantidade inferior ao mínimo exigido.'
                : j === 3
                  ? 'Velocidade de gravação não informada.'
                  : '',
          })),
        },
      },
    });
  }
  for (let i = 0; i < 8; i++) {
    const item = proposalItems[i],
      p = i % 6;
    const commitment = await db.commitment.create({
      data: {
        number: String(13232 + i),
        year: 2026,
        supplierId: item.proposal.supplierId,
        processId: processes[p].id,
        requestId: requests[p].id,
        status: 'AGUARDANDO_ENTREGA',
        commitmentItem_commitment: {
          create: { proposalItemId: item.id, quantity: 10, value: item.price },
        },
      },
    });
    const ci = await db.commitmentItem.findFirstOrThrow({ where: { commitmentId: commitment.id } });
    await db.technicalInspection.create({
      data: {
        commitmentId: commitment.id,
        technicianId: user.id,
        notes: 'Conferência inicial: aguardando comprovação de especificações.',
        inspectionItem_inspection: {
          create: {
            commitmentItemId: ci.id,
            deliveredDescription: 'Equipamento recebido com SSD 256 GB',
            verifiedCharacteristics: 'Marca e modelo conferidos; serial registrado.',
            divergences: 'Aguardando velocidade de gravação do SSD.',
            result: 'PENDENTE',
          },
        },
      },
    });
  }
  const events = [
    'Requisição recebida',
    'Descritivo validado',
    'Proposta recebida',
    'Análise técnica registrada',
    'Empenho registrado',
    'Entrega informada',
    'Conferência técnica iniciada',
    'Complementação documental solicitada',
  ];
  for (let i = 0; i < 50; i++) {
    const p = i % 6;
    await db.timelineEvent.create({
      data: {
        entityType: 'acquisitions',
        entityId: processes[p].id,
        processId: processes[p].id,
        eventType: 'SEED_TECHNICAL',
        occurredAt: new Date(Date.UTC(2026, 8, 2 + Math.floor(i / 6) * 4)),
        title: events[Math.floor(i / 6) % 8],
        description:
          'Evento fictício de rastreabilidade técnica; sem efeito no sistema administrativo.',
        supplierId: suppliers[p].id,
        userId: user.id,
      },
    });
  }
  const systemNames = [
    'GLPI',
    'Protocolo',
    'Portal de Serviços',
    'Gestão Financeira',
    'Folha de Pagamento',
    'Educação',
    'Saúde',
    'Patrimônio',
    'Compras',
    'Transparência',
    'Correio Institucional',
    'Documentação TI',
    'Diretório de Usuários',
    'Intranet',
    'Portal Municipal',
  ];
  for (const [i, name] of systemNames.entries())
    await db.systemEntry.create({
      data: {
        name,
        description: `Acesso ao sistema ${name}. Configure o endereço institucional antes de usar.`,
        url: `https://example.invalid/sistemas/${i}`,
        category: i % 2 ? 'Administrativo' : 'TI',
        responsible: 'Equipe de TI',
        environment: 'Documentação',
      },
    });
  for (const provider of ['glpi', 'google', 'ai', 'remote'])
    await db.integrationConfiguration.create({ data: { provider, mode: 'MOCK' } });
  await db.documentReference.create({
    data: {
      title: 'Ficha técnica de exemplo',
      provider: 'URL',
      url: 'https://example.invalid/ficha-tecnica',
      mimeType: 'application/pdf',
      description: 'Referência fictícia de desenvolvimento.',
      entityType: 'acquisitions',
      entityId: processes[0].id,
      createdById: user.id,
    },
  });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'SEED',
      entityType: 'system',
      entityId: 'initial',
      after: { dataset: 'fictitious-development' },
    },
  });
  console.log('Seed concluído: equipamentos, conhecimento e cadeia de aquisição relacionados.');
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
