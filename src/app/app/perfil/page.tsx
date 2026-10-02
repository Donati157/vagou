import { PageHeader } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/session";
import { getProfile } from "@/modules/auth/service";
import { ProfileForm, PrivacyControls } from "@/modules/auth/components/profile-form";
import { ROLE_LABEL } from "@/modules/auth/roles";
import { formatFullDate } from "@/lib/format";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  const profile = await getProfile(user.id);
  return (
    <>
      <PageHeader title="Meu perfil" description={`${ROLE_LABEL[user.role]} · na Vagou desde ${formatFullDate(profile.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Dados pessoais" description="Usamos estes dados apenas para operar sua conta." />
          <CardBody>
            <ProfileForm profile={profile} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Privacidade" description="Você controla seus dados." />
          <CardBody className="space-y-3 text-sm text-asphalt-600">
            <p>Seu nome, e-mail e celular nunca aparecem publicamente nem são compartilhados com os shoppings. Seus favoritos ficam visíveis só para você.</p>
            <PrivacyControls />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
