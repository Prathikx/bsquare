# B Square — Setup Guide (Windows)

## Prerequisites (install these first)
1. Node.js: https://nodejs.org  (download LTS version)
2. PostgreSQL: https://www.postgresql.org/download/windows/
   - During install, remember the password you set for 'postgres' user
   - Keep default port 5432

---

## Step 1 — Database Setup (pgAdmin)

1. Open pgAdmin from Start Menu
2. Right click Databases → Create → Database → name it `bsquare` → Save
3. Click the `bsquare` database → Tools → Query Tool
4. Paste the contents of `backend/db/schema.sql` → press F5
5. Clear the query tool, paste this and press F5:

```sql
CREATE USER bsquare_user WITH PASSWORD 'Test1234';
GRANT ALL PRIVILEGES ON DATABASE bsquare TO bsquare_user;
GRANT ALL ON SCHEMA public TO bsquare_user;
```

---

## Step 2 — Backend Setup

Open PowerShell in the `bsquare` folder:

```powershell
cd backend
copy .env.example .env
notepad .env
```

Fill in your .env:
```
DATABASE_URL=postgresql://bsquare_user:Test1234@localhost:5432/bsquare
JWT_SECRET=bsquare_jwt_secret_key_2024_secure_xyz
JWT_REFRESH_SECRET=bsquare_refresh_secret_key_2024_abc
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Get your Anthropic API key from: https://console.anthropic.com

Then run:
```powershell
npm install
npm run dev
```

Should print: `B Square API running on port 5000`

---

## Step 3 — Frontend Setup (new PowerShell window)

```powershell
cd frontend
npm install
npm start
```

Opens automatically at http://localhost:3000

---

## Both windows must stay open while using the app!
