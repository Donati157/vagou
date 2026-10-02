import { getCurrentUser } from "@/modules/auth/session";
import { exportUserData } from "@/modules/auth/privacy";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  const data = await exportUserData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vagou-meus-dados.json"`,
      "Cache-Control": "no-store",
    },
  });
}
