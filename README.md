# SAMS – Student Admission Management System

Complete full-stack web application for managing international student applications.

## Features
- JWT login (Admin / Staff / Viewer roles)
- Full student CRUD with 10-section multi-step form
- Document upload (13 document types)
- PDF/print export (individual + bulk)
- Dashboard with clickable stat filters
- User management (admin only)
- Staff notes per student
- Status workflow + audit log
- Docker Compose deployment

## Quick Start (Local)

```bash
# 1. Install
cd backend && npm install
cd ../frontend && npm install

# 2. Configure
cp backend/.env.example backend/.env   # fill DB creds + JWT_SECRET

# 3. Create PostgreSQL DB
#    CREATE DATABASE sams_db;
#    CREATE USER sams_user WITH PASSWORD 'pw';
#    GRANT ALL PRIVILEGES ON DATABASE sams_db TO sams_user;

# 4. Migrate + Seed
cd backend && node src/migrate.js && node src/seed.js

# 5. Run
cd backend && npm run dev          # :5000
cd frontend && npm run dev         # :5173
```

**Login:** admin@sams.edu / Admin@2026!

## Docker (Production)

```bash
cp .env.docker.example .env   # set DB_PASSWORD + JWT_SECRET
docker-compose up -d
docker exec sams_backend node src/seed.js
```
Visit http://localhost

## API
- POST /api/auth/login
- GET/POST /api/students
- GET/PUT/DELETE /api/students/:id
- PATCH /api/students/:id/status
- POST /api/students/:id/notes
- POST /api/students/:id/documents (multipart)
- GET /api/students/:id/export (HTML/print)
- GET /api/export/students (bulk)
- GET/POST/PUT/DELETE /api/users (admin)

## Backup
```bash
docker exec sams_db pg_dump -U sams_user sams_db > backup.sql
docker cp sams_backend:/app/uploads ./uploads_backup
```
