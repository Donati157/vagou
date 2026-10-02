"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { VEHICLE_TYPE_LABEL, WEEKDAY_LABEL } from "@/lib/labels";
import { geocoder, SAO_PAULO_CENTER } from "@/modules/geo/geocoding";
import { createFacilityAction, updateFacilityAction } from "../actions";
import { defaultHours, facilityInputSchema, type FacilityInput } from "../schemas";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

const SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const END_SLOTS = [...SLOTS.slice(1), "24:00"];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-asphalt-100 py-7 first:pt-0 last:border-0 lg:grid-cols-[240px_1fr]">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-asphalt-500">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export function FacilityForm({ facilityId, initial, organizations }: { facilityId: string | null; initial?: FacilityInput; organizations?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState(organizations?.[0]?.id ?? "");
  const [center, setCenter] = useState<[number, number]>(initial ? [initial.lat, initial.lng] : [SAO_PAULO_CENTER.lat, SAO_PAULO_CENTER.lng]);
  const form = useForm<FacilityInput>({
    resolver: zodResolver(facilityInputSchema) as never,
    mode: "onTouched",
    defaultValues: initial ?? {
      name: "",
      kind: "SHOPPING",
      description: "",
      addressLine: "",
      neighborhood: "",
      postalCode: "",
      phone: "",
      declaredCapacity: 0,
      covered: true,
      accessibleSpaces: 0,
      evChargers: 0,
      valet: false,
      security24h: false,
      maxHeightCm: null,
      usefulInfo: "",
      vehicleTypes: ["CAR"],
      hours: defaultHours(),
      isPublished: false,
    } as unknown as FacilityInput,
  });
  const { register, control, setValue, formState } = form;
  const e = formState.errors;
  const values = useWatch({ control }) as FacilityInput;
  const err = (k: keyof FacilityInput) => e[k]?.message as string | undefined;
  const num = { valueAsNumber: true } as const;

  const onSubmit = form.handleSubmit(
    (data) =>
      start(async () => {
        setServerError(null);
        const res = facilityId ? await updateFacilityAction(facilityId, data) : await createFacilityAction(data, organizations && organizations.length > 1 ? orgId : null);
        if (!res.ok) return setServerError(res.error);
        toast(facilityId ? "Alterações salvas." : "Shopping cadastrado.");
        if (!facilityId && "id" in res.data) router.push(`/company/estacionamentos/${res.data.id}`);
        else router.refresh();
      }),
    () => setServerError("Revise os campos destacados."),
  );

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-asphalt-100 bg-surface p-5 sm:p-7" noValidate>
      {serverError && (
        <Alert tone="danger" className="mb-6" icon={<AlertCircle className="size-4" />}>
          {serverError}
        </Alert>
      )}

      <Section title="Identificação" description="Como o shopping aparece para os motoristas.">
        {organizations && organizations.length > 1 && !facilityId && (
          <Field label="Empresa responsável" htmlFor="org">
            <Select id="org" value={orgId} onChange={(ev) => setOrgId(ev.target.value)}>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nome do shopping" htmlFor="name" error={err("name")}>
          <Input id="name" {...register("name")} placeholder="Ex.: Shopping Centro Norte" />
        </Field>
        <Field label="Descrição" htmlFor="description" optional error={err("description")}>
          <Textarea id="description" {...register("description")} rows={3} maxLength={1500} />
        </Field>
        <Field label="Telefone" htmlFor="phone" optional error={err("phone")}>
          <Input id="phone" {...register("phone")} inputMode="tel" className="max-w-xs" />
        </Field>
      </Section>

      <Section title="Localização" description="Marque no mapa o ponto do shopping. Entradas específicas são configuradas depois.">
        <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr_1fr]">
          <Field label="Endereço" htmlFor="addressLine" error={err("addressLine")}>
            <Input id="addressLine" {...register("addressLine")} autoComplete="street-address" />
          </Field>
          <Field label="Bairro" htmlFor="neighborhood" error={err("neighborhood")}>
            <Input
              id="neighborhood"
              {...register("neighborhood", {
                onBlur: (ev) => {
                  const m = geocoder.search(ev.target.value)[0];
                  if (m) setCenter([m.lat, m.lng]);
                },
              })}
            />
          </Field>
          <Field label="CEP" htmlFor="postalCode" optional error={err("postalCode")}>
            <Input id="postalCode" {...register("postalCode")} inputMode="numeric" />
          </Field>
        </div>
        <div className={cn("h-72 overflow-hidden rounded-lg border", e.lat ? "border-danger" : "border-asphalt-200")}>
          <LocationPicker
            value={values.lat ? { lat: values.lat, lng: values.lng } : null}
            center={center}
            onPick={(lat, lng) => {
              setValue("lat", lat, { shouldValidate: true, shouldDirty: true });
              setValue("lng", lng, { shouldValidate: true, shouldDirty: true });
            }}
          />
        </div>
        {e.lat ? (
          <p className="text-sm text-danger" role="alert">
            Toque no mapa para marcar o shopping (cidade de São Paulo).
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-asphalt-500">
            <Lock className="size-3.5" aria-hidden /> O ponto é usado no mapa público e na rota “Ir até lá”.
          </p>
        )}
      </Section>

      <Section title="Capacidade e estrutura" description="Usada quando o shopping ainda não tem mapa digital.">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Capacidade total" htmlFor="declaredCapacity" error={err("declaredCapacity")}>
            <Input id="declaredCapacity" type="number" min={0} {...register("declaredCapacity", num)} />
          </Field>
          <Field label="Vagas PCD" htmlFor="accessibleSpaces" error={err("accessibleSpaces")}>
            <Input id="accessibleSpaces" type="number" min={0} {...register("accessibleSpaces", num)} />
          </Field>
          <Field label="Carregadores EV" htmlFor="evChargers" error={err("evChargers")}>
            <Input id="evChargers" type="number" min={0} {...register("evChargers", num)} />
          </Field>
          <Field label="Altura máx. (cm)" htmlFor="maxHeightCm" optional error={err("maxHeightCm")}>
            <Input id="maxHeightCm" type="number" min={150} {...register("maxHeightCm", { setValueAs: (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? null : Number(v)) })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Checkbox label="Coberto" {...register("covered")} />
          <Checkbox label="Manobrista" {...register("valet")} />
          <Checkbox label="Segurança 24h" {...register("security24h")} />
        </div>
        <Controller
          control={control}
          name="vehicleTypes"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-asphalt-700">Veículos aceitos</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {(Object.keys(VEHICLE_TYPE_LABEL) as Array<keyof typeof VEHICLE_TYPE_LABEL>).map((v) => (
                  <Checkbox key={v} label={VEHICLE_TYPE_LABEL[v]} checked={field.value.includes(v)} onChange={(ev) => field.onChange(ev.target.checked ? [...field.value, v] : field.value.filter((x) => x !== v))} />
                ))}
              </div>
              {e.vehicleTypes && <p className="mt-1 text-sm text-danger">{e.vehicleTypes.message}</p>}
            </fieldset>
          )}
        />
        <Field label="Informações úteis" htmlFor="usefulInfo" optional>
          <Textarea id="usefulInfo" {...register("usefulInfo")} rows={2} maxLength={1000} placeholder="Ex.: elevadores no centro de cada piso; tolerância de 15 minutos." />
        </Field>
      </Section>

      <Section title="Horário de funcionamento">
        <div className="space-y-2">
          {values.hours.map((d, i) => (
            <div key={d.weekday} className="flex flex-wrap items-center gap-3 rounded-md border border-asphalt-100 px-3 py-2">
              <Checkbox label={<span className="inline-block w-20 font-semibold">{WEEKDAY_LABEL[d.weekday]}</span>} {...register(`hours.${i}.enabled`)} />
              {d.enabled ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`h-${i}-o`}>
                    Abertura {WEEKDAY_LABEL[d.weekday]}
                  </label>
                  <Select id={`h-${i}-o`} className="h-9 w-28" {...register(`hours.${i}.open`)}>
                    {SLOTS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                  <span className="text-asphalt-400">às</span>
                  <label className="sr-only" htmlFor={`h-${i}-c`}>
                    Fechamento {WEEKDAY_LABEL[d.weekday]}
                  </label>
                  <Select id={`h-${i}-c`} className="h-9 w-28" {...register(`hours.${i}.close`)}>
                    {END_SLOTS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="text-xs font-semibold text-green-700 hover:underline"
                    onClick={() => {
                      setValue(`hours.${i}.open`, "00:00");
                      setValue(`hours.${i}.close`, "24:00");
                    }}
                  >
                    24h
                  </button>
                </div>
              ) : (
                <span className="text-sm text-asphalt-400">Fechado</span>
              )}
              {e.hours?.[i]?.close && <p className="w-full text-sm text-danger">{e.hours[i]?.close?.message}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Publicação" description="Shoppings publicados aparecem na busca pública.">
        <Checkbox label="Publicar na busca da Vagou" {...register("isPublished")} />
      </Section>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" loading={pending}>
          {facilityId ? "Salvar alterações" : "Cadastrar shopping"}
        </Button>
      </div>
    </form>
  );
}
