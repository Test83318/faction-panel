# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Antelope** — management suite for factions/organizations, replacing spreadsheets with a relational data system. Targets GTA:W (GTA World) roleplay communities but is generic enough for any org.

Stack: React 19 + TypeScript (Vite) frontend, Laravel 13 (PHP 8.3+) backend, PostgreSQL/SQLite DB, Sanctum token auth.

## Commands

### Backend (`/backend`)

```bash
# First-time setup
composer run setup

# Development (runs server + queue + pail + vite concurrently)
composer run dev

# Run tests (Pest)
php artisan test

# Single test file
php artisan test --filter TestClassName

# Type check / lint
vendor/bin/pint          # Laravel Pint (code style)

# Migrations
php artisan migrate
php artisan migrate:fresh --seed
```

### Frontend (`/frontend`)

```bash
npm run dev       # Vite dev server on :3000
npm run build     # Production build
npm run lint      # tsc --noEmit (type check only)
npm run clean     # rm -rf dist
```

### Windows (local dev)

```bat
batch\start.bat   # Opens backend (:8000) + frontend (:3000) in separate windows
```

### Docker (frontend only)

```bash
docker-compose up -d --build   # Frontend served at :3007 via Nginx
```

## Post-Change Requirements

After every code modification, **both** must pass before considering work done:

1. `npm run lint` (frontend) — must be type-error-free
2. `php artisan test` (backend) — all Pest tests must pass

Do not claim a task complete until the codebase is type-safe and tests pass.

## Architecture

### Auth Flow

Sanctum token-based (not cookie/SPA). Frontend stores token in `localStorage` as `access_token`. `frontend/src/api.ts` attaches it as `Authorization: Bearer ...` on every request. Backend: `routes/api.php` wraps protected routes in `middleware('auth:sanctum')`.

Optional GTA:W OAuth integration (`GTAW_OAUTH_ENABLED`).

### Frontend Structure

- `src/App.tsx` — root router, global auth state, faction context loading
- `src/api.ts` — single axios instance; base URL from `VITE_API_BASE_URL` env var
- `src/types.ts` — shared TypeScript interfaces
- `src/components/` — one file per page/feature; no shared component library
- `src/components/forms/` — forms subsystem: `FormEditor.tsx` + `editor/` sub-components + `submission/` sub-components
- `src/layouts/` — `GlobalLayout` (unauthenticated shell) + `FactionLayout` (faction-scoped shell with sidebar)

No global state management library. Faction data (permissions, rosters, datasets, flags, record_data) is loaded in `DashboardWrapper` in `App.tsx` and prop-drilled down.

### Backend Structure

- `app/Http/Controllers/` — one controller per resource; thin, delegates to models/services
- `app/Models/` — Eloquent models; most use `SoftDeletes` + `Auditable` trait
- `app/Traits/Auditable.php` — auto-logs create/update/delete to `audit_logs` table; resolves `faction_id` via model relations or route params
- `app/Services/StatisticsService.php` — computes widget data from roster/record sources; marks `is_intensive = true` when >1000 rows processed
- `app/Services/DynamicSectionService.php` — resolves dynamic roster sections by pulling from FactionRecordDatabase entries and applying filter rules/column mappings
- `app/Services/GtawService.php` — GTA:W API integration for roster sync

### Data Model Hierarchy

```
Faction
├── Roster (has columns[] JSON, layout_settings JSON)
│   └── RosterSection (has section_options JSON, data_source: static|dynamic)
│       └── RosterContent (has content JSON storing column values by label)
├── FactionRecordDatabase (custom record DB per faction)
│   └── FactionRecordEntry (rows; linked to roster via DynamicSectionService)
├── Form (multi-stage application/quiz forms)
│   ├── FormStage → FormSection → FormField
│   ├── FormStatus (custom statuses per form)
│   └── FormSubmission → FormResponse + FormComment
├── StatisticsModel → StatisticsWidget (computed from roster/record data)
├── Group (sub-units within faction, used for roster section visibility)
├── Role + Permission (RBAC; roles have weight for hierarchy)
└── AuditLog (polymorphic, faction-scoped)
```

### Roster Column System

Roster columns are stored as JSON arrays on the `Roster` model. Column types include `text`, `select`, `checkbox`, `tag`, `flag`, `dataset`, `linked` (cross-roster linked data). `RosterContent.content` is a JSON object keyed by column label string. `RosterController::cleanUpOrphanedData()` handles label renames and type changes when columns are updated — it rewrites stored content to match.

### Permissions

Two-level system: global `permissions` config defines available permission keys; `Role` models hold arrays of granted keys; users have roles within a faction. `FactionController::getPermissions()` returns the effective permission set for the current user.

Resource-level permissions exist for Rosters, FactionRecordDatabases, Statistics, and Forms — stored in separate `*_permissions` tables, checked in controllers.

### Forms Subsystem

Forms are multi-stage (stages → sections → fields). Supports quiz mode (correct answers, grading). Submissions flow through statuses. GTA:W integration allows linking form submissions to in-game characters. `FormSubmissionController` handles the full lifecycle: `start` → `submit` → `updateStatus` → `gradeResponses`.