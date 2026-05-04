# Antelope

Antelope is a high-performance management suite designed to replace fragile spreadsheets with a unified, relational data system. Built for factions, organizations, and departments that demand reliability and deep integration.

## 🚀 Production Tech Stack

- **Frontend:** React 19 + TypeScript (Vite)
- **Backend:** Laravel 13 (PHP 8.4-FPM)
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis (Optional, supported)
- **Server:** Nginx (Containerized)
- **Orchestration:** Docker Compose

## 📦 Production Deployment

### 1. Prerequisites
- Docker & Docker Compose installed on the host.
- A domain name pointing to your server's IP.
- SSL Certificate (handled via reverse proxy or Certbot).

### 2. Environment Configuration
Navigate to the `backend` directory and configure your production environment:

```bash
cp .env.example .env
```

Ensure the following keys are optimized for production:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://your-domain.com`
- `DB_HOST=db` (Docker service name)
- `DB_PASSWORD=strong-unique-password`

### 3. Launching the Stack
From the project root, run:

```bash
docker-compose up -d --build
```

### 4. Initialization
Once the containers are running, perform the initial setup:

```bash
# Install optimized production dependencies
docker-compose exec backend composer install --optimize-autoloader --no-dev

# Generate app key
docker-compose exec backend php artisan key:generate

# Run migrations
docker-compose exec backend php artisan migrate --force

# Cache configuration for performance
docker-compose exec backend php artisan config:cache
docker-compose exec backend php artisan route:cache
docker-compose exec backend php artisan view:cache
```

## 🛠 HestiaCP + Portainer Setup

If you are using HestiaCP as your main panel and Portainer for container management, follow these steps to route traffic correctly.

### 1. Portainer Configuration
- Create a new **Stack** in Portainer.
- Copy the contents of `docker-compose.yml` into the web editor.
- Update the environment variables in the Portainer UI.
- Deploy the stack.

### 2. HestiaCP Proxy Setup
HestiaCP should act as the entry point (SSL termination and reverse proxy).

1.  **Add Web Domain**: In HestiaCP, add your domain (e.g., `panel.yourdomain.com`).
2.  **Enable SSL**: Use Let's Encrypt for the domain.
3.  **Proxy Template**: 
    - Go to Domain Edit -> Advanced Options.
    - Set the **Proxy Template** to `default`.
    - Set the **Backend Port** to `8000` (or whichever port you mapped the Nginx container to in `docker-compose.yml`).
4.  **IP Address**: Ensure the backend IP is set to `127.0.0.1`.

### 3. Nginx Configuration (Optional/Alternative)
If you prefer a custom template in HestiaCP (`/home/user/conf/web/domain/nginx.conf_antelope`), use the following:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 🔐 Security Notes
- **App Key**: Never share your `APP_KEY`.
- **Database**: The `db` container should never expose port `5432` to the public internet. Ensure it only listens on the internal Docker network.
- **Backups**: Implement a cron job to backup the `db-data` volume regularly.

## 📄 License
MIT

---
"I was using Google Spreadsheets to track my faction members and I just said... Fuck this shit." - **Booskit**
