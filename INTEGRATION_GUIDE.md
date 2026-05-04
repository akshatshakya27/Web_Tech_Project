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

**Base URL:** `http://localhost:8000`

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
```powershell
cd d:\Webtech\backend
python -m pip install -r requirements.txt  # if not already installed
uvicorn app.main:app --reload
```
Server runs on: `http://localhost:8000`

### Frontend (HTML/JS)
Open `d:\Webtech\frontend\index.html` in a browser
- Login: Use any registered user credentials
- Dashboard: View and track emissions

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
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - For AI suggestions (optional)

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
