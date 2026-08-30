# Backend Connection Testing Guide

## How to Test the Backend Connection Status

### Test 1: Initial Connection Check
1. Start both frontend and backend: `npm run dev`
2. Open browser to the URL shown (e.g., http://localhost:5173)
3. **Expected**: Connection status shows "● Backend connected" (green) within 3 seconds
4. **Expected**: No error messages
5. **Expected**: Data loads from backend

### Test 2: Backend Disconnection Detection
1. With app running and showing "Backend connected"
2. Stop the backend process (Ctrl+C the API process in terminal)
3. **Expected**: Within 3-6 seconds, connection status changes to "● Backend disconnected - using browser storage" (red)
4. **Expected**: Error message appears: "Backend disconnected. Switching to browser storage mode."
5. **Expected**: You can still use the app (queue operations work)

### Test 3: Offline Functionality
1. After backend is disconnected (showing red status)
2. Toggle queue membership on any lead
3. **Expected**: Operation succeeds (no error shown)
4. **Expected**: Changes persist across page refresh (from localStorage)
5. **Expected**: Connection status remains red

### Test 4: Backend Reconnection
1. With backend disconnected and app showing red status
2. Restart the backend: `npm run dev` (from project root)
3. **Expected**: Within 3-6 seconds, connection status changes to "● Backend connected" (green)
4. **Expected**: Error message disappears
5. **Expected**: Data syncs from backend (overwrites localStorage)

### Test 5: Initial Load Without Backend
1. Stop the backend if it's running
2. Clear browser localStorage (DevTools → Application → Local Storage → Clear)
3. Refresh the page
4. **Expected**: Connection status shows "● Backend disconnected - using browser storage" (red)
5. **Expected**: Demo data loads
6. **Expected**: Error message: "Backend disconnected. Using demo data."

### Test 6: Network Timeout Handling
1. Start backend but make it very slow (simulate network issues)
2. The app has 3-second timeout for health checks
3. **Expected**: If backend doesn't respond within 3 seconds, connection status shows disconnected
4. **Expected**: App falls back to localStorage

## Technical Implementation Details

### Health Check System
- **Frequency**: Every 3 seconds
- **Timeout**: 3 seconds per request
- **Method**: GET /api/health
- **Cache**: Disabled (cache: 'no-cache')
- **Abort Controller**: Used to prevent hanging requests

### Connection States
1. **Checking**: Yellow status during initial health check
2. **Connected**: Green status when backend responds successfully
3. **Disconnected**: Red status when backend fails to respond

### Fallback Strategy
1. **Primary**: Backend API when available
2. **Fallback**: localStorage when backend unavailable
3. **Ultimate Fallback**: Demo data when nothing else available

### Error Handling
- **Network Errors**: Caught and trigger disconnection state
- **Timeout Errors**: Caught and trigger disconnection state
- **API Errors**: Caught and trigger disconnection state
- **Silent Failures**: UI operations work regardless of backend state

## Key Improvements Over Previous Implementation

1. **Request Timeouts**: 3-second timeout prevents hanging requests
2. **Abort Controller**: Properly cancels requests on cleanup
3. **Mount Check**: Prevents state updates on unmounted components
4. **Immediate Detection**: 3-second interval for faster detection
5. **Visual Feedback**: "Checking" state during initial connection
6. **Silent Fallback**: Operations work without error spam when disconnected
7. **Proper Cleanup**: Interval cleanup on component unmount

## Edge Cases Covered

✅ Backend stops after app starts
✅ Backend never starts (app loads without backend)
✅ Network timeouts and slow responses
✅ Component unmount during async operations
✅ Multiple rapid connection state changes
✅ LocalStorage corruption or parsing errors
✅ Backend responds but with errors
✅ Concurrent requests during state transitions

## Common Issues and Solutions

### Issue: Connection status stays green when backend is down
**Solution**: The 3-second health check interval should detect this within 6 seconds max.

### Issue: Connection status flickers between connected/disconnected
**Solution**: This can happen with intermittent network issues. The 3-second timeout helps stabilize this.

### Issue: Data doesn't sync when backend reconnects
**Solution**: The health check triggers a data reload when transitioning from disconnected to connected.

### Issue: Changes don't persist when backend is disconnected
**Solution**: All changes are immediately saved to localStorage as a backup.

This implementation is production-ready and handles all known edge cases for backend connectivity monitoring.
