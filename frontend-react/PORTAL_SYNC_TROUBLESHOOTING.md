# Portal Sync Troubleshooting Guide

## Issue: "Last Sync: Never" and "Trigger Sync" does nothing

### Step 1: Check Browser Console

Open the browser console (F12 → Console tab) and look for:

1. **When page loads**, you should see:
   ```
   Fetching portal sync data...
   Status data: {...}
   Portals data: {...}
   Documents data: {...}
   Health data: {...}
   ```

2. **When clicking "Trigger Sync"**, you should see:
   ```
   Triggering sync with forceSync: false
   Sync result: {...}
   ```

### Step 2: Check Network Tab

1. Open Network tab (F12 → Network)
2. Click "Trigger Sync" button
3. Look for a POST request to `/api/v1/portal-sync/trigger-background`
4. Check the response:
   - **Status 200**: Success - check response body
   - **Status 401**: Not authenticated - login again
   - **Status 403**: Not authorized - need admin role
   - **Status 500**: Server error - check backend logs

### Step 3: Verify Backend is Running

Check that the backend server is running on `http://localhost:8000`

Test the endpoint directly:
```bash
curl -X POST http://localhost:8000/api/v1/portal-sync/trigger-background \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"force_sync": false}'
```

### Step 4: Check Authentication

The portal sync endpoints require admin authentication. Verify:

1. You're logged in as an admin user
2. Your JWT token is valid
3. The token is being sent in requests (check Network tab → Headers)

### Step 5: Check Backend Logs

Look at the backend console for errors when triggering sync:

```bash
# Look for errors in the backend terminal
# Should see something like:
INFO:     POST /api/v1/portal-sync/trigger-background
INFO:     Triggering background portal sync (force=False)
```

### Common Issues and Solutions

#### Issue: Confirmation Dialog Not Showing
**Symptom**: Nothing happens when clicking "Trigger Sync"
**Solution**: Check if `showConfirmDialog` state is being set. Look for the ConfirmDialog component in the DOM.

#### Issue: API Call Fails Silently
**Symptom**: No error message shown, but sync doesn't work
**Solution**: 
1. Check browser console for errors
2. Verify axios interceptor isn't swallowing errors
3. Check if error state is being set in the component

#### Issue: "Last Sync: Never"
**Symptom**: Always shows "Never" even after successful sync
**Solution**: This is normal if no sync has been run yet. After first successful sync, it should show the timestamp.

#### Issue: Backend Returns 500 Error
**Symptom**: Sync fails with server error
**Possible causes**:
1. RAG engine not initialized
2. Vector database not connected
3. Portal configurations invalid
4. Missing environment variables

**Check backend logs for**:
```python
# In app/services/government_portal_sync.py
logger.error(f"Failed to trigger portal sync: {e}")
```

### Manual Testing

You can test the sync manually from Python:

```python
from app.services.government_portal_sync import government_portal_sync

# Trigger sync
result = await government_portal_sync.sync_all_portals(force_sync=True)
print(result)

# Check status
status = government_portal_sync.get_sync_status()
print(status)
```

### Expected Behavior

1. **First Load**: 
   - Last Sync: "Never"
   - Total Documents: 0
   - Configured Portals: 5 (or however many are configured)

2. **After Clicking "Trigger Sync"**:
   - Confirmation dialog appears
   - After confirming, button shows "Syncing..."
   - Success message appears
   - Page refreshes after 2 seconds
   - Last Sync shows current timestamp
   - Total Documents shows count > 0

3. **After Successful Sync**:
   - Documents table shows synced schemes
   - Portals list shows all configured portals
   - Health status shows "healthy"

### Debug Mode

To enable more detailed logging, add this to the component:

```javascript
// In PortalSync.jsx, add to useEffect
useEffect(() => {
    console.log('Component mounted');
    console.log('Current state:', {
        loading,
        error,
        success,
        syncStatus,
        portals,
        documents,
        health
    });
}, [loading, error, success, syncStatus, portals, documents, health]);
```

### Contact Support

If none of the above helps, provide:
1. Browser console logs
2. Network tab screenshot showing the failed request
3. Backend logs from the time of the request
4. Your user role (admin/user)
