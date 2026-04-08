# MyGenie Restaurant POS System - Setup Documentation

## Original Problem Statement
1. Pull code from default branch (v5) of https://github.com/Abhi-mygenie/8-april-del-tw.git
2. React frontend 
3. Build as-is
4. Environment variables:
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online

## Architecture
- **Frontend**: React 19 with CRACO, Tailwind CSS, Radix UI components
- **Backend**: External API (preprod.mygenie.online)
- **Socket**: External socket server (presocket.mygenie.online)

## What's Been Implemented (Jan 2026)
- [x] Cloned repository from GitHub (branch: v5)
- [x] Set up React frontend with required environment variables
- [x] Installed all dependencies via yarn
- [x] Configured environment variables for API and Socket URLs
- [x] Frontend running successfully on port 3000

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

## Tech Stack
- React 19.0.0
- CRACO 7.1.0
- Tailwind CSS 3.4.17
- Radix UI Components
- Socket.io Client 4.7.0
- React Router DOM 7.5.1
- Recharts 3.6.0 (charts)

## Status
- Frontend: Running and displaying login page
- API Connection: Configured to preprod.mygenie.online
- Socket Connection: Configured to presocket.mygenie.online

## Next Tasks
- None - Setup complete as requested
