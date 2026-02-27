# Layout Components

This directory contains the main layout components for the Agri-Civic Intelligence Platform frontend application.

## Components

### Header.jsx
Main navigation header component with:
- Logo and app title
- User menu with profile and logout options
- Notification bell with unread count badge
- Language selector with 10 regional languages
- Mobile menu toggle button
- Responsive design

**Requirements:** 10.1, 11.1

**Features:**
- Displays user information from Redux store
- Shows notification count badge
- Language selection with native language names
- Click-outside detection for dropdown menus
- Mobile-responsive with hamburger menu

### Sidebar.jsx
Navigation sidebar component with:
- Role-based menu items (user vs admin)
- Active route highlighting using NavLink
- Collapsible on mobile with overlay
- User information footer
- Responsive design

**Requirements:** 4.3

**Features:**
- Different navigation items for regular users and admins
- Active route highlighting with green background
- Mobile overlay that closes on click
- Auto-close on navigation for mobile devices
- User role badge in footer

### MainLayout.jsx
Main application layout combining Header, Sidebar, and content area:
- Sticky header at top
- Sidebar on left (collapsible on mobile)
- Content area with Outlet for nested routes
- Responsive layout with Tailwind CSS

**Requirements:** 15.1-15.6

**Features:**
- Mobile-first responsive design
- Proper height calculations for full viewport
- Scrollable content area
- State management for mobile menu

## Usage

```jsx
import { MainLayout } from './components/layout';

// In App.jsx or routing configuration
<Route element={<MainLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
  {/* Other routes */}
</Route>
```

## Integration with App.jsx

The MainLayout is integrated into the routing structure to wrap all protected and admin routes:

```jsx
// Protected Routes with MainLayout
<Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
  {protectedRoutes.map((route) => (
    <Route key={route.path} path={route.path} element={<route.element />} />
  ))}
</Route>

// Admin Routes with MainLayout
<Route element={<AdminRoute><MainLayout /></AdminRoute>}>
  {adminRoutes.map((route) => (
    <Route key={route.path} path={route.path} element={<route.element />} />
  ))}
</Route>
```

## State Management

The layout components use Redux for state management:

- **authSlice**: User authentication and user data
- **userSlice**: User preferences including language
- **notificationSlice**: Notification count and items

## Responsive Behavior

### Desktop (≥1024px)
- Sidebar always visible
- Full header with all elements
- Content area takes remaining space

### Tablet (768px - 1023px)
- Sidebar hidden by default, toggleable
- Full header with all elements
- Overlay when sidebar is open

### Mobile (<768px)
- Sidebar hidden by default, toggleable
- Compact header with hamburger menu
- Full-screen overlay when sidebar is open
- Simplified user menu

## Testing

All layout components have comprehensive test coverage:

- `Header.test.jsx`: Tests for header functionality
- `Sidebar.test.jsx`: Tests for sidebar navigation
- `MainLayout.test.jsx`: Tests for layout integration

Run tests with:
```bash
npm test src/components/layout
```

## Styling

All components use Tailwind CSS for styling with:
- Utility-first approach
- Responsive breakpoints (sm, md, lg)
- Custom color scheme (green primary)
- Consistent spacing and shadows
- Smooth transitions and animations
