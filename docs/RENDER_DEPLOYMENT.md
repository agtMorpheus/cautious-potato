# Deploying to Render.com

This guide explains how to deploy the Abrechnung Application to Render.com, a modern cloud platform that simplifies deployment.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

The application consists of two main components:

1. **MySQL Database** - Stores contract management data
2. **Web Service** - Serves both the frontend (static files) and backend (PHP API)

Render.com will automatically deploy your application using the `render.yaml` blueprint file included in this repository.

## Prerequisites

- GitHub account
- Render.com account (sign up at https://render.com)
- Your repository pushed to GitHub
- Basic understanding of environment variables

## Deployment Options

### Option 1: Blueprint Deployment (Recommended)

Use the included `render.yaml` file for automated deployment of all services.

**Pros:**
- Automated setup of all services
- Infrastructure as code
- Easy to replicate across environments

**Cons:**
- Less flexibility during initial setup

### Option 2: Manual Deployment

Create each service manually through the Render dashboard.

**Pros:**
- More control over individual services
- Good for learning and testing

**Cons:**
- More time-consuming
- Requires manual configuration of environment variables

## Step-by-Step Deployment

### Using Blueprint (Option 1)

1. **Sign up/Login to Render.com**
   - Visit https://render.com
   - Sign up or log in with your GitHub account

2. **Connect Your Repository**
   - Go to your Render dashboard
   - Click "New +" → "Blueprint"
   - Select your GitHub repository (`agtMorpheus/cautious-potato`)
   - Authorize Render to access your repository

3. **Configure Blueprint**
   - Render will automatically detect the `render.yaml` file
   - Review the services that will be created:
     - `contract-manager-db` (MySQL Database)
     - `abrechnung-app` (Web Service)
   - Click "Apply" to create all services

4. **Set Environment Variables**
   - After blueprint is applied, go to the `abrechnung-app` service
   - Navigate to "Environment" tab
   - Set `CORS_ORIGIN` to your domain (e.g., `https://your-app.onrender.com`)
   - Save changes

5. **Wait for Deployment**
   - Render will build and deploy your application
   - This may take 5-10 minutes for the first deployment
   - Monitor the deployment logs in the dashboard

6. **Initialize Database**
   - Once deployed, you need to run the database initialization scripts
   - Use Render Shell to connect to your web service
   - Run the database setup (see [Database Setup](#database-setup) section)

7. **Access Your Application**
   - Your app will be available at: `https://abrechnung-app.onrender.com`
   - Or your custom domain if configured

### Manual Deployment (Option 2)

#### 1. Create MySQL Database

1. In Render dashboard, click "New +" → "PostgreSQL" or "MySQL"
   - **Note:** Render.com offers native PostgreSQL. For MySQL, you'll need to use a Docker-based private service
   - Name: `contract-manager-db`
   - Database: `contract_manager`
   - User: `contract_user`
   - Plan: Free (or Starter for production)

2. Wait for database to be created
3. Note the connection details (host, database, user, password)

#### 2. Create Web Service

1. In Render dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name:** `abrechnung-app`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./docker/Dockerfile.php`
   - **Plan:** Free (or Starter for production)

4. Add environment variables (see [Environment Variables](#environment-variables))

5. Click "Create Web Service"

## Environment Variables

Configure these environment variables in your Render dashboard:

### Required Variables

```bash
# Database Configuration
DB_HOST=<database-host>          # From database service
DB_NAME=contract_manager
DB_USER=contract_user
DB_PASS=<database-password>      # From database service

# Application Configuration
APP_ENV=production
APP_DEBUG=false

# CORS Configuration (IMPORTANT!)
CORS_ORIGIN=https://your-app.onrender.com  # Update with your actual domain
```

### Optional Variables

```bash
# Session Configuration
SESSION_TIMEOUT=7200
SESSION_SECURE_COOKIE=true
SESSION_SAMESITE=Strict
SESSION_COOKIE_LIFETIME=0

# Security
CSRF_TOKEN_ENABLED=true

# Logging
LOG_LEVEL=warning
LOG_FILE=/tmp/app.log

# Rate Limiting
RATE_LIMIT=100
```

## Database Setup

After deployment, initialize the database:

### Option 1: Using Render Shell

1. Go to your web service in Render dashboard
2. Click "Shell" tab
3. Run the following commands:

```bash
# Connect to your database and run initialization scripts
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < /var/www/html/db/init_contract_manager_fixed.sql
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < /var/www/html/db/phase6_schema.sql
```

### Option 2: Using External MySQL Client

1. Get database connection details from Render dashboard
2. Connect using a MySQL client (MySQL Workbench, DBeaver, etc.)
3. Run the SQL scripts located in `/db/` directory:
   - `init_contract_manager_fixed.sql`
   - `phase6_schema.sql`

## Post-Deployment Configuration

### 1. Update CORS Settings

Update the `CORS_ORIGIN` environment variable with your actual domain:

```bash
CORS_ORIGIN=https://your-app.onrender.com,https://www.your-app.onrender.com
```

### 2. Configure Custom Domain (Optional)

1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain and follow the DNS configuration instructions

### 3. Enable HTTPS

Render automatically provides free SSL certificates for all services.

### 4. Upload Excel Templates

Upload your Excel templates (`protokoll.xlsx` and `abrechnung.xlsx`) to the `/templates` directory:

1. Use Render Shell or SFTP
2. Or configure a persistent disk and upload via dashboard

## Monitoring and Maintenance

### View Logs

1. Go to your service in Render dashboard
2. Click "Logs" tab
3. Monitor real-time application logs

### Monitor Performance

1. Check "Metrics" tab for:
   - CPU usage
   - Memory usage
   - Response times
   - Request counts

### Database Backups

- Render provides automatic backups for paid database plans
- For free tier, consider manual backups:

```bash
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > backup.sql
```

### Scaling

To handle increased traffic:

1. Upgrade your plan (Free → Starter → Standard → Pro)
2. Consider horizontal scaling for web services
3. Upgrade database plan for better performance

## Troubleshooting

### Application Won't Start

**Check:**
- Deployment logs for errors
- Environment variables are set correctly
- Database is accessible
- Health check endpoint `/api/health` is responding

**Fix:**
```bash
# Check logs in Render dashboard
# Verify database connection
# Ensure all required environment variables are set
```

### Database Connection Errors

**Symptoms:** 500 errors, "Database connection failed"

**Fix:**
1. Verify `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` are correct
2. Check database service is running
3. Verify network connectivity between services
4. Check database service logs

### CORS Errors

**Symptoms:** Browser console shows CORS policy errors

**Fix:**
1. Update `CORS_ORIGIN` environment variable
2. Include protocol (https://) and correct domain
3. No trailing slashes
4. Restart web service after changes

### Session Issues

**Symptoms:** Users logged out frequently, session not persisting

**Fix:**
1. Set `SESSION_SECURE_COOKIE=true` for HTTPS
2. Adjust `SESSION_TIMEOUT` if needed
3. Check `SESSION_SAMESITE` setting

### File Upload Issues

**Symptoms:** Cannot upload Excel files

**Fix:**
1. Check PHP upload limits in `php.ini`
2. Verify `MAX_UPLOAD_SIZE` constant in `api/config.php`
3. Check disk space and permissions

### Performance Issues

**Symptoms:** Slow response times, timeouts

**Solutions:**
1. Upgrade to a higher plan
2. Enable caching
3. Optimize database queries
4. Review and optimize PHP code
5. Check database indexes

### Health Check Failing

**Symptoms:** Service keeps restarting, shows as unhealthy

**Fix:**
1. Check `/api/health` endpoint responds correctly
2. Verify database connection in health check
3. Review application logs for errors
4. Adjust health check timeout if needed

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Blueprints Guide](https://render.com/docs/blueprint-spec)
- [PHP on Render](https://render.com/docs/deploy-php)
- [Database Management on Render](https://render.com/docs/databases)

## Support

For issues specific to:
- **Render.com Platform:** Contact Render support or check their documentation
- **Application Code:** Open an issue on GitHub repository
- **Database Issues:** Review logs and check database service status

## Cost Considerations

### Free Tier Limitations
- Services may spin down after 15 minutes of inactivity
- Limited resources (CPU, memory)
- No persistent disk storage
- Database size limits

### Recommended for Production
- **Web Service:** Starter plan or higher ($7/month+)
- **Database:** Starter plan or higher ($7/month+)
- **Total:** ~$14/month minimum for basic production setup

### Cost Optimization
- Use free tier for development/testing
- Upgrade to paid plans for production
- Monitor usage and scale as needed
- Consider managed database alternatives if needed

---

**Last Updated:** December 2024  
**Maintained By:** Application Team  
**Questions?** Open an issue on GitHub
