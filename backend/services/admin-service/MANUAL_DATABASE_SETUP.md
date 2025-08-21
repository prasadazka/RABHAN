# RABHAN Admin Service - Manual Database Setup Instructions

Due to PostgreSQL authentication configuration, the database setup needs to be done manually.

## Prerequisites
- PostgreSQL is running (✅ Confirmed - port 5432 active)
- Access to PostgreSQL via pgAdmin, DBeaver, or psql command line

## Step-by-Step Instructions

### Option 1: Using pgAdmin or DBeaver (Recommended)

1. **Connect to PostgreSQL**
   - Host: `localhost`
   - Port: `5432` 
   - Database: `postgres` (initial connection)
   - Username: `postgres`
   - Password: [Your PostgreSQL password]

2. **Create the Database**
   - Execute the SQL in: `scripts/manual-database-creation.sql`
   - OR manually create database named: `rabhan_admin`

3. **Create the Tables**
   - Connect to the newly created `rabhan_admin` database
   - Execute the SQL in: `migrations/001_create_admin_tables.sql`

### Option 2: Using psql Command Line

```bash
# Connect to postgres database
psql -h localhost -U postgres -d postgres

# Create the database
\i scripts/manual-database-creation.sql

# Connect to the new database
\c rabhan_admin

# Create the tables
\i migrations/001_create_admin_tables.sql

# Verify tables were created
\dt
```

### Option 3: Using SQL Client

1. Connect to PostgreSQL server
2. Run: `scripts/manual-database-creation.sql` against `postgres` database
3. Connect to `rabhan_admin` database  
4. Run: `migrations/001_create_admin_tables.sql`

## Expected Results

After successful setup, you should have:

- ✅ Database: `rabhan_admin`
- ✅ Tables: 6 tables created
  - `admin_users` - Admin user accounts with zero-trust security
  - `admin_sessions` - Session management with MFA
  - `system_settings` - Global admin system configuration
  - `kyc_approvals` - KYC workflow management
  - `sama_audit_logs` - SAMA compliance audit trail
  - `admin_activity_metrics` - Performance and activity tracking

## Verification

Run this query in `rabhan_admin` database to verify setup:

```sql
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Expected output: 6 tables owned by `postgres`

## Troubleshooting

- **Authentication Error**: Check your PostgreSQL password
- **Database Already Exists**: Drop it first: `DROP DATABASE rabhan_admin;`
- **Permission Denied**: Ensure you're connecting as `postgres` user or a superuser

## Next Steps

Once database is created:
1. Run the Admin Service: `npm run dev`
2. Service will be available on: `http://localhost:3006`
3. Check logs for successful database connection

---

*RABHAN Solar BNPL Platform - Saudi Arabia's First SAMA-Compliant Solar Financing*