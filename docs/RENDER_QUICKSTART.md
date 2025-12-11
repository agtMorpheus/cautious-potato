# Render.com Quick Start Guide

Deploy the Abrechnung App to Render.com in under 10 minutes!

## Prerequisites

- GitHub account with this repository
- Render.com account (free tier available)

## Quick Deployment Steps

### 1. Fork/Clone Repository (if not already done)

```bash
git clone https://github.com/agtMorpheus/cautious-potato.git
cd cautious-potato
```

### 2. Sign Up for Render.com

- Go to https://render.com
- Sign up with your GitHub account
- Authorize Render to access your repositories

### 3. Deploy Using Blueprint

1. **In Render Dashboard:**
   - Click "New +" → "Blueprint"
   - Select this repository
   - Click "Apply"

2. **Services Created:**
   - ✅ MySQL Database (`contract-manager-db`)
   - ✅ Web Service (`abrechnung-app`)

3. **Wait for Deployment:**
   - Initial deployment takes ~5-10 minutes
   - Monitor progress in the Render dashboard

### 4. Configure Environment

1. Go to `abrechnung-app` service
2. Click "Environment" tab
3. Update `CORS_ORIGIN`:
   ```
   https://abrechnung-app.onrender.com
   ```
4. Save and wait for automatic redeployment

### 5. Initialize Database

**Option A: Using Render Shell**
1. Go to `abrechnung-app` → "Shell" tab
2. Run:
   ```bash
   bash /var/www/html/scripts/init-db-render.sh
   ```

**Option B: Using MySQL Client**
1. Get database credentials from Render dashboard
2. Connect with your preferred MySQL client
3. Run scripts from `/db/` directory:
   - `init_contract_manager_fixed.sql`
   - `phase6_schema.sql`

### 6. Access Your Application

Your app is now live at:
```
https://abrechnung-app.onrender.com
```

## What's Deployed?

### Database Service
- **Type:** MySQL 8.0 (via Docker)
- **Name:** contract-manager-db
- **Storage:** 10 GB
- **Automatic backups:** On paid plans

### Web Service
- **Type:** Docker (PHP 8.1 + Apache)
- **Name:** abrechnung-app
- **Features:**
  - ✅ Frontend UI (Excel automation)
  - ✅ Backend API (contract management)
  - ✅ Auto-scaling
  - ✅ Free SSL certificate
  - ✅ Auto-deployment on git push

## Free Tier Limitations

⚠️ **Important:** Free tier services will spin down after 15 minutes of inactivity.

- **Spin-up time:** ~30 seconds on first request
- **Storage:** Limited to 10 GB
- **Suitable for:** Development, testing, demos

**For Production:** Upgrade to Starter plan ($7/month per service)

## Next Steps

### 1. Upload Excel Templates

Your application needs these files in the `/templates` directory:
- `protokoll.xlsx` - Input protocol template
- `abrechnung.xlsx` - Output billing template

**Upload via Render Shell:**
```bash
# Use Render Shell or configure persistent disk
```

### 2. Create User Accounts

Use the `/api/auth/register` endpoint to create initial users.

### 3. Configure Custom Domain (Optional)

1. Go to your web service
2. "Settings" → "Custom Domain"
3. Add your domain
4. Update DNS records as instructed
5. Update `CORS_ORIGIN` environment variable

### 4. Set Up Monitoring

- Enable email/Slack notifications in Render dashboard
- Set up uptime monitoring (external service recommended)
- Configure log retention preferences

## Troubleshooting

### Service Won't Start
- Check deployment logs in Render dashboard
- Verify all environment variables are set
- Check database is running

### Database Connection Failed
- Verify database service is running
- Check environment variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- Test database connection from Shell

### CORS Errors
- Update `CORS_ORIGIN` with your actual domain
- Include `https://` protocol
- Restart service after changes

### Health Check Failing
- Test `/api/health` endpoint manually
- Check application logs
- Verify database connectivity

## Cost Breakdown

### Free Tier (Development)
- Database: Free (limited resources)
- Web Service: Free (limited resources)
- **Total:** $0/month
- ⚠️ Services spin down after inactivity

### Starter (Production)
- Database: $7/month (512 MB RAM, 1 GB storage)
- Web Service: $7/month (512 MB RAM)
- **Total:** $14/month
- ✅ Always-on services
- ✅ Automatic SSL
- ✅ Auto-scaling

### Professional (High Traffic)
- Database: $15+/month (more resources)
- Web Service: $15+/month (more resources)
- **Total:** $30+/month
- ✅ Enhanced performance
- ✅ Advanced features
- ✅ Priority support

## Support & Documentation

- 📖 Full Documentation: [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
- 🏠 Render Docs: https://render.com/docs
- 💬 Render Community: https://community.render.com
- 🐛 Report Issues: Open GitHub issue

## Alternative: PostgreSQL

Want to use native PostgreSQL instead of MySQL?

1. Use `render.postgresql.yaml` instead
2. Update PHP code to use PostgreSQL
3. Convert database schemas

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for details.

---

**Deployment Time:** ~10 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)  
**Cost:** Free tier available, $14/month for production

Ready to deploy? Let's go! 🚀
