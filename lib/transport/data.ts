import { createSupabaseClient } from "@/lib/supabase";
import { DelayBand, Operator, PunctualityData, RouteSection, StopPoint } from "@/types/transport";

export async function getPunctualityData(): Promise<PunctualityData[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("get_route_punctuality");

  if (error) {
    console.error("Failed to fetch punctuality data:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function getRouteMapData(): Promise<StopPoint[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("get_route_map");

  if (error) {
    console.error("Failed to fetch route map data:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function getDelayBreakdownData(): Promise<DelayBand[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("get_delay_breakdown");

  if (error) {
    console.error("Failed to fetch delay breakdown data:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function getSectionsByRoute(): Promise<RouteSection[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("get_sections_by_route");

  if (error) {
    console.error("Failed to fetch sections by route:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return data || [];
}

export async function getOperators(): Promise<Operator[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("operator")
    .select("id, name, route(name)")
    .order("name");

  if (error) {
    console.error("Failed to fetch operators:", error.message);
    return [];
  }

  return (data || []).map((op: { id: number; name: string; route: { name: string }[] }) => ({
    id: op.id,
    name: op.name,
    route_names: op.route.map((r) => r.name),
  }));
}
