---
name: maps
description: >
  Geocode addresses and get directions using web_fetch.
  Uses Nominatim (OpenStreetMap) and OSRM — no API key required.
classification_ceiling: PUBLIC
requires_tools:
  - web_fetch
network_domains:
  - nominatim.openstreetmap.org
  - router.project-osrm.org
---

# Maps & Directions

Geocode addresses and get directions using `web_fetch`. Nominatim and OSRM are free, open APIs.

## Geocoding

### Forward (Address → Coordinates)
```
web_fetch: { url: "https://nominatim.openstreetmap.org/search?q=1600+Pennsylvania+Ave+Washington+DC&format=json&limit=1" }
```
Returns JSON with `lat`, `lon`, `display_name`.

### Reverse (Coordinates → Address)
```
web_fetch: { url: "https://nominatim.openstreetmap.org/reverse?lat=38.8977&lon=-77.0365&format=json" }
```

## Directions

```
web_fetch: { url: "https://router.project-osrm.org/route/v1/driving/-122.4194,37.7749;-73.9857,40.7484?overview=full&steps=true" }
```

Format: `/route/v1/{mode}/{lon1},{lat1};{lon2},{lat2}`
Modes: `driving`, `walking`, `cycling`

Response: `routes[0].distance` (meters), `routes[0].duration` (seconds), `routes[0].legs[0].steps` (turn-by-turn)

Multi-stop: chain coordinates with `;`

## Key Behaviors
- Always geocode first, then route
- Convert meters→miles/km and seconds→minutes/hours
- If ambiguous location, show top 3 and ask user
- PUBLIC classification
- Max 1 req/sec to Nominatim, 5 routing req/min to OSRM
