# Portal Sync API Integration Summary

## Backend API Endpoints

The following endpoints are available in the backend (`app/api/portal_sync.py`):

### 1. POST `/api/v1/portal-sync/trigger`
**Purpose**: Trigger synchronization (foreground, blocking)
**Request Body**:
```json
{
  "force_sync": false
}
```
**Response**:
```json
{
  "success": true,
  "message": "Portal synchronization completed",
  "result": {
    "status": "completed",
    "total_documents": 100,
    "new_documents": 10,
    "updated_documents": 5,
    "failed_documents": 0,
    "skipped_documents": 85,
    "sync_duration_seconds": 12.5,
    "errors": [],
    "warnings": [],
    "timestamp": "2024-01-01T12:00:00"
  }
}
```

### 2. POST `/api/v1/portal-sync/trigger-background`
**Purpose**: Trigger synchronization (background, non-blocking)
**Request Body**:
```json
{
  "force_sync": false
}
```
**Response**:
```json
{
  "success": true,
  "message": "Portal synchronization started in background",
  "status": "in_progress"
}
```

### 3. GET `/api/v1/portal-sync/status`
**Purpose**: Get current synchronization status
**Response**:
```json
{
  "success": true,
  "status": {
    "last_sync_time": "2024-01-01T12:00:00",
    "total_synced_documents": 100,
    "sync_interval_hours": 24,
    "next_sync_due": "2024-01-02T12:00:00",
    "configured_portals": 5,
    "enabled_portals": 4
  }
}
```

### 4. GET `/api/v1/portal-sync/portals`
**Purpose**: Get list of configured portals
**Response**:
```json
{
  "success": true,
  "total_portals": 5,
  "portals": [
    {
      "name": "PM-KISAN",
      "url": "https://pmkisan.gov.in",
      "scheme_type": "subsidy",
      "enabled": true
    }
  ]
}
```

### 5. GET `/api/v1/portal-sync/documents`
**Purpose**: Get synced documents with pagination
**Query Parameters**:
- `limit` (default: 50) - Number of documents per page
- `offset` (default: 0) - Offset for pagination

**Response**:
```json
{
  "success": true,
  "total_documents": 100,
  "limit": 50,
  "offset": 0,
  "documents": [
    {
      "scheme_id": "PM-KISAN-001",
      "scheme_name": "PM-KISAN Scheme",
      "source_url": "https://pmkisan.gov.in/scheme",
      "last_updated": "2024-01-01T12:00:00",
      "content_hash": "abc123",
      "metadata": {}
    }
  ]
}
```

### 6. GET `/api/v1/portal-sync/health`
**Purpose**: Check sync service health
**Response**:
```json
{
  "success": true,
  "health_status": "healthy",
  "issues": [],
  "service_info": {
    "total_synced_documents": 100,
    "enabled_portals": 4,
    "last_sync_time": "2024-01-01T12:00:00"
  }
}
```

## Frontend Service Implementation

The frontend service (`portalSyncService.js`) provides the following methods:

1. `triggerSync(forceSync)` - Trigger foreground sync
2. `triggerBackgroundSync(forceSync)` - Trigger background sync
3. `getSyncStatus()` - Get sync status
4. `getConfiguredPortals()` - Get portal list
5. `getSyncedDocuments(params)` - Get documents with pagination
6. `getSyncHealth()` - Get health status

## Frontend Page Features

The PortalSync admin page (`PortalSync.jsx`) displays:

1. **Sync Status Overview**
   - Health status
   - Active portals count
   - Total documents count
   - Last sync time

2. **Configured Portals**
   - List of all configured portals
   - Portal status (enabled/disabled)
   - Portal URL and type

3. **Synced Documents**
   - Paginated list of synced documents
   - Scheme name and ID
   - Source URL
   - Last updated timestamp

4. **Actions**
   - Trigger sync button
   - Refresh data button
   - Pagination controls

## Integration Status

✅ All backend endpoints are properly integrated
✅ Error handling for missing endpoints
✅ Graceful degradation when data is unavailable
✅ Type checking to prevent rendering errors
✅ Pagination support for documents
✅ Real-time status updates

## Notes

- The frontend uses background sync by default to avoid blocking the UI
- All API calls have error handling with fallback values
- The page auto-refreshes data after triggering a sync
- Pagination uses offset-based approach matching the backend
