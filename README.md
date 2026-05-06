# Antelope

Antelope is a high-performance management suite designed to replace fragile spreadsheets with a unified, relational data system. Built for factions, organizations, and departments that demand reliability and deep integration.

## 🚀 Architecture

- **Frontend:** React 19 + TypeScript (Vite) - **Containerized via Docker**
- **Backend:** Laravel 13 (PHP 8.4) - **Managed via HestiaCP / Standard PHP Environment**
- **Database:** PostgreSQL 16
- **Server:** Nginx

## 📦 Frontend Deployment (Docker)

The frontend is served via an Nginx container.

### Using Docker Compose (Recommended)
Use the `docker-compose.yml` file in the root directory:

```bash
docker-compose up -d --build
```
The frontend will be available at `http://localhost:3007` by default.

### Portainer Configuration
When deploying as a stack in Portainer:
1.  **Repository URL**: Point to this repository.
2.  **Compose path**: `docker-compose.yml`
3.  **Environment Variables**:
    *   `PORT`: Set to `3007` (or your preferred port).
    *   `VITE_API_BASE_URL`: Set to your backend API URL (e.g., `http://api.yourdomain.com`).

### Manual Build & Run
If you prefer manual commands:
```bash
cd frontend
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t antelope-frontend .
docker run -d -p 3007:80 --name antelope-frontend antelope-frontend
```

## 🛠 Backend Deployment (HestiaCP)

The backend is a standard Laravel application.

### 1. Requirements
- PHP 8.4+
- Composer
- PostgreSQL 16

### 2. Setup
Navigate to the `backend` directory:
```bash
cp .env.example .env
composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan migrate --force
```

### 3. HestiaCP Configuration
1.  **Add Web Domain**: In HestiaCP, add your domain (e.g., `api.yourdomain.com`).
2.  **Web Template**: Use a standard PHP template (e.g., `default` or `laravel`).
3.  **Document Root**: Ensure it points to the `backend/public` directory.

## 📄 License
MIT

---
"I was using Google Spreadsheets to track my faction members and I just said... Fuck this shit." - **Booskit**
