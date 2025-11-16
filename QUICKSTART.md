# 🚀 Quick Start Guide

## Running Hidden Marks Locally

Since you're seeing a "connection refused" error, it means the backend services aren't running yet. Here's how to get everything working:

### Option 1: Using Docker (Recommended - Easiest)

**Prerequisites:**
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**Steps:**
```bash
# Navigate to the project
cd hiddenmarks

# Start all services with one command
docker-compose up -d

# Watch the logs
docker-compose logs -f

# Once you see "Server running on port 5000", open:
# http://localhost:3000
```

**That's it!** Everything (database, backend, frontend) runs automatically.

---

### Option 2: Manual Setup (For Development)

**Prerequisites:**
- Node.js 16+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))

**Step 1: Set up PostgreSQL**
```bash
# Start PostgreSQL service
# On Mac: brew services start postgresql
# On Ubuntu: sudo service postgresql start
# On Windows: Start from Services or pgAdmin

# Create database
createdb hiddenmarks

# Initialize schema
psql hiddenmarks < server/database/schema.sql
```

**Step 2: Install Dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (in a new terminal)
cd ../client
npm install
```

**Step 3: Start the Backend**
```bash
# In the server directory
cd server
npm run dev

# You should see: "Server running on port 5000"
```

**Step 4: Start the Frontend**
```bash
# In a NEW terminal, in the client directory
cd client
npm start

# Browser should open automatically to http://localhost:3000
```

---

## Troubleshooting Connection Errors

### "Connection Refused" Error

This means the backend server isn't running. Check:

1. **Is the backend running?**
   ```bash
   # In server directory
   npm run dev
   ```

2. **Is it on the right port?**
   - Backend should show: `Server running on port 5000`
   - Frontend should be on: `http://localhost:3000`

3. **Check for port conflicts**
   ```bash
   # On Mac/Linux
   lsof -i :5000
   lsof -i :3000

   # On Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   ```

### Database Connection Errors

If you see database errors:

```bash
# Make sure PostgreSQL is running
# On Mac:
brew services list | grep postgresql

# On Ubuntu:
sudo service postgresql status

# On Windows:
# Check Services panel for "PostgreSQL"

# Test connection
psql -U postgres -d hiddenmarks -c "SELECT 1;"
```

### Environment Variables

Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/hiddenmarks
NODE_ENV=development
```

Update with your PostgreSQL credentials.

---

## Development Workflow

### Terminal 1 - Backend
```bash
cd server
npm run dev
```

### Terminal 2 - Frontend
```bash
cd client
npm start
```

### Terminal 3 - Database (if needed)
```bash
psql hiddenmarks
```

---

## Quick Health Check

Run these commands to verify everything:

```bash
# 1. Check if backend is responding
curl http://localhost:5000/api/health

# 2. Check if frontend is running
curl http://localhost:3000

# 3. Check database
psql hiddenmarks -c "SELECT COUNT(*) FROM sessions;"
```

If all three work, you're good to go!

---

## First Time Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `hiddenmarks` created
- [ ] Schema initialized (`psql hiddenmarks < server/database/schema.sql`)
- [ ] Server dependencies installed (`cd server && npm install`)
- [ ] Client dependencies installed (`cd client && npm install`)
- [ ] Backend server running on port 5000
- [ ] Frontend dev server running on port 3000
- [ ] Can access http://localhost:3000 in browser

---

## Still Having Issues?

1. **Check Node.js version**
   ```bash
   node --version  # Should be 16 or higher
   ```

2. **Clear npm cache and reinstall**
   ```bash
   cd server && rm -rf node_modules && npm install
   cd ../client && rm -rf node_modules && npm install
   ```

3. **Check the logs**
   - Backend logs show database connection errors
   - Frontend console shows API errors
   - Look for specific error messages

4. **Try the Docker approach**
   - It handles all dependencies automatically
   - No manual database setup needed

---

## Next Steps

Once everything is running:

1. Open http://localhost:3000
2. Enter your name
3. Click "Create Private Game" or "Create Public Game"
4. Share the link with 3 friends
5. Start playing when 4 players have joined!

Need help? Check:
- `README.md` - Full documentation
- `DOCKER.md` - Docker-specific guide
- Create an issue on GitHub
