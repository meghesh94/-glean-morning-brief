# Glean Morning Brief - Full Product

A production-ready morning brief application that aggregates work items from Slack, GitHub, Jira, and Calendar, and helps users process them through an AI-powered conversation interface.

## Architecture

- **Backend**: Node.js/Express API server with TypeScript
- **Frontend**: React application with Vite
- **Database**: PostgreSQL
- **Integrations**: Slack, GitHub, Jira, Google Calendar
- **AI**: OpenAI GPT-4o-mini for conversational interface

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for background jobs - optional for MVP)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (run these commands in the `backend` directory):

**On Windows (PowerShell):**
```powershell
# Copy the example environment file
Copy-Item .env.example .env

# Then edit .env with your actual configuration
notepad .env
```

**On Mac/Linux:**
```bash
# Copy the example environment file
cp .env.example .env

# Then edit .env with your actual configuration
nano .env
# or
vim .env
```

**Or manually:** Create a new file called `.env` in the `backend` directory and copy the contents from `.env.example`, then fill in your actual values.

4. Set up PostgreSQL database:
   - **Install PostgreSQL** if you haven't already (see `backend/POSTGRES_SETUP.md` for detailed instructions)
   - **Create the database:**
     ```bash
     # Connect to PostgreSQL
     psql -U postgres
     
     # Then run:
     CREATE DATABASE glean_brief;
     \q
     ```
   - Or use pgAdmin (GUI) to create the database
   - See `backend/POSTGRES_SETUP.md` for full setup guide

5. Run database migrations:
```bash
npm run migrate
```

6. Start development server:
```bash
npm run dev
```

Backend will run on http://localhost:3001

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env`):
```
VITE_API_URL=http://localhost:3001/api
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Features

### Implemented

- ✅ User authentication (JWT)
- ✅ OAuth integrations (Slack, GitHub, Jira, Calendar)
- ✅ Brief item generation from integrations
- ✅ Urgency calculation
- ✅ AI conversation interface
- ✅ Memory system
- ✅ Scratchpad
- ✅ WebSocket support (infrastructure)

### In Progress / TODO

- Background worker for scheduled brief generation
- Real-time updates via WebSocket
- Enhanced error handling and logging
- Testing suite
- Docker deployment configuration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Integrations
- `GET /api/integrations` - List user integrations
- `GET /api/integrations/:provider/auth` - Get OAuth URL
- `GET /api/integrations/:provider/callback` - OAuth callback
- `DELETE /api/integrations/:provider` - Disconnect integration

### Brief
- `GET /api/brief` - Get brief items
- `POST /api/brief/generate` - Generate/refresh brief
- `DELETE /api/brief/:id` - Delete brief item

### Memory
- `GET /api/memory` - Get user memory
- `PUT /api/memory/:id` - Update memory

### Scratchpad
- `GET /api/scratchpad` - Get scratchpad
- `POST /api/scratchpad` - Update scratchpad

### Conversation
- `POST /api/conversation` - Send message to AI agent

## Development

### Backend Development

```bash
cd backend
npm run dev  # Starts with hot reload
```

### Frontend Development

```bash
npm run dev  # Starts Vite dev server
```

## Production Deployment

**Ready to deploy online?** See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guides including:
- Railway (easiest, recommended)
- Render
- Vercel + Railway
- Docker Compose for VPS
- Environment setup
- Custom domains

Quick start: Deploy to Railway in ~10 minutes with PostgreSQL included!

## License

ISC
