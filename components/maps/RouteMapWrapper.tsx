"use client";

import dynamic from "next/dynamic";
import { StopPoint } from "@/types/transport";

const RouteMapContent = dynamic(
  () => import("@/components/maps/RouteMap"),
  { ssr: false }
);

interface RouteMapWrapperProps {
  data: StopPoint[];
}

export default function RouteMapWrapper({ data }: RouteMapWrapperProps) {
  return <RouteMapContent data={data} />;
}
