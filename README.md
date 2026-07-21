# IDX Exchange — SDE Intern Project

Full-stack real estate listings app. RETS-shape property data served from MySQL through a Node/Express API and rendered by a React frontend.

## Tech stack

- **Database:** MySQL 8 (Docker)
- **Backend:** Node.js + Express + mysql2
- **Frontend:** React + Vite

## Running locally

You'll need Docker Desktop, Node 18+, and the two SQL dumps (`rets_property.sql`, `rets_openhouse.sql`).

```bash
# 1. Start MySQL
docker run -d --name idx-mysql-local \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=rets \
  -p 3306:3306 mysql:8

docker exec -i idx-mysql-local mysql -uroot -proot rets < rets_property.sql
docker exec -i idx-mysql-local mysql -uroot -proot rets < rets_openhouse.sql

# 2. Backend  (http://localhost:5001)
cd backend && npm install && npm run dev

# 3. Frontend (http://localhost:3000)
cd frontend && npm install && npm run dev
```

Backend expects a `backend/.env` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT` (not committed).

## Structure

```
backend/    Express API + MySQL pool
frontend/   React app (Vite)
```
