# Weather Dashboard Location Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Weather Page                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Check User     │
                    │ Profile        │
                    └────────┬───────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │ Has Location? │         │ No Location  │
        │ ✓ Yes         │         │ ✗ No         │
        └───────┬───────┘         └──────┬───────┘
                │                         │
                │                         ▼
                │                 ┌──────────────┐
                │                 │ Use Default  │
                │                 │ "New Delhi"  │
                │                 └──────┬───────┘
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Load Weather   │
                    │ Data from API  │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Display        │
                    │ Dashboard      │
                    └────────────────┘
```

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Weather Dashboard UI                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ [📍] Location: [New Delhi        ] [🎯] [🔄]      │    │
│  │                                                     │    │
│  │  🎯 = Use My Location Button                       │    │
│  │  🔄 = Refresh Button                               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Option 1: Use Current Location

```
User clicks "Use My Location" button
         │
         ▼
┌────────────────────┐
│ Browser asks for   │
│ permission         │
└────────┬───────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│ Allow │ │  Deny    │
└───┬───┘ └────┬─────┘
    │          │
    │          ▼
    │     ┌──────────────────┐
    │     │ Show error:      │
    │     │ "Permission      │
    │     │  denied"         │
    │     └──────────────────┘
    │
    ▼
┌──────────────────┐
│ Get GPS coords   │
│ 28.6139,77.2090  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Load weather for │
│ coordinates      │
└──────────────────┘
```

### Option 2: Manual Entry

```
User types in location field
         │
         ▼
┌────────────────────┐
│ User types:        │
│ "Mumbai"           │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Press Enter or     │
│ Click Refresh      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Load weather for   │
│ "Mumbai"           │
└────────────────────┘
```

### Option 3: Use Profile Location

```
User has saved location in profile
         │
         ▼
┌────────────────────┐
│ Auto-load on page  │
│ open with profile  │
│ location           │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Display weather    │
│ for saved location │
└────────────────────┘
```

## Location Priority System

```
Priority 1: User Profile Location
    ↓ (if not available)
Priority 2: Manual Entry
    ↓ (if not entered)
Priority 3: Geolocation (on button click)
    ↓ (if permission denied)
Priority 4: Default Location (New Delhi)
```

## Data Flow

```
┌──────────────┐
│   Frontend   │
│  Dashboard   │
└──────┬───────┘
       │
       │ 1. Get location
       │    (profile/geo/manual)
       │
       ▼
┌──────────────┐
│   Weather    │
│   Service    │
└──────┬───────┘
       │
       │ 2. Format location
       │    for API call
       │
       ▼
┌──────────────┐
│   Backend    │
│   Weather    │
│     API      │
└──────┬───────┘
       │
       │ 3. Parse location
       │    (city or coords)
       │
       ▼
┌──────────────┐
│  OpenWeather │
│     API      │
└──────┬───────┘
       │
       │ 4. Return weather
       │    data
       │
       ▼
┌──────────────┐
│   Display    │
│   on UI      │
└──────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────┐
│                  WeatherDashboard.vue                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         useGeolocation() composable             │    │
│  │  - getCurrentPosition()                         │    │
│  │  - formatCoordinates()                          │    │
│  │  - error handling                               │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         useAuthStore()                          │    │
│  │  - user.location                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         weatherService                          │    │
│  │  - getCurrentWeather()                          │    │
│  │  - getForecast()                                │    │
│  │  - getAlerts()                                  │    │
│  │  - getAgriculturalInsights()                    │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────┐
│                    Component State                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  location: ref<string>('')                              │
│    - Current location string                            │
│    - Can be city name or coordinates                    │
│                                                          │
│  loading: ref<boolean>(false)                           │
│    - True while fetching weather data                   │
│                                                          │
│  gettingLocation: ref<boolean>(false)                   │
│    - True while getting GPS location                    │
│                                                          │
│  error: ref<string | null>(null)                        │
│    - Error message if any operation fails               │
│                                                          │
│  currentWeather: ref<WeatherCurrent | null>(null)       │
│    - Current weather data                               │
│                                                          │
│  forecast: ref<WeatherForecast[]>([])                   │
│    - 7-day forecast array                               │
│                                                          │
│  alerts: ref<WeatherAlert[]>([])                        │
│    - Active weather alerts                              │
│                                                          │
│  agriculturalInsights: ref<AgriculturalInsight | null>  │
│    - Farming recommendations                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Error Scenarios                       │
└─────────────────────────────────────────────────────────┘
         │
         ├─► Geolocation Permission Denied
         │   └─► Show: "Permission denied. Please enter manually."
         │
         ├─► Geolocation Timeout
         │   └─► Show: "Location request timed out."
         │
         ├─► Network Error
         │   └─► Show: "Network error. Check connection."
         │
         ├─► API Error (401)
         │   └─► Show: "Authentication required. Please log in."
         │
         ├─► API Error (404)
         │   └─► Show: "Weather service not found."
         │
         └─► API Error (500)
             └─► Show: "Failed to load weather data."
```

## Browser Compatibility

```
┌─────────────────────────────────────────────────────────┐
│              Geolocation API Support                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Chrome 5+                                           │
│  ✅ Firefox 3.5+                                        │
│  ✅ Safari 5+                                           │
│  ✅ Edge (all versions)                                 │
│  ✅ Opera 10.6+                                         │
│  ✅ iOS Safari 3.2+                                     │
│  ✅ Android Browser 2.1+                                │
│  ✅ Chrome Mobile                                       │
│  ❌ Internet Explorer 8 and below                       │
│                                                          │
│  Note: HTTPS required for geolocation in modern         │
│        browsers (except localhost)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Security & Privacy

```
┌─────────────────────────────────────────────────────────┐
│                  Privacy Measures                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Location only requested when user clicks button      │
│  ✓ No automatic location tracking                       │
│  ✓ No location history stored                           │
│  ✓ Coordinates only used for weather API call           │
│  ✓ User can always deny permission                      │
│  ✓ Manual entry always available as alternative         │
│  ✓ Profile location is optional                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
