# Code Splitting Guide

This guide explains the code splitting implementation in the React frontend application.

## Overview

Code splitting is implemented using React.lazy() and dynamic imports to reduce initial bundle size and improve load times. The application is split into multiple chunks that are loaded on demand.

## Implementation

### 1. Route-Based Code Splitting

All routes are lazy-loaded using React.lazy() with retry logic:

```javascript
import { lazy } from 'react';
import { lazyLoadWithRetry } from '../utils/lazyLoad';

export const Dashboard = lazy(() => 
  lazyLoadWithRetry(() => import('../pages/user/Dashboard'))
);
```

### 2. Vendor Chunk Splitting

Large vendor libraries are split into separate chunks for better caching:

- `react-vendor`: React core libraries
- `redux-vendor`: Redux Toolkit and React Redux
- `chart-vendor`: Chart.js and react-chartjs-2
- `map-vendor`: Leaflet and react-leaflet
- `ui-vendor`: React Icons and React Spinners
- `form-vendor`: React Hook Form
- `i18n-vendor`: i18next and react-i18next

### 3. Retry Logic

Failed chunk loads are automatically retried up to 3 times:

```javascript
import { lazyLoadWithRetry } from '../utils/lazyLoad';

const Component = lazy(() => 
  lazyLoadWithRetry(() => import('./Component'), 3)
);
```

### 4. Component Prefetching

Components can be prefetched to improve perceived performance:

```javascript
import { usePrefetch } from '../hooks/usePrefetch';

// Prefetch on mount
usePrefetch([
  () => import('./HeavyComponent1'),
  () => import('./HeavyComponent2'),
]);

// Prefetch on hover
const handlePrefetch = usePrefetchOnHover(() => import('./Component'));
<Link to="/page" onMouseEnter={handlePrefetch}>Page</Link>
```

### 5. Route Prefetching

Routes are automatically prefetched based on user role:

```javascript
import { usePrefetchRoutes } from '../hooks/usePrefetch';

const user = useSelector(state => state.auth.user);
usePrefetchRoutes(user?.role);
```

## Best Practices

### When to Use Code Splitting

1. **Route-level splitting**: Always split at route boundaries
2. **Heavy components**: Split components that are:
   - Large in size (>50KB)
   - Not needed on initial render
   - Used conditionally (modals, tabs)
3. **Third-party libraries**: Split large libraries that aren't used everywhere

### When NOT to Use Code Splitting

1. **Small components**: Don't split components <10KB
2. **Critical path**: Don't split components needed for initial render
3. **Frequently used**: Don't split components used on every page

### Performance Tips

1. **Prefetch likely routes**: Use `usePrefetch` for routes users are likely to visit
2. **Prefetch on hover**: Prefetch route components when user hovers over links
3. **Monitor bundle size**: Keep chunks under 200KB for optimal loading
4. **Use Suspense boundaries**: Wrap lazy components in Suspense with loading fallbacks

## Monitoring

### Bundle Analysis

Run bundle analysis to see chunk sizes:

```bash
npm run build
npx vite-bundle-visualizer
```

### Performance Metrics

Monitor these metrics:
- Initial bundle size: Target <500KB gzipped
- Time to Interactive (TTI): Target <3s on 3G
- First Contentful Paint (FCP): Target <1.5s
- Largest Contentful Paint (LCP): Target <2.5s

## Troubleshooting

### Chunk Load Errors

If users see "Loading chunk failed" errors:
1. Check network connectivity
2. Verify CDN/server is serving chunks correctly
3. Ensure retry logic is working
4. Check browser console for specific errors

### Large Bundle Size

If bundle size is too large:
1. Run bundle analyzer to identify large chunks
2. Split large vendor libraries
3. Remove unused dependencies
4. Use tree-shaking for libraries that support it

### Slow Loading

If chunks load slowly:
1. Enable compression (gzip/brotli) on server
2. Use CDN for static assets
3. Prefetch critical routes
4. Optimize chunk sizes (aim for 100-200KB per chunk)

## Configuration

### Vite Configuration

Code splitting is configured in `vite.config.js`:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        // ... other chunks
      },
    },
  },
}
```

### Chunk Size Limits

Adjust chunk size warning limit:

```javascript
build: {
  chunkSizeWarningLimit: 1000, // KB
}
```

## Examples

### Lazy Load Modal

```javascript
import { lazy, Suspense, useState } from 'react';

const Modal = lazy(() => import('./Modal'));

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Open Modal</button>
      {showModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <Modal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Lazy Load Tab Content

```javascript
import { lazy, Suspense } from 'react';

const Tab1 = lazy(() => import('./Tab1'));
const Tab2 = lazy(() => import('./Tab2'));

function Tabs() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <>
      <button onClick={() => setActiveTab('tab1')}>Tab 1</button>
      <button onClick={() => setActiveTab('tab2')}>Tab 2</button>
      
      <Suspense fallback={<div>Loading...</div>}>
        {activeTab === 'tab1' && <Tab1 />}
        {activeTab === 'tab2' && <Tab2 />}
      </Suspense>
    </>
  );
}
```

## Resources

- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web.dev Code Splitting Guide](https://web.dev/code-splitting-suspense/)
