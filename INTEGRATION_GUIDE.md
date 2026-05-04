# EcoTrack Frontend-Backend Integration Guide

## Project Structure
```
d:\Webtech\
├── frontend/           (formerly client/)
│   ├── index.html      (login/register page)
│   ├── dashboard.html  (main dashboard)
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js      (NEW - API communication layer)
│       ├── auth.js     (login/register logic)
│       └── dashboard.js (dashboard logic)
│
├── backend/            (formerly ecotrack-fastapi/)
│   ├── app/
│   │   ├── main.py     (FastAPI app)
│   │   ├── config/
│   │   │   └── db.py   (MongoDB connection)
│   │   ├── routes/
│   │   │   ├── auth.py (login/register endpoints) ✅ UPDATED
│   │   │   └── emission.py (emission endpoints) ✅ UPDATED
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── requirements.txt
│   ├── .env           (MongoDB + JWT config)
│   └── main.py
│
└── server/            (legacy Node.js backend)
```

## What Was Changed

### 1. Created `frontend/js/api.js`
A centralized API module that provides:
- `authorizedFetch()` - Makes authenticated API calls with JWT token
- `getToken() / setToken()` - JWT token management
- `applySavedTheme() / toggleTheme()` - Dark mode support
- `parseJwtPayload()` - JWT parsing
- `setLoading()` - Shows/hides loading overlay
- `showToast()` - Displays notifications
- `logout()` - Clears token and redirects to login

**Base URL:** `https://web-tech-project-sage.vercel.app` (Production) or `http://localhost:8000` (Local Development)

### 2. Updated FastAPI Backend

#### `backend/app/routes/auth.py` - Login Endpoint
**Before:**
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

**After:** ✅
```json
{
  "token": "...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

#### `backend/app/routes/emission.py` - Add Emission Endpoint
**Before:**
```json
{
  "message": "Emission data saved",
  "data": { ... }
}
```

**After:** ✅
```json
{
  "message": "Emission data saved",
  "emission": { ... },
  "suggestions": [ ... ]
}
```

### 3. Renamed Folders
- `client/` → `frontend/` ✅
- `ecotrack-fastapi/` → `backend/` ✅

## How to Run

### Backend (FastAPI)
**Production (Already Deployed):**
- URL: `https://web-tech-project-sage.vercel.app`
- No action needed — backend is live on Vercel

**Local Development:**
```powershell
cd d:\Webtech\backend
python -m pip install -r requirements.txt  # if not already installed
uvicorn app.main:app --reload
```
Server runs on: `http://localhost:8000`

### Frontend (HTML/JS)

#### Configuration for Deployment

The frontend uses `frontend/js/config.js` to set the backend API URL via environment variables.

**Local Development (Default):**
- The config defaults to `http://localhost:8000`
- Open `d:\Webtech\frontend\index.html` in a browser
- Ensure backend is running on `http://localhost:8000`

**Vercel Deployment:**

1. **Connect your GitHub repo to Vercel:**
   - Go to https://vercel.com
   - Import your repository
   - Select `d:\Webtech` as the root directory (or use default)

2. **Set the Environment Variable:**
   - In Vercel project settings, go to **Settings → Environment Variables**
   - Add a new environment variable:
     - **Name:** `API_BASE_URL`
     - **Value:** `https://web-tech-project-sage.vercel.app` (or your backend URL)
     - **Environments:** Production, Preview, Development (select all)
   - Click "Save"

3. **Configure Build:**
   - Vercel will automatically run `build.sh` (defined in `vercel.json`)
   - The build script replaces `{{API_BASE_URL}}` in `frontend/js/config.js` with your environment variable
   - Output directory is set to `frontend/`

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - The frontend will connect to your backend using the environment variable value

**Example Vercel Configuration:**
```json
{
  "buildCommand": "bash build.sh",
  "outputDirectory": "frontend",
  "env": {
    "API_BASE_URL": "@api_base_url"
  }
}
```

**How It Works:**
1. You set `API_BASE_URL` in Vercel's environment variables UI
2. During build, the `build.sh` script reads `API_BASE_URL` and replaces `{{API_BASE_URL}}` in `config.js`
3. The deployed frontend connects to your backend using the injected URL

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login and get JWT token

### Emissions
- `POST /api/emission/add` - Record emission data
- `GET /api/emission/latest` - Get most recent record
- `GET /api/emission/history` - Get all records for user

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] MongoDB connection is active (check console for "collections" endpoint)
- [ ] Register a new user via frontend
- [ ] Login with registered credentials
- [ ] Submit emission data from dashboard
- [ ] View emissions history and charts
- [ ] Dark mode toggle works
- [ ] Logout redirects to login page

## Environment Configuration

Backend uses `.env` file at `d:\Webtech\backend\.env`:
Backend uses a local `.env` file at `d:\Webtech\backend\.env`. This file is NOT tracked by git for security — create it from `.env.example`:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - For AI suggestions (optional)

Note: Sensitive values were removed from the repository history and `backend/.env` is ignored by `.gitignore`. Do NOT commit secrets to the repo.

Frontend has hardcoded API URL in `frontend/js/api.js`:
```javascript
const API_BASE_URL = "http://localhost:8000";
```

## Common Issues

**Issue:** Frontend can't connect to backend
- **Solution:** Ensure backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify MongoDB connection in backend logs

**Issue:** Login fails with "Invalid email or password"
- **Solution:** Make sure user was registered first
- Check MongoDB connection in .env file

**Issue:** Dark mode doesn't persist
- **Solution:** Browser must allow localStorage
- Check browser console for localStorage errors
