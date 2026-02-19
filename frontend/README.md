# Agri-Civic Intelligence Platform - Frontend

Vue.js 3 frontend application for the AI-Driven Agri-Civic Intelligence Platform.

## Technology Stack

- **Framework**: Vue 3.4+ with Composition API
- **Language**: TypeScript 5.3+
- **UI Framework**: Vuetify 3.5+ (Material Design)
- **State Management**: Pinia 2.1+
- **Routing**: Vue Router 4.2+
- **HTTP Client**: Axios 1.6+
- **Form Validation**: VeeValidate 4.12+ with Yup
- **Internationalization**: Vue I18n 9.9+
- **Charts**: Chart.js 4.4+ and ApexCharts 4.0+
- **Maps**: Leaflet 1.9+
- **Build Tool**: Vite 5.0+
- **Testing**: Vitest 1.2+ and Cypress 13.6+

## Project Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your API base URL
# VITE_API_BASE_URL=http://localhost:8000
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── assets/          # Static assets (images, styles)
├── components/      # Vue components
├── composables/     # Composition API utilities
├── layouts/         # Layout components
├── locales/         # i18n translations
├── router/          # Vue Router configuration
├── services/        # API service layer
├── stores/          # Pinia stores
├── types/           # TypeScript types
├── utils/           # Utility functions
├── views/           # Page components
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## Environment Variables

- `VITE_API_BASE_URL`: Backend API base URL (default: http://localhost:8000)

## Features

- User authentication and authorization
- Chat interface with AI assistant
- Crop disease detection via image upload
- Weather information and forecasts
- Market intelligence and price comparison
- Government schemes discovery
- Multi-language support
- Responsive design for mobile and desktop
- Progressive Web App (PWA) capabilities
- Admin dashboard for system management

## Contributing

Please follow the coding standards and run linting before committing:

```bash
npm run lint
npm run format
```

## License

Proprietary - All rights reserved
