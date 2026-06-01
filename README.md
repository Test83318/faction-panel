<div align="center">
  <img src="branding/logo.png" alt="Antelope Logo" width="220" />
  <h1>Antelope</h1>
  <p><strong>A high-performance management suite for factions and organizations.</strong></p>
  <p>Replace fragile, disconnected spreadsheets with a unified, relational database system designed for GTA:W (GTA World) roleplay communities and generic organizations.</p>

  <p>
    <a href="https://laravel.com"><img src="https://img.shields.io/badge/Laravel-13.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel 13" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react" alt="React 19" /></a>
    <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS 4.0" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License MIT" /></a>
  </p>
</div>

---

## 🌟 Overview

Antelope is a modern, high-performance, single-page web application (SPA) coupled with a RESTful API designed specifically for administrative and operational tracking. It was built to eliminate the clutter of Google Spreadsheets, offering instead a structured relational database with robust access controls, custom roster layouts, record management, application processing, audit trails, and interactive statistics.

---

## 🚀 Key Features

*   **Dynamic Roster Builder:** Define custom roster layouts with flexible column types (Text, Dataset Selectors, Checkboxes, Tags, Flags, and cross-roster Linked Fields).
*   **Custom Record Databases:** Create structured record schemas (e.g., active warrants, dispatch logs, or disciplinary actions) with customized visibility settings and fields.
*   **Role-Based Access Control (RBAC):** Manage permissions dynamically at both the faction-wide level and per-resource (specific rosters, databases, and forms).
*   **Advanced Forms Subsystem:** Multi-stage application or quiz forms featuring automated grading, custom review pipelines, and comments.
*   **Live Statistics Dashboard:** Rich widgets (pie charts, bar charts, counter panels) calculating status distributions and member activity metrics dynamically.
*   **Automatic Audit Trail:** Built-in auditing trait logs all creation, modification, and deletion events for accountability.
*   **GTA:W API Integration:** Built-in support for GTA World OAuth login, character UCP verification, and activity (ABAS) tracking synchronization.

---

## 🛠 Tech Stack

### Backend
*   **Framework:** Laravel 13 (PHP 8.3+)
*   **Authentication:** Laravel Sanctum (Token-based API authentication)
*   **Testing:** Pest PHP
*   **Database:** PostgreSQL 16 (Production) / SQLite (Local Development)

### Frontend
*   **Framework:** React 19 (TypeScript)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS 4.0 & Vanilla CSS
*   **State Management:** React Context API & Axios API Client
*   **Animations:** Framer Motion

---

## 📂 Project Structure

```
├── backend/            # Laravel API application
├── frontend/           # React SPA application
├── batch/              # Automation scripts for local development
├── branding/           # Favicons and logos used in branding
└── docker-compose.yml  # Docker environment for frontend deployment
```

---

## ⚙️ Getting Started

### Prerequisites
*   **PHP:** `^8.3` (with standard XML, SQLite/PgSQL, and MBString extensions)
*   **Composer:** `^2.x`
*   **Node.js:** `^20.x` or `^22.x`
*   **npm:** `^10.x`

---

### 1. Backend Setup

1.  Navigate to the `/backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    composer install
    ```
3.  Configure your environment:
    ```bash
    cp .env.example .env
    ```
    *Open `.env` and set your database connection, application key, and optional GTA:W OAuth credentials.*
4.  Generate application key and database:
    ```bash
    php artisan key:generate
    ```
5.  Run migrations and seed the database with sample data:
    ```bash
    php artisan migrate:fresh --seed
    ```

---

### 2. Frontend Setup

1.  Navigate to the `/frontend` folder:
    ```bash
    cd ../frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Configure your API URL if it runs on a port other than `8000`:
    *The frontend uses standard local environments. You can create a `.env` file containing `VITE_API_BASE_URL=http://localhost:8000` to point it to your local backend.*

---

### 3. Running Locally

#### Windows Developers
We provide a utility batch script to run the frontend and backend development servers concurrently in separate console windows:
```cmd
batch\start.bat
```

#### Manual Boot
Alternatively, you can boot each service manually:

*   **Backend Server:** Run the dev script (starts server, queue workers, pail logs, and asset compiler):
    ```bash
    cd backend
    composer run dev
    ```
*   **Frontend Server:** Run the Vite dev server (defaults to port `3000`):
    ```bash
    cd frontend
    npm run dev
    ```

---

## 🧪 Testing & Code Style

To ensure maximum type-safety and application stability before committing changes, make sure the following checks pass:

*   **Run PHP Tests:** Runs the Pest test suite on the backend.
    ```bash
    cd backend
    composer run test
    ```
*   **Pint Code Formatter:** Automatically cleans code styling on the backend.
    ```bash
    cd backend
    vendor/bin/pint
    ```
*   **TypeScript Lint:** Performs typechecks on the frontend.
    ```bash
    cd frontend
    npm run lint
    ```

---

## 🐳 Deployment

### Frontend (Docker Container)
The frontend can be built and deployed via Docker using the root `docker-compose.yml`:
```bash
docker-compose up -d --build
```
This builds the React application and serves it via Nginx on port `3007`.

### Backend (Production Server)
The backend runs as a standard Laravel application:
1.  Deploy the `/backend` folder to your web server (e.g. via Nginx, Apache, or panels like HestiaCP).
2.  Ensure your document root points to `backend/public`.
3.  Run migrations:
    ```bash
    php artisan migrate --force
    ```
4.  Optimize the application configuration:
    ```bash
    php artisan config:cache
    php artisan route:cache
    ```

---

## 📜 Origin Story

> "I was using Google Spreadsheets to track my faction members and I just said... Fuck this shit."
> — **Booskit**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
