#!/bin/bash

# Check if PostgreSQL is accessible
echo "Checking PostgreSQL connection..."

# Try different common PostgreSQL configurations
DB_URLS=(
    "postgresql://postgres:postgres@localhost:5432/hiddenmarks"
    "postgresql://postgres@localhost:5432/hiddenmarks"
    "postgresql://hiddenmarks:hiddenmarks@localhost:5432/hiddenmarks"
)

DB_FOUND=false

for DB_URL in "${DB_URLS[@]}"; do
    if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✓ Database connection successful: $DB_URL"
        echo "DATABASE_URL=$DB_URL" > server/.env
        echo "PORT=5000" >> server/.env
        echo "NODE_ENV=development" >> server/.env
        echo "CLIENT_URL=http://localhost:3000" >> server/.env
        DB_FOUND=true
        break
    fi
done

if [ "$DB_FOUND" = false ]; then
    echo "✗ Could not connect to PostgreSQL database."
    echo ""
    echo "Please ensure PostgreSQL is running and create the database:"
    echo ""
    echo "  # Start PostgreSQL (if not running)"
    echo "  # On Mac: brew services start postgresql"
    echo "  # On Linux: sudo service postgresql start"
    echo ""
    echo "  # Create database"
    echo "  createdb hiddenmarks"
    echo ""
    echo "  # Initialize schema"
    echo "  psql hiddenmarks < server/database/schema.sql"
    echo ""
    exit 1
fi

# Check if schema is initialized
echo "Checking database schema..."
if psql "$DB_URL" -c "SELECT 1 FROM sessions LIMIT 1;" > /dev/null 2>&1; then
    echo "✓ Database schema initialized"
else
    echo "! Initializing database schema..."
    psql "$DB_URL" < server/database/schema.sql
    echo "✓ Schema initialized"
fi

echo ""
echo "Environment configured successfully!"
echo ""
