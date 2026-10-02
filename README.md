# Vagou

> **Abra a Vagou e descubra onde tem vaga para estacionar.**

A Vagou é uma plataforma de **descoberta e visualização de disponibilidade de estacionamento**.
O motorista diz para onde vai e vê no mapa os estacionamentos próximos, quantas vagas estão livres,
preço, horário e entradas — e, quando o estacionamento tem mapa digital, as vagas livres por piso e setor.
Empresas (shoppings, edifícios, hospitais, operadores) digitalizam seus estacionamentos a partir da planta
e conectam fontes de ocupação.

A Vagou **não** é um marketplace de reservas: não há reserva, checkout ou pagamento pela plataforma.
A definição de produto completa está em [`docs/PRODUCT.md`](docs/PRODUCT.md) (fonte da verdade).

> **Status:** V1 — fluxos de motorista, empresa (incluindo Mapa Inteligente, operação e analytics) e admin implementados.

---

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript |
| UI | Tailwind CSS v4 com tokens próprios, componentes em `src/components/ui` (padrão shadcn, sem dependência extra), Lucide |
| Mapas | Leaflet + react-leaflet com tiles OpenStreetMap (carregados sob demanda) |
| Gráficos | Recharts |
| Banco | PostgreSQL via Drizzle ORM. Local: **PGlite** (PostgreSQL embutido, zero instalação). Produção: qualquer PostgreSQL/Supabase via `DATABASE_URL` |
| Auth | Sessões próprias em cookie httpOnly (token com hash SHA-256 no banco), senhas com scrypt, RBAC no servidor |
| Validação | Zod (cliente e servidor), React Hook Form |
| Testes | Vitest (unitários + integração com banco em memória) |

## Arquitetura

```
src/
  app/                 Rotas (UI). Páginas finas que chamam serviços.
  components/          Design system (ui/), layout, gráficos, marca
  modules/             Domínios — regras de negócio e acesso a dados
    auth/              sessão, RBAC, cadastro, recuperação de senha, privacidade (LGPD)
    facilities/        consultas públicas, horários, tarifas, isolamento por empresa, favoritos
    occupancy/         OccupancyProvider, simulação, eventos/snapshots, disponibilidade pública
    floorplans/        layout padrão, ParkingPlanAnalyzer (mock), rota demonstrativa
    search/            parâmetros e componentes da busca (lista + mapa sincronizados)
    geo/               distâncias, geocodificação local (gazetteer de SP)
    storage/           armazenamento de arquivos com validação por assinatura
  server/              db (schema, cliente), logger estruturado, erros, auditoria
scripts/               migrate, seed, gerador da planta de exemplo
drizzle/               migrations SQL
tests/                 unit/ e integration/
```

Camadas: **UI → serviços do módulo → regras puras (sem I/O, testadas) → acesso a dados (Drizzle) → banco/serviços externos.**
Toda autorização sensível é validada no servidor (layouts, server actions e route handlers).

### Modelo de dados

`Organization → Facility → Floor → Sector → ParkingSpace`, mais `FloorPlan`, `FloorPlanElement`,
`OccupancyEvent`, `OccupancySnapshot`, `ParkingRate`, `OperatingHours`, `FacilityEntrance`, `DataSource`,
e de apoio `User`, `Profile`, `OrganizationMember`, `Favorite`, `AuditLog`, `Notification`.
Ver `src/server/db/schema.ts` (FKs, índices, enums, constraints, timestamps).

### Ocupação

`OccupancyProvider` desacopla a origem dos dados da visualização:
- `SimulationOccupancyProvider` — **simulada**; usada quando não há fonte real. Sempre sinalizada como “simulado” (também na interface pública).
- `ManualOccupancyProvider` — **funcional**; operador altera o status das vagas.
- Câmeras, sensores, cancelas, sistemas de gestão e APIs — **preparados** (interface e registro; integração futura).

Mudanças de status geram `OccupancyEvent`; contagens periódicas viram `OccupancySnapshot`.
Dados antigos (>15 min; >3 h para contagem manual) aparecem como “Sem dados de ocupação”, nunca como atuais.

## Como rodar do zero

Pré-requisitos: **Node.js 20+** (testado com 24) e npm.

```bash
git clone <url-do-repositorio> vagou && cd vagou
npm install
cp .env.example .env.local
npm run db:seed      # aplica migrations e cria dados de demonstração
npm run dev          # http://localhost:3000
```

Sem `DATABASE_URL`, o banco é um PostgreSQL embutido (PGlite) salvo em `.data/pglite`.
Ele aceita **um processo por vez**: pare o `npm run dev` antes de rodar `db:seed`/`db:migrate`
(há uma trava que avisa se outro processo estiver usando o banco).

### Usando PostgreSQL / Supabase

```bash
DATABASE_URL=postgres://usuario:senha@host:5432/vagou npm run db:migrate
DATABASE_URL=... npm run db:seed   # opcional: dados de demonstração
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | testes (Vitest) |
| `npm run db:generate` | gera migration a partir do schema |
| `npm run db:migrate` | aplica migrations |
| `npm run db:seed` | migrations + dados de demonstração (apaga dados existentes) |
| `npm run db:reset` | apaga o banco embutido e recria com seed |

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Principais: `NEXT_PUBLIC_APP_URL`, `APP_SECRET`, `DATABASE_URL`,
`UPLOADS_DIR`, `PLAN_ANALYZER`, `NEXT_PUBLIC_DEMO_MODE`. Nenhum segredo é exposto ao frontend.

## Contas de demonstração (somente desenvolvimento)

Criadas pelo seed, senha **`Vagou@2026`** (configurável via `DEMO_PASSWORD`):

| Perfil | E-mail |
|---|---|
| Motorista | `motorista@vagou.demo` |
| Empresa (Aurora Shoppings) | `empresa@vagou.demo` |
| Empresa (EstaPark) | `operador@estapark.demo` |
| Admin Vagou | `admin@vagou.demo` |

Com `NEXT_PUBLIC_DEMO_MODE=true` (e fora de produção) a tela de login mostra atalhos para essas contas.
O seed se recusa a rodar com `NODE_ENV=production` (a menos que `ALLOW_DEMO_SEED=true`).
**Nunca** use essas credenciais em produção.

## Deploy

- Requer um PostgreSQL gerenciado (`DATABASE_URL`) — o banco embutido é apenas para desenvolvimento/demonstração.
- Rode `npm run db:migrate` no deploy; configure `APP_SECRET`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_DEMO_MODE=false`.
- Uploads usam disco local (`UPLOADS_DIR`); em ambientes serverless troque pelo adaptador de storage (S3/Supabase) — a interface `FileStorage` já existe.

## Fluxos da V1

| Perfil | Fluxo |
|---|---|
| Motorista | Home → buscar destino (ou "perto de mim") → mapa + lista de estacionamentos → **Ver estacionamento** → vagas por piso / mapa do piso → **Ir até lá** · favoritos e perfil em `/app` |
| Empresa | Login → `/company` (dashboard) → estacionamento → **Pisos e mapas** → importar planta → análise → corrigir no editor → publicar → **Operação** (mapa ao vivo) → **Analytics** |
| Admin | Login → `/admin` → usuários → empresas → estacionamentos → fontes de dados → atividade |

### Rotas principais

- Públicas: `/`, `/buscar`, `/estacionamentos/[slug]`, `/estacionamentos/[slug]/pisos/[floorId]`, `/empresas`, `/entrar`, `/cadastro`, `/recuperar-senha`
- Motorista: `/app` (favoritos), `/app/perfil`
- Empresa: `/company`, `/company/estacionamentos/novo`, `/company/estacionamentos/[id]` (visão geral, `operacao`, `pisos`, `pisos/[floorId]` = Mapa Inteligente, `analytics`, `cadastro`, `tarifas`, `dados`)
- Admin: `/admin`, `/admin/usuarios`, `/admin/empresas`, `/admin/estacionamentos`, `/admin/fontes`, `/admin/atividade`

## Funcional · Simulado · Preparado

**Funcional**
- Busca por destino (gazetteer de SP) ou localização do navegador; filtros (com vagas, aberto, PCD, EV, coberto, moto, preço, distância) e ordenação
- Lista + mapa sincronizados (desktop ~40/60; mobile com mapa dominante e bottom sheet); pins com nº de vagas livres / "Lotado"
- Página do estacionamento: disponibilidade, capacidade, vagas por piso e por tipo, preços com estimativa, horários (aberto/fechado), estrutura, acessibilidade, entradas, "Ir até lá" (Google Maps/Waze), favoritos
- Mapa digital público por piso (status com cor + ícone + padrão), vagas livres por setor e setor recomendado
- Empresa: cadastro/edição de estacionamentos (localização no mapa, capacidade, estrutura, veículos, horários, publicação), tarifas, entradas, pisos e setores
- **Mapa Inteligente**: upload PNG/JPG/PDF (PDF renderizado no navegador), processamento, resultado, revisão no editor (adicionar, remover, mover, redimensionar, rotacionar, renomear, setor, tipo, status, duplicar, zoom) e publicação
- Mapa operacional ao vivo (atualização a cada 10 s, filtros por status/setor/tipo/piso, painel da vaga com histórico, alteração manual de status)
- Fonte de dados por estacionamento: atualização manual (por vaga no mapa operacional ou por contagem agregada)
- Analytics de ocupação: por hora, histórico (média/pico), dia da semana, capacidade utilizada x disponível, capacidade ociosa, tempo lotado, giro por setor; dashboard corporativo consolidado
- Admin: usuários (suspender/reativar com revogação de sessões), empresas, estacionamentos, fontes de dados (com frescor) e auditoria — com busca, filtros e paginação
- Auth (cadastro, login, logout, recuperação de senha, sessão persistente), RBAC no servidor, isolamento por organização, auditoria, exportação de dados e pedido de exclusão (LGPD)
- Uploads seguros (validação por assinatura, limites, fora de `/public`, autorização por organização; plantas só ficam públicas quando publicadas)

**Simulado (sempre identificado na interface)**
- Ocupação via `SimulationOccupancyProvider` (selo "simulado" no público e "Modo demonstração" nos painéis)
- Análise automática de plantas (`MockParkingPlanAnalyzer`, "análise simulada")
- Rota interna até o setor recomendado (ilustrativa)
- Geocodificação limitada a locais conhecidos de São Paulo
- Estacionamentos, empresas e pessoas do seed são fictícios

**Preparado para integração**
- Provedores de ocupação: câmeras, sensores, cancelas, sistemas de gestão e APIs (`OccupancyProvider`; exibidos como "integração sob demanda")
- `AIParkingPlanAnalyzer` via `ParkingPlanAnalyzer` (`PLAN_ANALYZER`)
- Provedor de e-mail (recuperação de senha), error tracking (`setErrorReporter`), storage em nuvem (`FileStorage`)
- Anonimização de conta após pedido de exclusão (registrado e notificado ao admin; execução manual)

## Limitações conhecidas

- O banco embutido (PGlite) atende um processo por vez; use PostgreSQL em produção.
- Uploads em disco local; em ambiente serverless, configure um adaptador de storage em nuvem.
- Em desenvolvimento o `reactStrictMode` está desligado porque o `react-leaflet` v5 não suporta a dupla execução de efeitos do modo estrito.

## Testes

```bash
npm test
```

Cobrem: semântica de disponibilidade pública (simulado, desatualizado, lotado), simulação, analytics,
horários, tarifas, isolamento entre organizações, autorização do admin, contas suspensas, login sem
enumeração de e-mails, o pipeline de ocupação (com PostgreSQL em memória) e um guarda contra colunas
não qualificadas em subconsultas SQL.
