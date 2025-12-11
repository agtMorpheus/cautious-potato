#!/bin/bash
# Database initialization script for Render.com deployment
# This script should be run after the first deployment to initialize the database

set -e  # Exit on error

echo "==================================================================="
echo "Database Initialization Script for Render.com"
echo "==================================================================="
echo ""

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    echo "ERROR: Database environment variables not set!"
    echo "Please ensure DB_HOST, DB_NAME, DB_USER, and DB_PASS are configured."
    exit 1
fi

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Test database connection
echo "Testing database connection..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed!"
    exit 1
fi
echo ""

# Initialize main schema
echo "Initializing main database schema..."
if [ -f "/var/www/html/db/init_contract_manager_fixed.sql" ]; then
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /var/www/html/db/init_contract_manager_fixed.sql
    echo "✓ Main schema initialized"
else
    echo "⚠ Warning: init_contract_manager_fixed.sql not found, skipping"
fi
echo ""

# Initialize phase 6 extensions
echo "Initializing Phase 6 schema extensions..."
if [ -f "/var/www/html/db/phase6_schema.sql" ]; then
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /var/www/html/db/phase6_schema.sql
    echo "✓ Phase 6 extensions initialized"
else
    echo "⚠ Warning: phase6_schema.sql not found, skipping"
fi
echo ""

# Verify tables were created
echo "Verifying database tables..."
TABLE_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" | wc -l)
echo "✓ Found $((TABLE_COUNT - 1)) tables in database"
echo ""

echo "==================================================================="
echo "Database initialization complete!"
echo "==================================================================="
echo ""
echo "Next steps:"
echo "1. Verify your application can connect to the database"
echo "2. Test the /api/health endpoint"
echo "3. Create initial user accounts as needed"
echo ""
