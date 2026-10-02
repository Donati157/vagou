/** Role model shared by server and client (labels, home routes, permission map). */
export const ROLES = ["DRIVER", "COMPANY_ADMIN", "PLATFORM_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  DRIVER: "Motorista",
  COMPANY_ADMIN: "Empresa",
  PLATFORM_ADMIN: "Admin Vagou",
};

export const ROLE_HOME: Record<Role, string> = {
  DRIVER: "/app",
  COMPANY_ADMIN: "/company",
  PLATFORM_ADMIN: "/admin",
};

/** Which roles may enter each authenticated area (enforced again server-side in every action). */
export const AREA_ROLES = {
  driver: ["DRIVER", "COMPANY_ADMIN", "PLATFORM_ADMIN"],
  company: ["COMPANY_ADMIN", "PLATFORM_ADMIN"],
  admin: ["PLATFORM_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Area = keyof typeof AREA_ROLES;

export function canAccess(role: Role, area: Area) {
  return (AREA_ROLES[area] as readonly Role[]).includes(role);
}
