# Docker Setup Guide

This guide explains how to run Hidden Marks using Docker.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac)
- OR Docker + Docker Compose (Linux)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd hiddenmarks

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the game at `http://localhost:3000`

## Docker Services

The application consists of 3 Docker containers:

### 1. PostgreSQL Database (`db`)
- **Image:** `postgres:15-alpine`
- **Port:** `5432`
- **Database:** `hiddenmarks`
- **User:** `hiddenmarks`
- **Password:** `hiddenmarks123`
- **Auto-initializes:** Database schema runs automatically on first start

### 2. Backend Server (`server`)
- **Build:** `./server/Dockerfile`
- **Port:** `5000`
- **Environment:**
  - `PORT=5000`
  - `DATABASE_URL=postgresql://hiddenmarks:hiddenmarks123@db:5432/hiddenmarks`
  - `NODE_ENV=development`
- **Features:**
  - Hot reload enabled (nodemon)
  - Source code mounted as volume

### 3. Frontend Client (`client`)
- **Build:** `./client/Dockerfile`
- **Port:** `3000`
- **Environment:**
  - `REACT_APP_API_URL=http://localhost:5000/api`
  - `REACT_APP_SOCKET_URL=http://localhost:5000`
- **Features:**
  - Hot reload enabled
  - Source code mounted as volume

## Commands

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f db

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart services
docker-compose restart

# Rebuild containers
docker-compose build
docker-compose up -d --build

# View running containers
docker-compose ps

# Execute commands in containers
docker-compose exec server sh
docker-compose exec client sh
docker-compose exec db psql -U hiddenmarks -d hiddenmarks
```

### Using Makefile (Recommended)

The Makefile provides convenient shortcuts:

```bash
# Start services
make up

# View logs
make logs              # All services
make logs-server       # Server only
make logs-client       # Client only
make logs-db          # Database only

# Stop services
make down

# Restart services
make restart

# Clean everything
make clean

# Access shells
make shell-server      # Backend shell
make shell-client      # Frontend shell
make shell-db         # PostgreSQL shell

# View status
make status

# Start and follow logs
make dev
```

## Volume Management

Docker volumes persist your data:

- `postgres_data`: Database files (persisted between restarts)
- Node modules are stored in anonymous volumes (faster builds)
- Source code is mounted for hot reload

To completely reset the database:
```bash
docker-compose down -v
docker-compose up -d
```

## Development Workflow

1. **Start services:**
   ```bash
   make up
   ```

2. **View logs:**
   ```bash
   make logs
   ```

3. **Make code changes:**
   - Edit files in `server/src/` or `client/src/`
   - Changes are automatically detected and reloaded

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - Database: localhost:5432

5. **Stop services:**
   ```bash
   make down
   ```

## Troubleshooting

### Port Already in Use

If you see "port already allocated" errors:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5000
lsof -i :5432

# Stop the conflicting process or change ports in docker-compose.yml
```

### Container Won't Start

```bash
# View detailed logs
docker-compose logs <service-name>

# Rebuild container
docker-compose build <service-name>
docker-compose up -d <service-name>
```

### Database Connection Issues

```bash
# Check if database is ready
docker-compose exec db pg_isready -U hiddenmarks

# View database logs
make logs-db

# Reset database
docker-compose down -v
docker-compose up -d
```

### Permission Issues

On Linux, you may need to fix file permissions:

```bash
sudo chown -R $USER:$USER .
```

### Clean Slate

To completely reset everything:

```bash
make clean
docker-compose build --no-cache
make up
```

## Production Deployment

For production, create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    # Use stronger password
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    # Don't expose port publicly
    # ports: []

  server:
    environment:
      NODE_ENV: production
    # Run production build
    command: npm start

  client:
    # Build static files
    command: npm run build
    # Serve with nginx
```

## Environment Variables

For production, use a `.env` file:

```bash
# Database
POSTGRES_USER=hiddenmarks
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=hiddenmarks

# Server
PORT=5000
DATABASE_URL=postgresql://hiddenmarks:your_secure_password@db:5432/hiddenmarks
NODE_ENV=production

# Client
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_SOCKET_URL=https://your-domain.com
```

Then run:
```bash
docker-compose --env-file .env up -d
```

## Additional Resources

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
