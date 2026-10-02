"use client";

import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export default function DriverError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState action={<Button onClick={reset}>Tentar novamente</Button>} />;
}
