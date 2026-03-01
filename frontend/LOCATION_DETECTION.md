# User Location Detection Guide

## Overview
The weather dashboard uses multiple methods to determine the user's location, with a priority-based fallback system.

## Location Detection Methods

### 1. User Profile Location (Highest Priority)
**Source:** User's saved location in their profile  
**Format:** City name or coordinates  
**Availability:** When user has set location in their profile

```typescript
// From auth store
if (authStore.user?.location) {
  location.value = authStore.user.location;
}
```

**Advantages:**
- No permission required
- Instant availability
- User's preferred location
- Works offline

**Disadvantages:**
- May be outdated if user travels
- Requires user to set it initially

### 2. Browser Geolocation API (Medium Priority)
**Source:** Browser's Geolocation API  
**Format:** Latitude,Longitude coordinates  
**Availability:** When user grants location permission

```typescript
const { getCurrentPosition } = useGeolocation();
const coords = await getCurrentPosition();
// Returns: { latitude: 28.6139, longitude: 77.2090 }
```

**Advantages:**
- Accurate current location
- Automatic detection
- Real-time updates available

**Disadvantages:**
- Requires user permission
- May not work on HTTP (needs HTTPS)
- Battery drain if watching position
- Privacy concerns

**Browser Support:**
- ✅ Chrome, Firefox, Safari, Edge (all modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ❌ Older browsers (IE)

### 3. Default Location (Fallback)
**Source:** Hardcoded default  
**Format:** City name  
**Availability:** Always

```typescript
location.value = 'New Delhi';
```

**Advantages:**
- Always available
- No permissions needed
- Instant

**Disadvantages:**
- May not be relevant to user
- Static, doesn't update

## Implementation Details

### Geolocation Composable (`useGeolocation.ts`)

The `useGeolocation` composable provides a clean interface for location detection:

```typescript
import { useGeolocation } from '@/composables/useGeolocation';

const {
  coordinates,        // Current coordinates
  error,             // Error state
  loading,           // Loading state
  isSupported,       // Browser support check
  getCurrentPosition, // Get current position once
  watchPosition,     // Watch for position changes
  clearWatch,        // Stop watching
  formatCoordinates  // Format for API calls
} = useGeolocation();
```

### Usage in WeatherDashboard

```typescript
// 1. Check if geolocation is supported
if (isGeolocationSupported) {
  // Show "Use My Location" button
}

// 2. Get current location when button clicked
const useCurrentLocation = async () => {
  try {
    const coords = await getCurrentPosition();
    location.value = formatCoordinates(coords);
    await loadWeatherData();
  } catch (err) {
    // Handle permission denied or other errors
  }
};

// 3. Initialize with priority order
const initializeLocation = () => {
  if (authStore.user?.location) {
    // Use profile location
    location.value = authStore.user.location;
  } else {
    // Use default
    location.value = 'New Delhi';
  }
  loadWeatherData();
};
```

## Location Formats

The weather API accepts multiple location formats:

### 1. City Name
```
"New Delhi"
"Mumbai"
"Bangalore"
```

### 2. Coordinates (Lat,Lon)
```
"28.6139,77.2090"  // New Delhi
"19.0760,72.8777"  // Mumbai
```

### 3. City with Country
```
"Delhi,IN"
"Mumbai,IN"
```

## Error Handling

### Geolocation Errors

```typescript
// Error codes from browser Geolocation API
switch (error.code) {
  case 1: // PERMISSION_DENIED
    message = 'Location permission denied. Please enable location access.';
    break;
  case 2: // POSITION_UNAVAILABLE
    message = 'Location information unavailable.';
    break;
  case 3: // TIMEOUT
    message = 'Location request timed out.';
    break;
}
```

### Fallback Strategy

```typescript
try {
  // Try geolocation
  const coords = await getCurrentPosition();
  location.value = formatCoordinates(coords);
} catch (err) {
  // Fall back to manual entry or default
  error.value = 'Could not get location. Please enter manually.';
  location.value = 'New Delhi'; // Default
}
```

## User Experience Flow

### First Visit
1. App loads with default location (New Delhi)
2. Weather data loads automatically
3. User sees "Use My Location" button (if supported)
4. User can click to use current location or type manually

### With Profile Location
1. App loads with user's saved location
2. Weather data loads automatically
3. User can still override with current location or manual entry

### Permission Flow
1. User clicks "Use My Location"
2. Browser shows permission prompt
3. If granted: Location detected and weather loads
4. If denied: Error message shown, manual entry suggested

## Privacy Considerations

### What We Store
- ❌ We do NOT store GPS coordinates
- ✅ We only store user's preferred location (if they set it)
- ✅ Location is only used for weather API calls
- ✅ No location tracking or history

### User Control
- Users can always enter location manually
- Users can deny geolocation permission
- Users can clear their profile location
- No location data is required to use the app

## Advanced Features

### Watch Position (Continuous Updates)
For real-time location tracking (not currently implemented):

```typescript
const watchId = watchPosition((coords) => {
  location.value = formatCoordinates(coords);
  loadWeatherData();
});

// Stop watching when component unmounts
onBeforeUnmount(() => {
  if (watchId) clearWatch(watchId);
});
```

### Geocoding (City Name → Coordinates)
To convert city names to coordinates (requires Maps API):

```typescript
// Future enhancement
const geocodeLocation = async (cityName: string) => {
  const response = await mapsService.geocode(cityName);
  return {
    latitude: response.lat,
    longitude: response.lng
  };
};
```

### Reverse Geocoding (Coordinates → City Name)
To convert coordinates to readable location:

```typescript
// Future enhancement
const reverseGeocode = async (lat: number, lon: number) => {
  const response = await mapsService.reverseGeocode(lat, lon);
  return response.city; // "New Delhi"
};
```

## Testing

### Test Geolocation in Browser

1. **Chrome DevTools:**
   - Open DevTools (F12)
   - Click "..." → More tools → Sensors
   - Override geolocation with custom coordinates

2. **Firefox:**
   - Type `about:config` in address bar
   - Search for `geo.enabled`
   - Toggle to test permission denied

3. **Manual Testing:**
   ```javascript
   // In browser console
   navigator.geolocation.getCurrentPosition(
     (pos) => console.log(pos.coords),
     (err) => console.error(err)
   );
   ```

## Configuration

### Geolocation Options

```typescript
{
  enableHighAccuracy: true,  // Use GPS if available
  timeout: 10000,            // 10 second timeout
  maximumAge: 300000         // Cache for 5 minutes
}
```

### Default Location
Change in `WeatherDashboard.vue`:

```typescript
location.value = 'Your City'; // Change default here
```

## Future Enhancements

1. **IP-based Location Detection**
   - Use IP geolocation as fallback
   - No permission required
   - Less accurate but better than default

2. **Location History**
   - Remember recent locations
   - Quick access to frequently used locations

3. **Multiple Locations**
   - Save multiple favorite locations
   - Quick switch between them

4. **Auto-detect on Login**
   - Detect location when user logs in
   - Update profile automatically (with permission)

5. **Location Sharing**
   - Share weather with other users
   - Compare weather across locations
