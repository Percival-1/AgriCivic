# Loading States Implementation Guide

## Overview

This document describes the loading state implementation across the React frontend application, ensuring consistent user feedback during asynchronous operations.

## Requirements

**Requirement 16.1**: WHEN Backend_API request is in progress, THE Frontend_Application SHALL display loading indicator using React Spinners

## Implementation

### 1. React Spinners Library

The application uses the `react-spinners` library for all loading indicators.

**Installed Package**: `react-spinners@^0.13.8`

**Primary Spinner Used**: `ClipLoader` - A circular loading spinner that provides clean, professional loading feedback.

### 2. Loader Component

**Location**: `src/components/common/Loader.jsx`

The centralized Loader component provides:
- Inline loading indicators
- Full-screen loading overlays
- Customizable size and color
- Optional loading text

**Usage Examples**:

```jsx
import Loader from '../../components/common/Loader';

// Inline loader
<Loader size={40} text="Loading data..." />

// Full-screen loader
<Loader fullScreen text="Loading application..." />

// Custom color
<Loader color="#10B981" size={50} />
```

### 3. Skeleton Loaders

**Location**: `src/components/common/SkeletonLoader.jsx`

Skeleton loaders provide better UX by showing content placeholders while data loads.

**Available Types**:
- `text` - Text line skeletons
- `title` - Title/heading skeletons
- `card` - Card component skeletons
- `avatar` - Circular avatar skeletons
- `table` - Table row skeletons
- `list` - List item skeletons
- `chart` - Chart placeholder skeletons
- `image` - Image placeholder skeletons

**Predefined Layouts**:
- `DashboardSkeleton` - Complete dashboard loading state
- `TableSkeleton` - Table with multiple rows
- `ListSkeleton` - List with multiple items
- `CardSkeleton` - Multiple card placeholders
- `ProfileSkeleton` - Profile page loading state

**Usage Examples**:

```jsx
import SkeletonLoader, { TableSkeleton, DashboardSkeleton } from '../../components/common/SkeletonLoader';

// Basic skeleton
<SkeletonLoader type="text" count={3} />

// Table skeleton
<TableSkeleton rows={10} />

// Dashboard skeleton
<DashboardSkeleton />
```

### 4. Loading State Patterns

#### Pattern 1: Full Page Loading

Used when the entire page content depends on data:

```jsx
if (loading) {
    return <Loader fullScreen text="Loading..." />;
}
```

**Examples**:
- `src/pages/user/Dashboard.jsx`
- `src/pages/admin/Users.jsx`
- `src/pages/admin/UserDetails.jsx`
- `src/pages/admin/AdminDashboard.jsx`

#### Pattern 2: Section Loading

Used for loading specific sections while keeping the page structure:

```jsx
{loading ? (
    <div className="flex justify-center py-8">
        <ClipLoader color="#3B82F6" size={40} />
    </div>
) : (
    <ContentComponent data={data} />
)}
```

**Examples**:
- `src/pages/user/Weather.jsx` - Weather sections
- `src/pages/user/Market.jsx` - Market data sections
- `src/pages/user/Schemes.jsx` - Scheme lists
- `src/pages/user/Notifications.jsx` - Notification preferences

#### Pattern 3: Inline Button Loading

Used for action buttons during async operations:

```jsx
<Button disabled={loading}>
    {loading ? (
        <ClipLoader color="#ffffff" size={16} />
    ) : (
        'Submit'
    )}
</Button>
```

**Examples**:
- `src/pages/user/Notifications.jsx` - Mark all as read button
- Form submission buttons throughout the app

#### Pattern 4: Skeleton Loading

Used for better perceived performance:

```jsx
{loading ? (
    <TableSkeleton rows={5} />
) : (
    <table>
        {/* Table content */}
    </table>
)}
```

**Best for**:
- Tables with multiple rows
- Lists with multiple items
- Dashboard cards
- Profile information

### 5. Loading States by Page

#### User Pages

| Page | Loading Implementation | Type |
|------|----------------------|------|
| Dashboard | Full-screen Loader | ClipLoader |
| Profile | Loader component | ClipLoader |
| Chat | Typing indicator | ClipLoader |
| Weather | Section loaders | ClipLoader |
| Market | Section loaders | ClipLoader |
| Schemes | Section loaders | ClipLoader |
| Notifications | Full-screen + section | ClipLoader |
| Disease Detection | Upload progress | ClipLoader |
| Speech Services | Processing indicator | ClipLoader |

#### Admin Pages

| Page | Loading Implementation | Type |
|------|----------------------|------|
| Admin Dashboard | Full-screen Loader | ClipLoader |
| Users | Full-screen + table | ClipLoader |
| User Details | Full-screen Loader | ClipLoader |
| Monitoring | Full-screen + sections | ClipLoader |
| Cache Management | Coming Soon (Task 29) | - |
| Performance | Coming Soon (Task 31) | - |
| Portal Sync | Coming Soon (Task 32) | - |
| Knowledge Base | Coming Soon (Task 33) | - |
| LLM Management | Coming Soon (Task 34) | - |

### 6. Best Practices

#### DO:
✅ Use `ClipLoader` for consistency across the app
✅ Show loading text for operations that might take time
✅ Use full-screen loaders for initial page loads
✅ Use section loaders for partial updates
✅ Use skeleton loaders for better perceived performance
✅ Disable interactive elements during loading
✅ Provide visual feedback for all async operations

#### DON'T:
❌ Mix different spinner types unnecessarily
❌ Show loading states for instant operations
❌ Block the entire UI for small updates
❌ Forget to handle loading errors
❌ Use loading states without timeout handling

### 7. Color Scheme

**Primary Loading Color**: `#3B82F6` (blue-500)
- Used for most loading indicators
- Matches the application's primary color scheme

**Button Loading Color**: `#ffffff` (white)
- Used for loading indicators inside colored buttons
- Ensures visibility against button backgrounds

### 8. Accessibility

All loading states include:
- Visual indicators (spinners)
- Optional text descriptions
- Proper ARIA attributes (handled by react-spinners)
- Keyboard navigation support (disabled during loading)

### 9. Performance Considerations

- Spinners are lightweight and performant
- Skeleton loaders use CSS animations (no JavaScript)
- Loading states prevent multiple simultaneous requests
- Auto-refresh intervals are cleared on unmount

### 10. Future Enhancements

Potential improvements for future tasks:
- Progress bars for file uploads
- Estimated time remaining for long operations
- Retry mechanisms with exponential backoff
- Offline detection and queuing
- Optimistic UI updates

## Verification

To verify loading states are working:

1. **Network Throttling**: Use browser DevTools to throttle network to "Slow 3G"
2. **Check Each Page**: Navigate through all pages and verify loading indicators appear
3. **Test Actions**: Click buttons and verify inline loading states
4. **Error Scenarios**: Test with network errors to ensure proper error handling

## Related Files

- `src/components/common/Loader.jsx` - Main loader component
- `src/components/common/SkeletonLoader.jsx` - Skeleton loader components
- `src/components/common/index.js` - Component exports
- All page components in `src/pages/` - Implementation examples

## Task Completion

✅ Task 21.2: Implement loading states
- React Spinners used throughout app
- Skeleton loaders created and exported
- Consistent loading patterns across all pages
- Documentation provided

**Status**: COMPLETE
