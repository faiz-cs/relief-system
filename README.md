# ReliefOps — Digital Relief Distribution System
## Full Deployment Guide (Free Tier: Supabase + Vercel + Render)

---

## 📁 Project Structure
```
relief-system/
├── backend/              # Node.js + Express API (→ Render)
│   ├── index.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── houses.js
│   │   ├── events.js
│   │   ├── tokens.js
│   │   ├── reports.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js       # JWT + RBAC
│   └── utils/
│       ├── supabase.js
│       └── fraudDetection.js  # Rule-based fraud engine
├── frontend/             # React PWA (→ Vercel)
│   └── src/
│       ├── pages/        # Dashboard, Houses, Events, Scanner, etc.
│       ├── components/   # Layout, Sidebar
│       ├── hooks/        # useOfflineSync (IndexedDB)
│       └── context/      # AuthContext
├── supabase-schema.sql   # Paste into Supabase SQL Editor
├── render.yaml           # Render deployment config
└── vercel.json           # Vercel deployment config
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Supabase Setup (Database + Auth)

1. Go to https://supabase.com → New project
2. Note your **Project URL** and **Service Role Key** (Settings → API)
3. Go to **SQL Editor** → paste entire `supabase-schema.sql` → Run
4. Go to **Authentication → Settings** → disable email confirmation (easier for testing)
5. Manually create your first admin user:
   - Go to Authentication → Users → Invite user
   - Then run in SQL editor:
     ```sql
     UPDATE profiles SET role = 'admin', name = 'Your Name' WHERE email = 'your@email.com';
     ```

### Step 2: Render Setup (Backend)

1. Go to https://render.com → New Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add Environment Variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   JWT_SECRET=any-long-random-string-here
   FRONTEND_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```
5. Deploy → copy your Render URL (e.g. `https://relief-backend.onrender.com`)

### Step 3: Vercel Setup (Frontend)

1. Go to https://vercel.com → New Project
2. Connect your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://relief-backend.onrender.com
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Deploy → your app is live!

---

## 🧪 CSV Import Format

For bulk house import, use this CSV format:
```csv
owner_name,address,ward,members_count,phone,ration_card_number
John Doe,123 Main St,Ward 1,4,9876543210,RC001
Jane Smith,456 Park Ave,Ward 2,3,9876543211,RC002
```

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: create events, manage users, view all reports |
| **Supervisor** | View reports, resolve flagged tokens, monitor distribution |
| **Distributor** | Scan QR codes only, view own scan history |

---

## 🔒 Fraud Detection Rules

The system automatically flags:
| Rule | Severity | Description |
|------|----------|-------------|
| DUPLICATE_SCAN | 🔴 HIGH | Token already distributed |
| TIME_WINDOW_VIOLATION | 🔴 HIGH | Scan outside event dates |
| INACTIVE_EVENT | 🔴 HIGH | Event closed/not active |
| WRONG_WARD | 🟠 MEDIUM | Distributor scanning outside assigned ward |
| SPEED_ANOMALY | 🟠 MEDIUM | 10+ scans in under 2 minutes |

HIGH severity = blocked. MEDIUM = allowed but flagged for review.

---

## 📱 Offline Usage

1. Field distributor opens Scanner page while online
2. Tokens are cached to browser (IndexedDB)
3. Distributor goes offline (poor connectivity)
4. Scans still work — marked as "queued"
5. When internet returns — scans auto-sync

---

## 📊 Features Summary

- ✅ House registry with CSV bulk import
- ✅ Event creation with automatic token generation
- ✅ QR code generation per token
- ✅ Mobile camera QR scanning (PWA)
- ✅ Offline-first with auto-sync
- ✅ Role-based access (Admin / Supervisor / Distributor)
- ✅ Rule-based fraud detection (5 rules)
- ✅ Real-time dashboard with charts
- ✅ Flagged token review system
- ✅ CSV + PDF report export
- ✅ User management

---

## 🛠 Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in your values
node index.js          # runs on http://localhost:4000

# Frontend
cd frontend
npm install
cp .env.example .env   # fill in your values
npm start              # runs on http://localhost:3000
```

---

## 💡 Viva Talking Points

**Q: Why Supabase instead of raw PostgreSQL?**
> Supabase provides managed PostgreSQL with built-in auth, realtime, and storage. It eliminates infrastructure management while keeping full SQL power. The backend still uses a service role key for complete control.

**Q: Why rule-based fraud detection instead of ML?**
> Rule-based systems offer 100% explainability, zero false negatives on hard constraints, and work on any dataset size. ML would require labeled historical data we don't have at deployment, and would be a black box for auditors — unacceptable for government welfare systems.

**Q: How does offline work?**
> Service Workers intercept network requests. IndexedDB stores token data locally. When a distributor scans offline, it checks local cache and queues the action. The Background Sync API uploads queued scans when connectivity returns.
