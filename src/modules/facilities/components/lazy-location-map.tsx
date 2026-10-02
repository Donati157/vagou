"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/states";

export const LazyLocationMap = dynamic(() => import("./location-map"), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
