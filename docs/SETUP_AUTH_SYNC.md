# Setup Instructions: User Settings Synchronization

## 📋 Overview
This guide walks you through setting up cross-browser settings synchronization with Supabase Auth.

## 🗄️ Step 1: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: `hoanegucluoshmpoxfnl`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New query**
5. Copy and paste the contents of `supabase/migrations/20251026_user_settings_sync.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify tables created:
   - `user_settings`
   - `user_settings_history`

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref hoanegucluoshmpoxfnl

# Run migration
supabase db push

# Or run specific migration file
supabase db execute -f supabase/migrations/20251026_user_settings_sync.sql
```

## 🔐 Step 2: Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Go to https://console.cloud.google.com/
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     ```
     https://hoanegucluoshmpoxfnl.supabase.co/auth/v1/callback
     http://localhost:5174/auth/callback
     ```
4. Copy Client ID and Client Secret to Supabase

## 🔑 Step 3: Configure Server Encryption Key

Add to your `.env` file:

```bash
# Settings Sync Encryption
SETTINGS_ENCRYPTION_KEY=<generate-random-256-bit-key>
```

To generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## ✅ Step 4: Verify Setup

Run the test script:
```bash
npm run test:auth-sync
```

Or manually test:
1. Open app in Chrome: http://localhost:5174
2. Register new account
3. Set API keys in Settings
4. Open app in Firefox with same account
5. Verify API keys are synced

## 📊 Database Schema

### `user_settings` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| encrypted_settings | TEXT | AES-256 encrypted JSON |
| version | INTEGER | Incremental version for conflict resolution |
| last_modified | TIMESTAMPTZ | Last update timestamp |
| device_name | TEXT | Device identifier |
| browser_name | TEXT | Browser identifier |

### `user_settings_history` Table
Keeps historical snapshots of all settings changes for recovery.

## 🔒 Security Features

1. **Encryption**: All API keys encrypted with AES-256-GCM before storage
2. **RLS Policies**: Users can only access their own settings
3. **Conflict Resolution**: Timestamp-based (newest wins)
4. **History Tracking**: All changes logged for audit/recovery
5. **Server-side Key**: Master encryption key never sent to client

## 🚀 Usage

After setup:
- Login required to access settings sync
- Auto-sync on login
- Manual sync via "Sync Now" button
- Settings persist across browsers/devices

## 🛠️ Troubleshooting

### Migration fails with "relation already exists"
- Tables already created, migration successful
- Safe to ignore if tables exist

### Google OAuth not working
- Check redirect URIs match exactly
- Verify OAuth client is enabled for web application

### Settings not syncing
- Check browser console for errors
- Verify user is logged in
- Check `user_settings` table has row for user
- Verify `SETTINGS_ENCRYPTION_KEY` is set

## 📝 Next Steps

After running migration, the app will automatically:
1. Show login/register UI when not authenticated
2. Sync settings on login
3. Enable "Sync Now" button in Settings
4. Display sync status indicator

No additional manual configuration needed!
