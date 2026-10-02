import { getCurrentUser } from "@/modules/auth/session";
import { getOperationalState } from "@/modules/occupancy/operations";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";

/** Polled by the operational map. Authorization: facility's organization members (and admins). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  const { id } = await params;
  const floor = new URL(req.url).searchParams.get("piso");
  try {
    const state = await getOperationalState(user, id, floor && /^[0-9a-f-]{36}$/.test(floor) ? floor : null);
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.userMessage }, { status: err.status });
    logger.error("operational_state_failed", { err });
    return Response.json({ error: "Não foi possível atualizar a ocupação agora." }, { status: 500 });
  }
}
