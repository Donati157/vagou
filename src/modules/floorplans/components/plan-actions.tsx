"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { publishFloorPlanAction, reanalyzeFloorPlanAction } from "../actions";

export function PublishPlanButton({ planId, spaces, republish }: { planId: string; spaces: number; republish?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} disabled={spaces === 0}>
        <CheckCircle2 className="size-4" aria-hidden /> {republish ? "Publicar nova versão" : "Publicar mapa"}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={pending}
        title="Publicar o mapa deste piso?"
        confirmLabel="Publicar"
        onConfirm={() =>
          start(async () => {
            const res = await publishFloorPlanAction(planId);
            setOpen(false);
            if (res.ok) {
              toast("Mapa publicado. As vagas já aparecem na operação e na página pública.");
              router.refresh();
            } else toast(res.error, "error");
          })
        }
      >
        <p className="text-[15px] text-asphalt-700">As {spaces} vagas passam a compor a disponibilidade pública do shopping e o mapa digital do piso fica visível para os motoristas.</p>
      </ConfirmDialog>
    </>
  );
}

export function ReanalyzeButton({ planId }: { planId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await reanalyzeFloorPlanAction(planId, true);
          if (res.ok) router.refresh();
          else toast(res.error, "error");
        })
      }
    >
      <RefreshCw className="size-4" aria-hidden /> Tentar analisar de novo
    </Button>
  );
}
