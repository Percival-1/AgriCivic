# Agri-Civic Intelligence Platform - React Frontend

A comprehensive React 18 frontend application for the AI-Driven Agri-Civic Intelligence Platform.

## Technology Stack

- **Framework**: React 18+ with Hooks
- **Language**: JavaScript (ES6+)
- **Build Tool**: Vite 5.0+
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS 3.0+
- **Routing**: React Router DOM 6.0+
- **Icons**: React Icons
- **Loaders**: React Spinners
- **HTTP Client**: Axios 1.6+
- **Form Handling**: React Hook Form
- **Charts**: Chart.js with react-chartjs-2
- **Maps**: Leaflet with react-leaflet
- **Testing**: Vitest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
src/
├── api/              # API configuration and services
├── assets/           # Static assets (images, styles)
├── components/       # React components
│   ├── common/       # Shared components
│   └── layout/       # Layout components
├── hooks/            # Custom React hooks
├── pages/            # Page components
│   ├── auth/         # Authentication pages
│   ├── user/         # User pages
│   └── admin/        # Admin pages
├── routes/           # Route configuration
├── store/            # Redux store and slices
├── utils/            # Utility functions
└── test/             # Test setup and utilities
```

## Features

- User authentication and authorization
- Real-time chat with AI assistant
- Disease detection via image upload
- Weather forecasts and agricultural insights
- Market intelligence and price comparison
- Government schemes discovery
- Multi-language support
- Real-time notifications via Socket.IO
- Speech-to-text and text-to-speech
- Admin dashboard and monitoring
- Responsive design for mobile and desktop

## Contributing

Please follow the coding standards and ensure all tests pass before submitting changes.

## License

Proprietary - All rights reserved
