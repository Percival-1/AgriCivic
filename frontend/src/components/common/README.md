# Common UI Components

This directory contains reusable UI components used throughout the application.

## Components

### AppBar.vue
Top navigation bar with user menu, language selector, and notification bell.

**Props:**
- `onToggleDrawer?: () => void` - Callback for toggling navigation drawer

**Features:**
- User avatar with initials
- Language selector dropdown
- Notification bell integration
- User menu with profile and logout options

### NavigationDrawer.vue
Side navigation menu with role-based menu items.

**Props:**
- `modelValue: boolean` - Controls drawer visibility

**Features:**
- Responsive (temporary on mobile, permanent on desktop)
- Role-based menu filtering
- Active route highlighting
- User profile display

### NotificationBell.vue
Notification indicator with dropdown list.

**Features:**
- Badge showing unread count
- Dropdown with recent notifications
- Mark all as read functionality
- Link to full notification center

### LoadingSpinner.vue
Loading indicator for async operations.

**Props:**
- `modelValue: boolean` - Controls visibility
- `message?: string` - Optional loading message
- `size?: number` - Spinner size (default: 64)
- `width?: number` - Spinner width (default: 6)
- `color?: string` - Spinner color (default: 'primary')
- `fullscreen?: boolean` - Fullscreen overlay (default: false)

**Usage:**
```vue
<loading-spinner
  v-model="isLoading"
  message="Loading data..."
  fullscreen
/>
```

### ErrorAlert.vue
Error display component with retry option.

**Props:**
- `modelValue: boolean` - Controls visibility
- `type?: 'error' | 'warning' | 'info' | 'success'` - Alert type (default: 'error')
- `title?: string` - Optional title
- `message: string` - Error message (required)
- `details?: string | object` - Optional error details
- `closable?: boolean` - Show close button (default: true)
- `prominent?: boolean` - Prominent display (default: false)
- `variant?: string` - Vuetify variant (default: 'tonal')
- `showRetry?: boolean` - Show retry button (default: false)

**Events:**
- `update:modelValue` - Emitted when closed
- `retry` - Emitted when retry button clicked

**Usage:**
```vue
<error-alert
  v-model="showError"
  title="Failed to load data"
  message="Unable to connect to server"
  show-retry
  @retry="handleRetry"
/>
```

### ConfirmDialog.vue
Confirmation dialog for user actions.

**Props:**
- `modelValue: boolean` - Controls visibility
- `title?: string` - Dialog title (default: 'Confirm Action')
- `message: string` - Confirmation message (required)
- `warningMessage?: string` - Optional warning text
- `confirmText?: string` - Confirm button text (default: 'Confirm')
- `cancelText?: string` - Cancel button text (default: 'Cancel')
- `confirmColor?: string` - Confirm button color (default: 'primary')
- `cancelColor?: string` - Cancel button color (default: 'grey')
- `confirmVariant?: string` - Confirm button variant (default: 'flat')
- `icon?: string` - Optional icon
- `iconColor?: string` - Icon color (default: 'primary')
- `maxWidth?: string | number` - Dialog max width (default: 500)
- `persistent?: boolean` - Prevent closing on outside click (default: false)
- `loading?: boolean` - Show loading state (default: false)

**Events:**
- `update:modelValue` - Emitted when dialog state changes
- `confirm` - Emitted when confirm button clicked
- `cancel` - Emitted when cancel button clicked

**Usage:**
```vue
<confirm-dialog
  v-model="showConfirm"
  title="Delete Item"
  message="Are you sure you want to delete this item?"
  warning-message="This action cannot be undone"
  confirm-text="Delete"
  confirm-color="error"
  @confirm="handleDelete"
  @cancel="showConfirm = false"
/>
```

## Importing Components

All components can be imported from the index file:

```typescript
import {
  AppBar,
  NavigationDrawer,
  NotificationBell,
  LoadingSpinner,
  ErrorAlert,
  ConfirmDialog,
} from '@/components/common';
```

## Testing

All components have unit tests located in the same directory with `.test.ts` extension.

Run tests:
```bash
npm test src/components/common
```
