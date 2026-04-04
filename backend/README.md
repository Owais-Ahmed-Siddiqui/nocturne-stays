# Nocturne Stays — Backend (Node.js + MySQL)

## 1) Create database tables
Open MySQL and run:

- `backend/schema.sql`

This will create the `nocturne_stays` database + tables.

## 2) Configure environment
Copy:

- `backend/.env.example` → `backend/.env`

Update DB credentials.

## 3) Install + seed + run
From the `backend` folder:

```bash
npm install
npm run seed
npm start
```

Then open:
- http://localhost:3000

The frontend (index.html) is served by the same Express server and will call `/api/*`.

## Admin login
Default (seeded):
- Email: `admin@nocturne.stays`
- Password: `Admin@2467`

User accounts are created via Register.
