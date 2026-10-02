"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { setUserStatusAction } from "./actions";

export function UserStatusButton({ userId, status, email }: { userId: string; status: "ACTIVE" | "SUSPENDED"; email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const suspend = status === "ACTIVE";
  return (
    <>
      <Button size="sm" variant={suspend ? "ghost" : "secondary"} className={suspend ? "text-danger" : ""} onClick={() => setOpen(true)}>
        {suspend ? "Suspender" : "Reativar"}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger={suspend}
        loading={pending}
        title={suspend ? "Suspender esta conta?" : "Reativar esta conta?"}
        confirmLabel={suspend ? "Suspender" : "Reativar"}
        onConfirm={() =>
          start(async () => {
            const res = await setUserStatusAction(userId, suspend ? "SUSPENDED" : "ACTIVE");
            setOpen(false);
            if (res.ok) {
              toast(suspend ? "Conta suspensa." : "Conta reativada.");
              router.refresh();
            } else toast(res.error, "error");
          })
        }
      >
        <p className="text-[15px] text-asphalt-700">{suspend ? `${email} será desconectado de todos os dispositivos e não poderá entrar.` : `${email} voltará a ter acesso.`}</p>
      </ConfirmDialog>
    </>
  );
}
