# 🔧 Troubleshooting Guide

## Connection Refused Errors

### Problem: "Connection refused" when creating a game

This means the backend API server is not running.

**Solution:**

1. **Check if services are running:**
   ```bash
   # Check if backend is running
   curl http://localhost:5000/api/health

   # Should return: {"status":"ok"}
   ```

2. **If not running, start the backend:**
   ```bash
   # Using Docker (easiest)
   docker-compose up -d

   # OR manually
   cd server
   npm run dev
   ```

3. **Verify the backend started:**
   - Look for: `Server running on port 5000`
   - If you see database errors, see "Database Connection Errors" below

---

## Database Connection Errors

### Problem: "Connection to database failed" or "ECONNREFUSED 5432"

The backend can't connect to PostgreSQL.

**Solution:**

1. **Check if PostgreSQL is running:**
   ```bash
   # On Mac
   brew services list | grep postgresql
   brew services start postgresql

   # On Linux
   sudo service postgresql status
   sudo service postgresql start

   # On Windows
   # Check Services panel for "PostgreSQL"
   ```

2. **Verify database exists:**
   ```bash
   psql -l | grep hiddenmarks

   # If not found, create it:
   createdb hiddenmarks
   psql hiddenmarks < server/database/schema.sql
   ```

3. **Check connection credentials:**

   Create/edit `.env` file in server directory:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hiddenmarks
   ```

4. **Test the connection:**
   ```bash
   psql postgresql://postgres:yourpassword@localhost:5432/hiddenmarks -c "SELECT 1;"
   ```

---

## Port Already in Use

### Problem: "Port 3000/5000 already in use"

Another process is using the port.

**Solution:**

1. **Find what's using the port:**
   ```bash
   # On Mac/Linux
   lsof -i :5000
   lsof -i :3000

   # On Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   ```

2. **Kill the process:**
   ```bash
   # On Mac/Linux
   kill -9 <PID>

   # On Windows
   taskkill /PID <PID> /F
   ```

3. **Or use different ports:**

   In `server/.env`:
   ```env
   PORT=5001
   ```

   In `client/package.json`, change the proxy or set `PORT=3001` before starting

---

## Docker Issues

### Problem: "docker-compose: command not found"

Docker isn't installed or the command has changed.

**Solution:**

1. **Install Docker Desktop:**
   - Download from https://www.docker.com/products/docker-desktop/

2. **Try alternative command:**
   ```bash
   # New Docker CLI
   docker compose up -d

   # Old Docker Compose
   docker-compose up -d
   ```

### Problem: Docker containers won't start

**Solution:**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **View container logs:**
   ```bash
   docker-compose logs db
   docker-compose logs server
   docker-compose logs client
   ```

3. **Rebuild containers:**
   ```bash
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Check for port conflicts:**
   - Make sure ports 3000, 5000, 5432 are free
   - Stop other PostgreSQL/Node instances

---

## npm Install Errors

### Problem: "Cannot find module" or dependency errors

**Solution:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   # In server directory
   cd server
   rm -rf node_modules package-lock.json
   npm install

   # In client directory
   cd ../client
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be 16 or higher
   ```

4. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

---

## Frontend Can't Connect to Backend

### Problem: API calls fail with CORS or network errors

**Solution:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check the proxy setting** in `client/package.json`:
   ```json
   "proxy": "http://localhost:5000"
   ```

3. **Verify API URL** in client code doesn't override the proxy

4. **Check browser console** for exact error messages

5. **Try accessing API directly:**
   - Open http://localhost:5000/api/health in browser
   - Should see: `{"status":"ok"}`

---

## Database Schema Issues

### Problem: "Table does not exist" errors

**Solution:**

1. **Reinitialize the schema:**
   ```bash
   psql hiddenmarks < server/database/schema.sql
   ```

2. **Or completely reset:**
   ```bash
   dropdb hiddenmarks
   createdb hiddenmarks
   psql hiddenmarks < server/database/schema.sql
   ```

3. **For Docker:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

---

## React App Won't Start

### Problem: "Failed to compile" or build errors

**Solution:**

1. **Clear React cache:**
   ```bash
   cd client
   rm -rf node_modules/.cache
   ```

2. **Check for syntax errors** in recent changes

3. **Verify all imports** are correct

4. **Try rebuilding:**
   ```bash
   npm run build
   npm start
   ```

---

## Game State Issues

### Problem: Game state is corrupted or inconsistent

**Solution:**

1. **Check server logs** for errors

2. **Reset the database:**
   ```bash
   # Stop servers
   # Then reset:
   psql hiddenmarks -c "TRUNCATE sessions, players, game_state CASCADE;"
   ```

3. **Or completely reset:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

---

## WebSocket Connection Issues

### Problem: Real-time updates not working

**Solution:**

1. **Check Socket.IO connection** in browser console:
   - Look for "WebSocket connection" messages
   - Check for connection errors

2. **Verify backend Socket.IO** is running:
   - Server logs should show: "Client connected"

3. **Check for proxy/firewall** blocking WebSocket connections

4. **Try without proxy:**
   - Access frontend directly at `http://localhost:3000`
   - Not through nginx or other proxies

---

## Performance Issues

### Problem: Slow or laggy gameplay

**Solution:**

1. **Check server logs** for errors or warnings

2. **Monitor database performance:**
   ```bash
   psql hiddenmarks -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Clear browser cache** and reload

4. **Check network tab** in browser DevTools for slow API calls

5. **Restart services:**
   ```bash
   docker-compose restart
   ```

---

## Still Having Issues?

1. **Check the logs:**
   ```bash
   # Docker
   docker-compose logs -f

   # Manual
   # Check terminal where services are running
   ```

2. **Try the startup script:**
   ```bash
   ./start.sh
   ```

3. **Full cleanup and restart:**
   ```bash
   # Docker
   docker-compose down -v
   rm -rf server/node_modules client/node_modules
   docker-compose build --no-cache
   docker-compose up -d

   # Manual
   dropdb hiddenmarks
   createdb hiddenmarks
   psql hiddenmarks < server/database/schema.sql
   cd server && rm -rf node_modules && npm install
   cd ../client && rm -rf node_modules && npm install
   ```

4. **Create a GitHub issue** with:
   - Your operating system
   - Node.js version (`node --version`)
   - Docker version (if using Docker)
   - Full error messages
   - Steps to reproduce

---

## Quick Diagnostic Checklist

Run these commands to diagnose issues:

```bash
# 1. Check Node.js
node --version

# 2. Check npm
npm --version

# 3. Check PostgreSQL
psql --version

# 4. Check if services are running
curl http://localhost:5000/api/health
curl http://localhost:3000

# 5. Check database
psql hiddenmarks -c "SELECT COUNT(*) FROM sessions;"

# 6. Check ports
lsof -i :3000
lsof -i :5000
lsof -i :5432

# 7. Check Docker (if using)
docker ps
docker-compose ps
```

Share the output of these commands when asking for help!
