import os
import time
import random
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("SUPABASE_URL and SERVICE_ROLE_KEY must be set in .env")

TFL_APP_ID = os.getenv("TFL_APP_ID")
TFL_APP_KEY = os.getenv("TFL_APP_KEY")

BASE_URL = "https://api.tfl.gov.uk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

OPERATORS = [
    "Arriva London",
    "Go-Ahead London",
    "Tower Transit",
    "Metroline",
    "Transdev London",
]

ROUTE_NUMBERS = ["4", "11", "19", "22", "25", "36", "73", "88", "159", "243"]


# --- Supabase helpers ---

def chunked(items, size=500):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def upsert_rows(table_name, rows, conflict_column):
    if not rows:
        return

    for batch in chunked(rows):
        supabase.table(table_name).upsert(
            batch,
            on_conflict=conflict_column
        ).execute()


def insert_rows(table_name, rows):
    if not rows:
        return []

    results = []
    for batch in chunked(rows):
        result = supabase.table(table_name).insert(batch).execute()
        results.extend(result.data)
    return results


# --- TfL API (from bus.py) ---

def tfl_get(path):
    params = {}

    if TFL_APP_ID:
        params["app_id"] = TFL_APP_ID

    if TFL_APP_KEY:
        params["app_key"] = TFL_APP_KEY

    response = requests.get(f"{BASE_URL}{path}", params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def get_route_sequence(route_number, direction):
    try:
        return tfl_get(f"/Line/{route_number}/Route/Sequence/{direction}")
    except requests.HTTPError as error:
        print(f"  Skipping {route_number} {direction}: {error}")
        return None


def extract_stop_points(sequence_data):
    all_sequences = sequence_data.get("stopPointSequences", [])

    if not all_sequences:
        return []

    return all_sequences[0].get("stopPoint", [])


def build_stop_rows(stop_points):
    rows = []

    for stop in stop_points:
        stop_id = stop.get("id")
        lat = stop.get("lat")
        lon = stop.get("lon")

        if not stop_id or lat is None or lon is None:
            continue

        rows.append({
            "id": stop_id,
            "name": stop.get("name") or "Unknown stop",
            "latitude": lat,
            "longitude": lon,
        })

    return rows


def build_route_row(route_number, direction, stop_rows, operator_id):
    if len(stop_rows) < 2:
        return None

    run = 1 if direction == "outbound" else 2

    return {
        "id": f"{route_number}_{direction}",
        "name": f"Bus {route_number} {direction}",
        "mode": "bus",
        "start_stop_id": stop_rows[0]["id"],
        "end_stop_id": stop_rows[-1]["id"],
        "operator_id": operator_id,
        "route_number": route_number,
        "run": run,
    }


def build_route_stop_rows(route_number, direction, stop_rows):
    route_id = f"{route_number}_{direction}"
    run = 1 if direction == "outbound" else 2

    return [
        {
            "route_id": route_id,
            "stop_id": stop["id"],
            "stop_sequence": seq,
            "run": run,
        }
        for seq, stop in enumerate(stop_rows, start=1)
    ]


def import_route_direction(route_number, direction, operator_id):
    print(f"  Importing route {route_number} {direction}...")

    sequence_data = get_route_sequence(route_number, direction)

    if not sequence_data:
        return None

    stop_points = extract_stop_points(sequence_data)

    if len(stop_points) < 2:
        print(f"  No usable stops for {route_number} {direction}")
        return None

    stop_rows = build_stop_rows(stop_points)

    if len(stop_rows) < 2:
        print(f"  No valid stop rows for {route_number} {direction}")
        return None

    route_row = build_route_row(route_number, direction, stop_rows, operator_id)

    if not route_row:
        return None

    route_stop_rows = build_route_stop_rows(route_number, direction, stop_rows)

    upsert_rows("stop", stop_rows, "id")
    upsert_rows("route", [route_row], "id")
    upsert_rows("route_stop", route_stop_rows, "route_id,stop_id,stop_sequence")

    return route_row["id"]


# --- Random data seeders ---

def seed_operators():
    print("Seeding operators...")
    rows = [{"name": name} for name in OPERATORS]
    result = insert_rows("operator", rows)
    print(f"  Inserted {len(result)} operators.")
    return {row["name"]: row["id"] for row in result}



def seed_vehicles(operator_name_to_id):
    print("Seeding vehicles...")
    rows = [
        {
            "mode": "bus",
            "capacity": random.choice([60, 70, 80, 87, 90]),
            "operator_id": op_id,
        }
        for op_id in operator_name_to_id.values()
        for _ in range(10)
    ]
    result = insert_rows("vehicle", rows)
    print(f"  Inserted {len(result)} vehicles.")
    return [row["id"] for row in result]


def seed_trips(route_ids, vehicle_ids):
    print("Seeding trips...")
    rows = []
    now = datetime.now(tz=timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    departure_hours = [7, 9, 11, 13, 15, 17, 19, 21]

    for route_id in route_ids:
        for day_offset in range(7):
            day_start = today - timedelta(days=day_offset)

            for hour in departure_hours:
                scheduled_start = day_start + timedelta(
                    hours=hour,
                    minutes=random.randint(0, 30)
                )
                scheduled_end = scheduled_start + timedelta(minutes=random.randint(30, 90))

                delay_roll = random.random()
                if delay_roll < 0.60:
                    delay_minutes = 0
                elif delay_roll < 0.90:
                    delay_minutes = random.randint(1, 5)
                else:
                    delay_minutes = random.randint(6, 20)

                if scheduled_end < now:
                    status = "cancelled" if random.random() < 0.05 else "completed"
                elif scheduled_start <= now < scheduled_end:
                    status = "in_progress"
                else:
                    status = "scheduled"

                actual_start = None
                actual_end = None

                if status in ("completed", "in_progress"):
                    actual_start = scheduled_start + timedelta(minutes=delay_minutes)
                if status == "completed":
                    actual_end = scheduled_end + timedelta(
                        minutes=delay_minutes + random.randint(-2, 5)
                    )

                rows.append({
                    "route_id": route_id,
                    "vehicle_id": random.choice(vehicle_ids),
                    "scheduled_start_time": scheduled_start.isoformat(),
                    "scheduled_end_time": scheduled_end.isoformat(),
                    "actual_start_time": actual_start.isoformat() if actual_start else None,
                    "actual_end_time": actual_end.isoformat() if actual_end else None,
                    "status": status,
                })

    result = insert_rows("trip", rows)
    print(f"  Inserted {len(result)} trips.")
    return result


def fetch_route_stops():
    # Sufficient for the 10-route seed (~1 000 stops); increase if importing more routes.
    result = (
        supabase.table("route_stop")
        .select("id,route_id,stop_sequence")
        .limit(10000)
        .execute()
    )
    by_route = {}
    for rs in result.data:
        by_route.setdefault(rs["route_id"], []).append(rs)
    for stops in by_route.values():
        stops.sort(key=lambda x: x["stop_sequence"])
    return by_route


def seed_stop_visits(trips, route_stops_by_route_id):
    print("Seeding stop visits...")
    now = datetime.now(tz=timezone.utc)
    rows = []

    for trip in trips:
        route_id = trip["route_id"]
        stops = route_stops_by_route_id.get(route_id, [])
        if not stops:
            continue

        n = len(stops)
        sched_start = datetime.fromisoformat(trip["scheduled_start_time"])
        sched_end = datetime.fromisoformat(trip["scheduled_end_time"])
        total_secs = (sched_end - sched_start).total_seconds()
        interval_secs = total_secs / max(n - 1, 1)
        dwell_secs = random.randint(30, 90)

        status = trip["status"]
        actual_start_str = trip.get("actual_start_time")
        initial_delay_secs = 0
        if actual_start_str:
            actual_start = datetime.fromisoformat(actual_start_str)
            initial_delay_secs = (actual_start - sched_start).total_seconds()

        current_delay_secs = initial_delay_secs

        for i, stop in enumerate(stops):
            sched_arrival = sched_start + timedelta(seconds=i * interval_secs)
            is_last = i == n - 1
            sched_departure = None if is_last else sched_arrival + timedelta(seconds=dwell_secs)

            actual_arrival = None
            actual_departure = None

            if status in ("completed", "in_progress"):
                est_arrival = sched_arrival + timedelta(seconds=current_delay_secs)
                if est_arrival <= now:
                    actual_arrival = est_arrival
                    if sched_departure:
                        actual_departure = sched_departure + timedelta(seconds=current_delay_secs)

            # Delay random walk: tends to accumulate, can recover slightly
            current_delay_secs += random.uniform(-30, 120)
            current_delay_secs = max(current_delay_secs, -60)

            rows.append({
                "trip_id": trip["id"],
                "route_stop_id": stop["id"],
                "scheduled_arrival_time": sched_arrival.isoformat(),
                "actual_arrival_time": actual_arrival.isoformat() if actual_arrival else None,
                "scheduled_departure_time": sched_departure.isoformat() if sched_departure else None,
                "actual_departure_time": actual_departure.isoformat() if actual_departure else None,
            })

    insert_rows("stop_visit", rows)
    print(f"  Inserted {len(rows)} stop visits.")


def main():
    # Seed operators first so routes can be assigned to them
    operator_name_to_id = seed_operators()
    operators = list(operator_name_to_id.values())

    # Import real TfL routes, distributing across operators
    print("Importing TfL routes...")
    route_ids = []

    for i, route_number in enumerate(ROUTE_NUMBERS):
        operator_id = operators[i % len(operators)]

        for direction in ["outbound", "inbound"]:
            route_id = import_route_direction(route_number, direction, operator_id)
            if route_id:
                route_ids.append(route_id)
            time.sleep(0.3)

    print(f"Imported {len(route_ids)} route directions.")

    vehicle_ids = seed_vehicles(operator_name_to_id)
    trips = seed_trips(route_ids, vehicle_ids)

    route_stops_by_route_id = fetch_route_stops()
    seed_stop_visits(trips, route_stops_by_route_id)

    print("Done.")


if __name__ == "__main__":
    main()
