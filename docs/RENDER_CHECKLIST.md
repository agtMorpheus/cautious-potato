# Render.com Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.com.

## Pre-Deployment

- [ ] Repository is pushed to GitHub
- [ ] All sensitive data removed from code (no hardcoded passwords)
- [ ] Excel templates (`protokoll.xlsx`, `abrechnung.xlsx`) are prepared
- [ ] Database schema files are in `/db/` directory
- [ ] Review and understand `render.yaml` configuration

## Render Account Setup

- [ ] Create Render.com account (https://render.com)
- [ ] Connect GitHub account to Render
- [ ] Authorize Render to access your repository

## Blueprint Deployment

- [ ] Navigate to Render Dashboard
- [ ] Click "New +" → "Blueprint"
- [ ] Select `cautious-potato` repository
- [ ] Review services to be created:
  - [ ] `contract-manager-db` (MySQL Database)
  - [ ] `abrechnung-app` (Web Service)
- [ ] Click "Apply" to deploy

## Initial Deployment

- [ ] Wait for initial build to complete (~5-10 minutes)
- [ ] Check deployment logs for errors
- [ ] Verify both services show as "Live"
- [ ] Note the deployed URL (e.g., `https://abrechnung-app.onrender.com`)

## Environment Configuration

- [ ] Go to `abrechnung-app` service settings
- [ ] Navigate to "Environment" tab
- [ ] Update `CORS_ORIGIN` with your deployed URL:
  ```
  https://abrechnung-app.onrender.com
  ```
- [ ] Verify database connection variables are set:
  - [ ] `DB_HOST`
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASS`
- [ ] Save changes and wait for automatic redeployment

## Database Initialization

Choose one method:

### Method A: Render Shell
- [ ] Go to `abrechnung-app` → "Shell" tab
- [ ] Run initialization script:
  ```bash
  bash /var/www/html/scripts/init-db-render.sh
  ```
- [ ] Verify successful completion

### Method B: External MySQL Client
- [ ] Get database credentials from Render dashboard
- [ ] Connect using MySQL Workbench/DBeaver/CLI
- [ ] Execute scripts in order:
  1. [ ] `init_contract_manager_fixed.sql`
  2. [ ] `phase6_schema.sql`
- [ ] Verify tables were created

## Post-Deployment Verification

- [ ] Access application at deployed URL
- [ ] Test health check endpoint: `/api/health`
- [ ] Verify frontend loads correctly
- [ ] Test login functionality (if applicable)
- [ ] Upload test Excel files
- [ ] Verify data is saved to database
- [ ] Check application logs for errors

## Upload Templates

- [ ] Navigate to web service
- [ ] Use Shell or configure persistent disk
- [ ] Upload `protokoll.xlsx` to `/templates/`
- [ ] Upload `abrechnung.xlsx` to `/templates/`
- [ ] Verify templates are accessible

## Optional: Custom Domain

- [ ] Go to service "Settings" → "Custom Domains"
- [ ] Add your custom domain
- [ ] Configure DNS records as instructed by Render
- [ ] Wait for DNS propagation (~24 hours)
- [ ] Update `CORS_ORIGIN` with custom domain
- [ ] Verify SSL certificate is active

## Monitoring Setup

- [ ] Configure notification preferences (email/Slack)
- [ ] Set up uptime monitoring (Render or external)
- [ ] Review log retention settings
- [ ] Set up error alerting
- [ ] Bookmark application URL and dashboard

## Performance Optimization

- [ ] Review resource usage in Render metrics
- [ ] Consider upgrading from Free to Starter plan for:
  - [ ] No spin-down delay
  - [ ] Better performance
  - [ ] Automatic backups
- [ ] Set up database backups (manual or automatic)
- [ ] Configure cache settings if needed

## Security Review

- [ ] Ensure `APP_DEBUG=false` in production
- [ ] Verify `SESSION_SECURE_COOKIE=true`
- [ ] Check CSRF protection is enabled
- [ ] Review CORS settings are restrictive
- [ ] Verify SSL certificate is active
- [ ] Test that sensitive endpoints require authentication
- [ ] Review and rotate any exposed credentials

## Documentation

- [ ] Document the deployed URLs
- [ ] Create admin user accounts
- [ ] Document any custom configuration
- [ ] Share access with team members
- [ ] Create deployment runbook for future updates

## Testing

- [ ] Create test user account
- [ ] Upload sample Excel file
- [ ] Generate sample billing document
- [ ] Download and verify output file
- [ ] Test error scenarios
- [ ] Verify session persistence
- [ ] Test on different browsers
- [ ] Test on mobile devices (if applicable)

## Maintenance Plan

- [ ] Schedule regular database backups
- [ ] Plan for regular updates and security patches
- [ ] Set up monitoring and alerting
- [ ] Document rollback procedure
- [ ] Create disaster recovery plan

## Production Ready?

Once all items above are checked, your application is ready for production use!

---

## Troubleshooting Common Issues

### Service Won't Start
- Check deployment logs
- Verify environment variables
- Test database connectivity

### Database Connection Failed
- Verify DB credentials in environment
- Check database service status
- Review security group settings

### CORS Errors
- Update `CORS_ORIGIN` with correct URL
- Include `https://` protocol
- Restart service after changes

### Slow Performance
- Upgrade from Free to Starter plan
- Review database queries
- Check resource usage metrics

---

**Need Help?**
- 📖 [Full Deployment Guide](RENDER_DEPLOYMENT.md)
- 🚀 [Quick Start Guide](RENDER_QUICKSTART.md)
- 💬 [Render Community](https://community.render.com)
- 🐛 [Open GitHub Issue](https://github.com/agtMorpheus/cautious-potato/issues)
