---
name: maps
description: >
  Geocode addresses and get turn-by-turn directions or driving/walking distances
  between any two locations (addresses, cities, ZIP codes, coordinates).
  Uses Nominatim (OpenStreetMap) and OSRM — no API key required.
classification_ceiling: PUBLIC
requires_tools:
  - web_fetch
network_domains:
  - nominatim.openstreetmap.org
  - router.project-osrm.org
---

# Maps & Directions

Use this skill for tasks like:
- "Get directions from A to B"
- "How far is X from Y?" / "Distance between two cities/addresses/ZIP codes"
- "What are the coordinates of [address]?"
- "What address is at [lat, lon]?"
- "How long does it take to drive/walk from A to B?"

All API calls return JSON — use `mode: "raw"` with `web_fetch`.

## Geocoding

### Forward (Address / City / ZIP → Coordinates)
```
web_fetch: { url: "https://nominatim.openstreetmap.org/search?q=1600+Pennsylvania+Ave+Washington+DC&format=json&limit=3", mode: "raw" }
```
Returns JSON array. Each result has `lat`, `lon`, `display_name`. Use the first result or ask the user if ambiguous.

URL-encode the address: replace spaces with `+`, commas with `%2C`.

### Reverse (Coordinates → Address)
```
web_fetch: { url: "https://nominatim.openstreetmap.org/reverse?lat=38.8977&lon=-77.0365&format=json", mode: "raw" }
```

## Directions & Distance

Always geocode both endpoints first to get coordinates, then call OSRM:

```
web_fetch: { url: "https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false&steps=true", mode: "raw" }
```

**Important:** OSRM uses `{longitude},{latitude}` order (lon first, lat second).

Format: `/route/v1/{mode}/{lon1},{lat1};{lon2},{lat2}`
Modes: `driving`, `walking`, `cycling`

Response fields:
- `routes[0].distance` — total distance in **meters** → convert to miles (÷ 1609.34) or km (÷ 1000)
- `routes[0].duration` — total time in **seconds** → convert to minutes/hours
- `routes[0].legs[0].steps` — turn-by-turn directions

Multi-stop route: chain coordinates with `;` — e.g. `lon1,lat1;lon2,lat2;lon3,lat3`

## Step-by-Step Workflow

1. Geocode the origin → get `(lat1, lon1)`
2. Geocode the destination → get `(lat2, lon2)`
3. Call OSRM with `lon1,lat1;lon2,lat2` (lon first!)
4. Extract distance and duration; convert units
5. Present result to user (e.g. "142 miles, ~2 hr 18 min driving")

## Key Behaviors
- Always geocode first, then route
- Convert meters→miles/km and seconds→minutes/hours
- If location is ambiguous (multiple results), show top 3 and ask the user
- PUBLIC classification
- Rate limits: max 1 req/sec to Nominatim, 5 routing req/min to OSRM
