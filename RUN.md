# 🚀 How to Run Hidden Marks

**Quick fix for "Proxy error: Could not proxy request"**

This error means the **backend server isn't running**. Here's how to fix it:

---

## Step 1: Make Sure PostgreSQL is Running

The backend needs a PostgreSQL database. Choose one option:

### Option A: Use Docker (Easiest - No PostgreSQL Install Needed)

```bash
# Start everything with Docker
docker-compose up -d

# Wait 30 seconds, then open http://localhost:3000
```

**That's it!** Docker handles the database, backend, and frontend automatically.

---

### Option B: Install PostgreSQL Locally

**On Mac:**
```bash
brew install postgresql
brew services start postgresql
createdb hiddenmarks
```

**On Ubuntu/Debian:**
```bash
sudo apt-get install postgresql
sudo service postgresql start
sudo -u postgres createdb hiddenmarks
```

**On Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install and start PostgreSQL service
- Use pgAdmin or command line to create database `hiddenmarks`

---

## Step 2: Initialize the Database

```bash
# Create the database (if not done above)
createdb hiddenmarks

# Run the schema
psql hiddenmarks < server/database/schema.sql
```

---

## Step 3: Install Backend Dependencies

```bash
cd server
npm install
```

---

## Step 4: Start the Backend Server

**In one terminal:**
```bash
cd server
npm run dev
```

You should see:
```
Server running on port 5000
```

**If you see errors:**
- Database connection errors → Check PostgreSQL is running
- Port 5000 in use → Kill the other process: `lsof -i :5000`
- Module not found → Run `npm install` again

---

## Step 5: Start the Frontend (In a New Terminal)

```bash
cd client
npm install
npm start
```

Browser should open to http://localhost:3000

---

## ✅ Verify It's Working

1. **Backend is running** when you see: `Server running on port 5000`
2. **Test the API:**
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"ok"}
   ```
3. **Frontend is running** when browser opens to http://localhost:3000
4. **No proxy errors** in the React console

---

## 🔥 Still Getting Proxy Errors?

The proxy error means React frontend (port 3000) can't reach the backend (port 5000).

**Check these:**

1. **Is the backend actually running?**
   ```bash
   # In another terminal
   curl http://localhost:5000/api/health
   ```

   If this fails, the backend isn't running. Go back to Step 4.

2. **Check the backend terminal for errors**
   - Look for database connection errors
   - Look for port conflict errors
   - Look for module not found errors

3. **Restart the backend**
   - Stop it (Ctrl+C)
   - Start again: `npm run dev`

4. **Check PostgreSQL is running**
   ```bash
   # Mac
   brew services list | grep postgresql

   # Linux
   sudo service postgresql status
   ```

---

## 🐳 Docker Alternative (Recommended)

If you have Docker, this is much easier:

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Access at http://localhost:3000
```

No PostgreSQL installation needed!

---

## Common Issues

### "role 'postgres' does not exist"

Your PostgreSQL user is different. Update `server/.env`:
```env
DATABASE_URL=postgresql://yourusername@localhost:5432/hiddenmarks
```

### "database 'hiddenmarks' does not exist"

Create it:
```bash
createdb hiddenmarks
psql hiddenmarks < server/database/schema.sql
```

### "Port 5000 already in use"

Find and kill the process:
```bash
lsof -i :5000
kill -9 <PID>
```

### "Module not found" errors

```bash
cd server
rm -rf node_modules
npm install
```

---

## What's Running When It Works

You should have:
- **Terminal 1:** Backend server (port 5000) - `cd server && npm run dev`
- **Terminal 2:** Frontend dev server (port 3000) - `cd client && npm start`
- **PostgreSQL:** Running in background

---

## Quick Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `hiddenmarks` created
- [ ] Schema initialized (`psql hiddenmarks < server/database/schema.sql`)
- [ ] Server dependencies installed (`cd server && npm install`)
- [ ] Backend running on port 5000 (`cd server && npm run dev`)
- [ ] Client dependencies installed (`cd client && npm install`)
- [ ] Frontend running on port 3000 (`cd client && npm start`)
- [ ] Can access http://localhost:3000
- [ ] No proxy errors in console

---

Need more help? Check:
- `QUICKSTART.md` - Detailed setup guide
- `TROUBLESHOOTING.md` - Common errors and solutions
- `DOCKER.md` - Docker setup (easier!)
