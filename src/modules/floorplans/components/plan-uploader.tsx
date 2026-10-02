"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { uploadFloorPlanAction } from "../actions";

const MAX = 15 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "application/pdf"];

/** Renders the first page of a PDF to PNG in the browser (pdf.js, loaded on demand). */
async function pdfToPng(file: File): Promise<File> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2400 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render"))), "image/png"));
  return new File([blob], file.name.replace(/\.pdf$/i, "") + ".png", { type: "image/png" });
}

export function PlanUploader({ floorId, hasSpaces, compact }: { floorId: string; hasSpaces: boolean; compact?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(!hasSpaces);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "preparing" | "processing">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [, start] = useTransition();

  function pick(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setError("Formato não suportado. Envie PNG, JPG ou PDF.");
    if (f.size > MAX) return setError("Arquivo muito grande. O limite é 15 MB.");
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    if (replace) fd.set("replace", "1");
    if (file.type === "application/pdf") {
      setStage("preparing");
      try {
        fd.set("preview", await pdfToPng(file));
      } catch {
        setStage("idle");
        return setError("Não conseguimos ler este PDF. Envie a planta em PNG ou JPG.");
      }
    }
    setStage("processing");
    start(async () => {
      const res = await uploadFloorPlanAction(floorId, fd);
      setStage("idle");
      if (!res.ok) return setError(res.error);
      setFile(null);
      router.refresh();
    });
  }

  if (stage !== "idle") {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-asphalt-100 bg-white px-6 py-14 text-center">
        <Loader2 className="size-8 animate-spin text-green-600" aria-hidden />
        <p className="text-lg font-semibold">{stage === "preparing" ? "Preparando o PDF…" : "Processando a planta…"}</p>
        <p className="max-w-sm text-sm text-asphalt-500">Estamos identificando setores, vagas, entradas e áreas de circulação. Isso leva alguns segundos.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-asphalt-100 bg-white", compact ? "p-4" : "p-6")}>
      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-green-200",
          compact ? "py-6" : "py-12",
          dragOver ? "border-green-500 bg-green-50" : "border-asphalt-200 hover:border-ink-700",
        )}
      >
        {file ? <FileImage className="size-8 text-green-600" aria-hidden /> : <Upload className="size-8 text-asphalt-400" aria-hidden />}
        <span className="font-semibold text-ink-900">{file ? file.name : "Arraste a planta aqui ou clique para escolher"}</span>
        <span className="text-sm text-asphalt-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "PNG, JPG ou PDF · até 15 MB"}</span>
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          {hasSpaces && <Checkbox label="Substituir as vagas atuais pelas identificadas na nova planta" checked={replace} onChange={(e) => setReplace(e.target.checked)} />}
          <a href="/demo/planta-exemplo.png" download className="block text-sm font-semibold text-green-700 hover:underline">
            Baixar planta de exemplo para testar
          </a>
        </div>
        <Button onClick={submit} disabled={!file}>
          <Upload className="size-4" aria-hidden /> Enviar e analisar
        </Button>
      </div>
    </div>
  );
}
