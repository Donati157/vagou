"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { toggleFavoriteAction } from "../favorites";

export function FavoriteButton({ facilityId, initial, loggedIn, returnTo }: { facilityId: string; initial: boolean; loggedIn: boolean; returnTo: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      aria-pressed={fav}
      loading={pending}
      onClick={() => {
        if (!loggedIn) return router.push(`/entrar?next=${encodeURIComponent(returnTo)}`);
        start(async () => {
          const res = await toggleFavoriteAction(facilityId);
          if (res.ok) {
            setFav(res.data.favorite);
            toast(res.data.favorite ? "Salvo nos seus favoritos." : "Removido dos favoritos.");
          } else toast(res.error, "error");
        });
      }}
    >
      <Heart className={cn("size-4", fav && "fill-danger text-danger")} aria-hidden />
      {fav ? "Favorito" : "Salvar"}
    </Button>
  );
}
