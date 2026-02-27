# Redux Store Documentation

## Overview

This directory contains the Redux store configuration and state management logic for the Agri-Civic Intelligence Platform frontend application.

## Structure

```
store/
├── index.js              # Store configuration and setup
├── slices/               # Redux Toolkit slices
│   ├── authSlice.js     # Authentication state
│   ├── userSlice.js     # User profile state
│   ├── chatSlice.js     # Chat state
│   └── ...              # Additional slices
└── api/                  # RTK Query API (optional)
    └── apiSlice.js      # API endpoints
```

## Store Configuration

The store is configured with:

- **Redux Toolkit**: Simplified Redux logic with `configureStore`
- **Redux DevTools**: Enabled in development for debugging
- **Custom Middleware**: Configured for handling non-serializable values
- **Thunk Middleware**: Enabled for async actions

## Middleware Configuration

### Serializable Check

The store is configured to handle non-serializable values with specific exceptions:

- **Ignored Actions**: `persist/PERSIST`, `persist/REHYDRATE`
- **Ignored Action Paths**: `meta.arg`, `payload.timestamp`
- **Ignored State Paths**: `socket.connection`

This allows the store to work with:
- File objects (for image/audio uploads)
- Date objects
- Socket.IO connections
- Functions in actions (for callbacks)

### Immutability Check

Enabled in development to catch state mutation bugs early.

## Redux DevTools

Redux DevTools is enabled in development with:

- **Name**: "Agri-Civic Intelligence Platform"
- **Trace**: Enabled for action stack traces
- **Trace Limit**: 25 actions

## Adding New Slices

To add a new slice to the store:

1. Create the slice file in `slices/` directory:

```javascript
// slices/exampleSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  loading: false,
  error: null,
};

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    setData: (state, action) => {
      state.data = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setData, setLoading, setError } = exampleSlice.actions;
export default exampleSlice.reducer;
```

2. Import and add to the store in `index.js`:

```javascript
import exampleReducer from './slices/exampleSlice';

const rootReducer = {
  example: exampleReducer,
  // ... other slices
};
```

## Using the Store

### In Components

Use React-Redux hooks to access the store:

```javascript
import { useSelector, useDispatch } from 'react-redux';
import { setData } from '../store/slices/exampleSlice';

function MyComponent() {
  const data = useSelector((state) => state.example.data);
  const dispatch = useDispatch();

  const handleUpdate = () => {
    dispatch(setData({ value: 'new data' }));
  };

  return <div>{data}</div>;
}
```

### Async Actions with Thunks

Create async thunks for API calls:

```javascript
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchData = createAsyncThunk(
  'example/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/endpoint', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
```

## Best Practices

1. **Keep slices focused**: Each slice should manage a specific domain of state
2. **Use createAsyncThunk**: For async operations with loading/error states
3. **Normalize state**: Use normalized state shape for complex data
4. **Use selectors**: Create reusable selectors for derived state
5. **Avoid mutations**: Redux Toolkit uses Immer, but be aware of mutation rules
6. **Type safety**: Consider migrating to TypeScript for better type safety

## Planned Slices

Based on the requirements, the following slices will be implemented:

- `authSlice`: Authentication state (token, isAuthenticated, user role)
- `userSlice`: Current user profile and preferences
- `chatSlice`: Chat messages and session state
- `notificationSlice`: Notifications and unread count
- `weatherSlice`: Weather data cache
- `marketSlice`: Market prices and favorites
- `schemeSlice`: Government schemes and bookmarks

## RTK Query (Optional)

For advanced API caching and data fetching, RTK Query can be added:

```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    // Define endpoints here
  }),
});
```

Add to store:

```javascript
import { apiSlice } from './api/apiSlice';

const rootReducer = {
  [apiSlice.reducerPath]: apiSlice.reducer,
  // ... other slices
};

// Add RTK Query middleware
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware().concat(apiSlice.middleware),
```
