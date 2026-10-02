# Vagou

> **Abra a Vagou e descubra onde tem vaga para estacionar.**

A Vagou é uma plataforma de **descoberta e visualização de disponibilidade de estacionamento**.
O motorista diz para onde vai e vê no mapa os estacionamentos próximos, quantas vagas estão livres,
preço, horário e entradas — e, quando o estacionamento tem mapa digital, as vagas livres por piso e setor.
Empresas (shoppings, edifícios, hospitais, operadores) digitalizam seus estacionamentos a partir da planta
e conectam fontes de ocupação.

A Vagou **não** é um marketplace de reservas: não há reserva, checkout ou pagamento pela plataforma.
A definição de produto completa está em [`docs/PRODUCT.md`](docs/PRODUCT.md) (fonte da verdade).

> **Status:** checkpoint V0 publicável — o desenvolvimento da V1 completa continua (veja "Roadmap da V1").

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

## Funcional · Simulado · Preparado (estado atual)

**Funcional**
- Busca por destino (gazetteer de SP) ou localização do navegador; filtros (com vagas, aberto, PCD, EV, coberto, moto, preço, distância, ordenação)
- Lista + mapa sincronizados (desktop ~40/60; mobile com mapa dominante e bottom sheet); pins com nº de vagas livres
- Página do estacionamento: disponibilidade, capacidade, vagas por piso, preços com estimativa, horários (aberto/fechado), estrutura e acessibilidade, entradas, “Ir até lá” (Google Maps/Waze)
- Mapa digital público por piso (status por cor + ícone + padrão; vagas livres por setor e tipo)
- Cadastro, login, logout, recuperação de senha, sessão persistente, RBAC, favoritos, perfil, exportação de dados (LGPD) e pedido de exclusão
- Painel da empresa (visão dos estacionamentos com disponibilidade, fonte de dados e pisos mapeados) e visão geral do admin
- Pipeline de ocupação: eventos, snapshots, atualização manual, regras de dado desatualizado
- Upload seguro (validação de tipo pela assinatura do arquivo, limites de tamanho, arquivos fora de `/public` com autorização)

**Simulado (identificado na interface)**
- Ocupação dos estacionamentos de demonstração (`SimulationOccupancyProvider`)
- Análise automática de plantas (`MockParkingPlanAnalyzer`)
- Geocodificação limitada a um conjunto de locais de São Paulo
- Todos os estacionamentos, empresas e pessoas do seed são fictícios

**Preparado para integração**
- Provedores de ocupação: câmeras, sensores, cancelas, sistemas de gestão, APIs
- `AIParkingPlanAnalyzer` (visão computacional) via `ParkingPlanAnalyzer`
- Provedor de e-mail (recuperação de senha), error tracking (`setErrorReporter`), storage em nuvem

## Roadmap da V1 (em andamento)

- Empresa: cadastro/edição de estacionamentos, tarifas, horários, entradas, pisos/setores, fontes de dados
- Mapa Inteligente: upload de planta (PNG/JPG/PDF) → análise → editor (adicionar, remover, mover, redimensionar, girar, renomear, setor, tipo, status) → publicação
- Mapa operacional ao vivo com filtros (status, setor, tipo, piso), painel lateral e atualização manual
- Analytics de ocupação (por hora, histórico, por piso/setor, capacidade ociosa)
- Admin: usuários, empresas, estacionamentos, fontes de dados com busca, filtros e paginação
- Mais testes de integração e revisão final de responsividade/acessibilidade

## Testes

```bash
npm test
```

Cobrem: semântica de disponibilidade pública (simulado, desatualizado, lotado), simulação, horários,
tarifas, isolamento entre organizações e o pipeline de ocupação (com PostgreSQL em memória).
