---
name: weather
version: 1.0.0
description: >
  Fetch current weather and forecasts using web_fetch.
  Uses wttr.in (no API key) or OpenWeatherMap (with API key).
classification_ceiling: PUBLIC
requires_tools:
  - web_fetch
network_domains:
  - wttr.in
  - api.openweathermap.org
---

# Weather

Fetch weather using `web_fetch`. No special tools needed.

## wttr.in (Default, No API Key)

### Current Weather (JSON)

```
web_fetch: { url: "https://wttr.in/Austin,Texas?format=j1" }
```

Returns JSON: current conditions, 3-day forecast, location info.

### Compact Format

```
web_fetch: { url: "https://wttr.in/Austin,Texas?format=%C+%t+%h+%w" }
```

Returns: "Sunny +72°F 45% →11mph"

### Format Codes

- `%C` condition, `%t` temp, `%f` feels-like, `%h` humidity, `%w` wind, `%p`
  precip, `%P` pressure

### Location Formats

- City: `wttr.in/London`
- City,Country: `wttr.in/Paris,France`
- Airport: `wttr.in/JFK`
- Coords: `wttr.in/37.7749,-122.4194`
- ZIP: `wttr.in/10001`

## OpenWeatherMap (With API Key)

If configured in `integrations.openweathermap.api_key`:

```
web_fetch: { url: "https://api.openweathermap.org/data/2.5/weather?q=Austin,Texas&appid={KEY}&units=imperial" }
```

## Key Behaviors

- Default to wttr.in (no API key needed)
- Imperial for US, metric elsewhere
- If no location specified, ask the user
- Weather data is PUBLIC classification
- Max 10 weather requests per minute
