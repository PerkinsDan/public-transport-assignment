export interface PunctualityData {
  route_name: string;
  avg_delay_minutes: number;
}

export interface StopPoint {
  route_name: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
}

export interface RouteStops {
  [routeName: string]: StopPoint[];
}

export interface DelayBand {
  band: string;
  count: number;
}

export interface RouteSection {
  route_name: string;
  from_stop: string;
  to_stop: string;
  avg_delay_minutes: number;
  trip_count: number;
}

export interface Operator {
  id: number;
  name: string;
  route_names: string[];
}
