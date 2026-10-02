"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Download, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { requestDeletionAction, updateProfileAction } from "../actions";

type Profile = { fullName: string | null; phone: string | null; email: string };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const fe = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.ok && (
        <Alert tone="success" icon={<CheckCircle2 className="size-4" />}>
          Perfil atualizado.
        </Alert>
      )}
      {state && !state.ok && !state.fieldErrors && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nome completo" htmlFor="fullName" error={fe("fullName")}>
        <Input id="fullName" name="fullName" defaultValue={profile.fullName ?? ""} autoComplete="name" />
      </Field>
      <Field label="E-mail" htmlFor="email" hint="Para alterar o e-mail, fale com o suporte.">
        <Input id="email" value={profile.email} disabled readOnly />
      </Field>
      <Field label="Celular" htmlFor="phone" optional error={fe("phone")}>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} autoComplete="tel" inputMode="tel" className="max-w-xs" />
      </Field>
      <Button type="submit" loading={pending}>
        Salvar alterações
      </Button>
    </form>
  );
}

export function PrivacyControls() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/api/me/export" variant="secondary" prefetch={false}>
          <Download className="size-4" aria-hidden /> Baixar meus dados (JSON)
        </LinkButton>
        <Button variant="ghost" className="text-danger hover:bg-red-50" onClick={() => setOpen(true)} disabled={done}>
          <Trash2 className="size-4" aria-hidden /> {done ? "Exclusão solicitada" : "Solicitar exclusão da conta"}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger
        loading={pending}
        title="Solicitar exclusão da conta?"
        confirmLabel="Enviar solicitação"
        onConfirm={() =>
          start(async () => {
            const res = await requestDeletionAction();
            setOpen(false);
            if (res.ok) {
              setDone(true);
              toast("Solicitação registrada. Nossa equipe entrará em contato.");
            } else toast(res.error, "error");
          })
        }
      >
        <p className="text-[15px] text-asphalt-700">
          Nossa equipe vai analisar o pedido. Registros de auditoria podem precisar ser mantidos pelo prazo exigido por lei antes da anonimização.
        </p>
      </ConfirmDialog>
    </div>
  );
}
