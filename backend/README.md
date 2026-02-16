# Glean Morning Brief Backend

Backend API server for the Glean Morning Brief application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up PostgreSQL database:
```bash
createdb glean_brief
# Or use your preferred method
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

(To be documented as endpoints are implemented)

## Project Structure

- `src/routes/` - API route handlers
- `src/services/` - Business logic
- `src/middleware/` - Express middleware
- `src/models/` - Database models
- `src/db/` - Database configuration and migrations
- `src/workers/` - Background job workers

