import os
import time
import requests
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


def tfl_get(path):
    params = {}

    if TFL_APP_ID:
        params["app_id"] = TFL_APP_ID

    if TFL_APP_KEY:
        params["app_key"] = TFL_APP_KEY

    response = requests.get(
        f"{BASE_URL}{path}",
        params=params,
        timeout=30
    )

    response.raise_for_status()
    return response.json()


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


def get_or_create_operator(name="TfL"):
    existing = (
        supabase.table("operator")
        .select("id")
        .eq("name", name)
        .execute()
        .data
    )

    if existing:
        return existing[0]["id"]

    created = (
        supabase.table("operator")
        .insert({"name": name})
        .execute()
        .data
    )

    return created[0]["id"]


def get_bus_routes():
    print("Downloading TfL bus routes...")
    routes = tfl_get("/Line/Mode/bus")

    route_ids = []

    for route in routes:
        if route.get("id"):
            route_ids.append(route["id"])

    print(f"Found {len(route_ids)} bus routes.")
    return route_ids


def get_route_sequence(route_number, direction):
    try:
        return tfl_get(f"/Line/{route_number}/Route/Sequence/{direction}")
    except requests.HTTPError as error:
        print(f"Skipping {route_number} {direction}: {error}")
        return None


def extract_stop_points(sequence_data):
    all_sequences = sequence_data.get("stopPointSequences", [])

    if not all_sequences:
        return []

    # For assignment simplicity, use the first sequence.
    # Some TfL routes have branches, which appear as extra sequences.
    return all_sequences[0].get("stopPoint", [])


def build_stop_rows(stop_points):
    rows = []

    for stop in stop_points:
        stop_id = stop.get("id")
        name = stop.get("name")
        lat = stop.get("lat")
        lon = stop.get("lon")

        if not stop_id or lat is None or lon is None:
            continue

        rows.append({
            "id": stop_id,
            "name": name or "Unknown stop",
            "latitude": lat,
            "longitude": lon
        })

    return rows


def build_route_row(route_number, direction, stop_rows, operator_id):
    if len(stop_rows) < 2:
        return None

    route_id = f"{route_number}_{direction}"
    run = 1 if direction == "outbound" else 2

    return {
        "id": route_id,
        "name": f"Bus {route_number} {direction}",
        "mode": "bus",
        "start_stop_id": stop_rows[0]["id"],
        "end_stop_id": stop_rows[-1]["id"],
        "operator_id": operator_id,
        "route_number": route_number,
        "run": run
    }


def build_route_stop_rows(route_number, direction, stop_rows):
    route_id = f"{route_number}_{direction}"
    run = 1 if direction == "outbound" else 2

    rows = []

    for index, stop in enumerate(stop_rows, start=1):
        rows.append({
            "route_id": route_id,
            "stop_id": stop["id"],
            "stop_sequence": index,
            "run": run
        })

    return rows


def import_single_route_direction(route_number, direction, operator_id):
    print(f"Importing {route_number} {direction}...")

    sequence_data = get_route_sequence(route_number, direction)

    if not sequence_data:
        return

    stop_points = extract_stop_points(sequence_data)

    if len(stop_points) < 2:
        print(f"No usable stops for {route_number} {direction}")
        return

    stop_rows = build_stop_rows(stop_points)

    if len(stop_rows) < 2:
        print(f"No valid stop rows for {route_number} {direction}")
        return

    route_row = build_route_row(
        route_number=route_number,
        direction=direction,
        stop_rows=stop_rows,
        operator_id=operator_id
    )

    route_stop_rows = build_route_stop_rows(
        route_number=route_number,
        direction=direction,
        stop_rows=stop_rows
    )

    # Important order because route references stops,
    # and route_stop references both route and stop.
    upsert_rows("stop", stop_rows, "id")
    upsert_rows("route", [route_row], "id")
    upsert_rows(
        "route_stop",
        route_stop_rows,
        "route_id,stop_id,stop_sequence"
    )


def main():
    operator_id = get_or_create_operator("TfL")

    route_number = "4"

    import_single_route_direction(route_number, "outbound", operator_id)
    time.sleep(0.2)

    import_single_route_direction(route_number, "inbound", operator_id)

    print(f"Finished importing TfL bus route {route_number}.")

if __name__ == "__main__":
    main()