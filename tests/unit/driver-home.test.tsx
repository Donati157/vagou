// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { FacilityResult } from "@/modules/facilities/public";

const listFavoriteFacilities = vi.fn<(userId: string) => Promise<FacilityResult[]>>();
vi.mock("@/modules/auth/session", () => ({ getCurrentUser: async () => ({ id: "u1", firstName: "Marina", role: "DRIVER" }) }));
vi.mock("@/modules/facilities/driver", () => ({ listFavoriteFacilities: (id: string) => listFavoriteFacilities(id) }));

const { default: DriverHome } = await import("@/app/app/page");

afterEach(() => {
  cleanup();
  listFavoriteFacilities.mockReset();
});

const shopping: FacilityResult = {
  id: "f1",
  slug: "shopping-a",
  name: "Shopping A",
  kind: "SHOPPING",
  neighborhood: "Moema",
  addressLine: "Rua X, 1",
  lat: -23.6,
  lng: -46.66,
  distanceMeters: null,
  open: true,
  openLabel: "Aberto · fecha às 22:00",
  mappedFloors: 2,
  covered: true,
  accessible: true,
  evChargers: 0,
  acceptsMotorcycles: false,
  availability: { state: "AVAILABLE", available: 42, capacity: 100, counts: null, floors: [], simulated: true, updatedAt: new Date(), sourceKind: "SIMULATION" },
} as unknown as FacilityResult;

describe("/app — Favoritos", () => {
  it("shows the empty state when the driver has no favorites", async () => {
    listFavoriteFacilities.mockResolvedValue([]);
    render(await DriverHome({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Nenhum shopping favorito ainda")).toBeTruthy();
    expect(screen.getByText("Salve seus shoppings para encontrá-los mais rápido por aqui.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver shoppings com vaga" }).getAttribute("href")).toBe("/buscar");
    expect(screen.queryByText(/Algo deu errado/)).toBeNull();
  });

  it("lists the favorite shopping with its availability and link", async () => {
    listFavoriteFacilities.mockResolvedValue([shopping]);
    render(await DriverHome({ searchParams: Promise.resolve({}) }));
    expect(listFavoriteFacilities).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("heading", { name: "Shopping A" })).toBeTruthy();
    expect(screen.getByText(/42 vagas livres/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver shopping" }).getAttribute("href")).toBe("/estacionamentos/shopping-a");
  });
});
