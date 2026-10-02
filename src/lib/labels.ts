/** PT-BR labels for domain enums (shared by server and client). */
export const SPACE_STATUS_LABEL = { AVAILABLE: "Livre", OCCUPIED: "Ocupada", RESERVED: "Reservada", UNAVAILABLE: "Indisponível" } as const;
export type SpaceStatus = keyof typeof SPACE_STATUS_LABEL;
export const SPACE_STATUSES = Object.keys(SPACE_STATUS_LABEL) as SpaceStatus[];

export const SPACE_TYPE_LABEL = { COMMON: "Comum", PCD: "PCD", EV: "Elétrico (EV)", MOTO: "Moto", VIP: "VIP" } as const;
export type SpaceType = keyof typeof SPACE_TYPE_LABEL;
export const SPACE_TYPES = Object.keys(SPACE_TYPE_LABEL) as SpaceType[];

export const FACILITY_KIND_LABEL = {
  SHOPPING: "Shopping",
  COMMERCIAL_BUILDING: "Edifício comercial",
  PARKING_LOT: "Estacionamento",
  HOSPITAL: "Hospital",
  EVENT_VENUE: "Arena / eventos",
  TRANSIT_HUB: "Terminal / estação",
  OTHER: "Outro",
} as const;
export type FacilityKind = keyof typeof FACILITY_KIND_LABEL;

export const VEHICLE_TYPE_LABEL = { CAR: "Carro", MOTORCYCLE: "Moto", VAN: "Utilitário / van" } as const;
export type VehicleType = keyof typeof VEHICLE_TYPE_LABEL;

export const ENTRANCE_KIND_LABEL = {
  VEHICLE_ENTRY: "Entrada de veículos",
  VEHICLE_EXIT: "Saída de veículos",
  VEHICLE_BOTH: "Entrada e saída de veículos",
  PEDESTRIAN: "Acesso de pedestres",
} as const;

export const DATA_SOURCE_KIND_LABEL = {
  SIMULATION: "Simulação (demonstração)",
  MANUAL: "Atualização manual",
  CAMERA: "Câmeras",
  SENSOR: "Sensores de vaga",
  GATE: "Cancelas",
  PARKING_MANAGEMENT: "Sistema do estacionamento",
  API: "API externa",
} as const;
export type DataSourceKind = keyof typeof DATA_SOURCE_KIND_LABEL;

export const ORG_TYPE_LABEL = { SHOPPING: "Shopping", CORPORATE: "Corporativo", PARKING_OPERATOR: "Operador de estacionamento", HOSPITAL: "Hospital", CONDOMINIUM: "Condomínio", OTHER: "Outro" } as const;
export const FLOOR_PLAN_STATUS_LABEL = {
  UPLOADED: "Enviada",
  PROCESSING: "Em processamento",
  ANALYZED: "Pronta para revisão",
  FAILED: "Análise falhou",
  PUBLISHED: "Publicada",
  SUPERSEDED: "Substituída",
} as const;
export const ELEMENT_KIND_LABEL = { ENTRANCE: "Entrada", EXIT: "Saída", CIRCULATION: "Circulação", RAMP: "Rampa", ELEVATOR: "Elevador" } as const;
export const WEEKDAY_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
