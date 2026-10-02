# Vagou — definição de produto (fonte da verdade)

> **Atualização (pós-V1.0.0):** a Vagou é **exclusiva para shoppings** e **não exibe preços**.
> Para cada shopping mostra **quantas vagas existem (total e livres agora, por piso)** e a **planta do
> shopping** (mapa digital das vagas). Onde este documento falar em "estacionamentos" genéricos,
> preços ou tarifas, prevalece esta atualização.

> **"Abra a Vagou e descubra onde tem vaga para estacionar."**

Este documento substitui a definição anterior ("marketplace / Airbnb de vagas"). Em caso de conflito com
qualquer outro texto (inclusive o briefing original), **este documento prevalece**.

## O que a Vagou é

Uma plataforma de **descoberta e visualização de disponibilidade de estacionamento**. Responde à pergunta:
**"Onde tem vaga para eu estacionar agora?"**

Jornada central:

```
DESTINO → ESTACIONAMENTOS PRÓXIMOS → DISPONIBILIDADE → ESCOLHER → VER DETALHES → IR ATÉ LÁ
```

Quando o estacionamento tem mapa digital: `ESTACIONAMENTO → PISO → SETOR → MAPA DAS VAGAS`
(verde = livre, vermelho = ocupada, amarelo = estado especial/reservado pelo próprio estacionamento, cinza = indisponível — nunca só cor).

CTA principal: **"Ver estacionamento"**, depois **"Ir até lá"**. Nunca "Reservar vaga".

## Fora do escopo da V1 (não implementar)

Reserva/booking, checkout, pagamento do motorista, payout, QR Code de reserva, "minhas reservas",
conflito de reservas, aluguel de vagas particulares, fluxo Airbnb, seleção de horário para reservar.

## Modelo de dados central

Organization → Facility → Floor → Sector → ParkingSpace, mais FloorPlan, FloorPlanElement,
OccupancyEvent, OccupancySnapshot, ParkingRate, OperatingHours, FacilityEntrance, DataSource.
Apoio: User, Profile, OrganizationMember, Favorite (motorista ↔ estacionamento), AuditLog, Notification.

## Ocupação (arquitetura fundamental)

- Fontes futuras: câmeras, sensores, cancelas, sistema do estacionamento, APIs, atualização manual.
- Abstração `OccupancyProvider`; V1 usa `SimulationOccupancyProvider` quando não há fonte real.
- `ManualOccupancyProvider`: o operador altera o status das vagas no mapa operacional (dado real, origem manual).
- Dados simulados **sempre** identificados — no painel administrativo e também na interface pública
  (nunca apresentados como disponibilidade real).

## Interface pública

- Desktop: header horizontal, busca ampla, filtros; lista de estacionamentos à esquerda (~40%) + mapa grande (~60%).
- Mobile: mapa dominante, controles compactos no topo, cards/bottom sheet com o estacionamento selecionado.
- Pins = estacionamentos (com nº de vagas livres / "Lotado"), não vagas individuais.
- Lista e mapa sincronizados (hover/seleção ↔ destaque do pin).
- Verde Vagou como cor de ação; branco e neutros claros; sem gradientes excessivos / glassmorphism.
- Produto de mobilidade e mapas — não marketplace de aluguel nem dashboard administrativo.

Detalhe do estacionamento: nome, localização, distância, disponibilidade atual, capacidade, preço (quando conhecido),
horário, acessibilidade, carregadores EV, tipos de veículo, entradas, informações úteis, "Ir até lá", vagas por piso.

## Perfis

- **Motorista** (DRIVER): busca, detalhes, favoritos, perfil. Uso público não exige conta.
- **Empresa** (COMPANY_ADMIN): estacionamentos, pisos/setores, Mapa Inteligente (importar planta → análise → corrigir → publicar),
  operação (mapa operacional, atualização manual), fontes de dados, tarifas, horários, entradas, analytics de ocupação.
- **Admin Vagou** (PLATFORM_ADMIN): usuários, empresas, estacionamentos, fontes de dados, atividade.

## Fluxos obrigatórios da V1

- Motorista: Home → Buscar destino → Mapa + estacionamentos → Ver estacionamento → Piso/mapa → Ir até lá.
- Empresa: Login → Dashboard → Estacionamento → Importar planta → Análise → Corrigir mapa → Publicar → Operação → Analytics.
- Admin: Login → Dashboard → Usuários → Empresas → Estacionamentos → Fontes de dados.

Demais requisitos não conflitantes do briefing original continuam valendo (segurança, LGPD, acessibilidade,
design system, testes, README, PT-BR, estados de erro/vazio/loading, classificação FUNCIONAL/SIMULADA/PREPARADA).
