# ClawPM — Product Specification & Implementation Guide

**Version:** 0.3
**Date:** March 16, 2026
**Owner:** Jorge Villanueva

---

## What Is ClawPM

ClawPM is a command-center tool for a **Head of Operations** managing live event production in Mexico City. It is not a generic project manager. It is not a gestor tool. It is the system that allows one person to oversee multiple teams, across multiple shows running in parallel, with automated vendor chasing via WhatsApp and full compliance tracking against the CDMX Protección Civil checklist.

The user runs 4–8 shows per month. Each show follows the same regulatory backbone (PC checklist), involves the same types of vendors and roles, and goes through the same lifecycle. The value of ClawPM is that it automates the repetitive orchestration — so the Head of Ops manages exceptions, not checklists.

---

## Core Concepts

### 1. Show (replaces "Project")

A Show is the central entity. Everything revolves around it.

- **Name:** Purple Disco Machine, MUTEK Equinoccio, etc.
- **Date:** The show date. All deadlines calculate backwards from this.
- **Venue:** Reference to a stored Venue profile.
- **Status:** `setup` → `pre-production` → `production` → `show_day` → `wrap`
- **Setup Answers:** The y/n questionnaire responses that determine which checklist items are active.
- **Directory:** The people and vendors assigned to this specific show.

### 2. Venue

A reusable entity that stores intelligence about a location. When you pick a venue for a new show, its profile pre-fills answers and provides stored documents.

**Stored data:**
- Name, address, alcaldía, capacity
- Contact info (name, WhatsApp, email)
- What the venue handles: permitting (y/n), bars (y/n), ticketing (y/n), ticketing platform
- Documents on file: rigging plot, base layout, uso de suelo, aviso de funcionamiento, PIPC authorization, standard contract
- Operational notes: noise restrictions, load-in access dimensions/hours, parking, special requirements

**Behavior:**
- When a show selects this venue and the venue handles permitting, all permitting-dependent checklist items auto-set to N/A.
- When a show selects this venue and the venue handles bars, bar ops checklist items auto-set to N/A.
- Documents on file (rigging plot, layout) are immediately available to the production team for that show.

### 3. Vendor Directory

A master contacts database. Vendors are reusable across shows.

**Stored data per vendor:**
- Company name, contact person name, WhatsApp number, email
- Vendor type: `seguridad_privada`, `servicio_medico`, `extintores`, `sanitarios`, `generadores`, `carpas`, `pirotecnia`, `drones`, `juegos_mecanicos`, `dro`, `f_and_b`, `audio_iluminacion`, etc.
- Documents on file: responsivas, contratos, registros, pólizas — with expiration dates
- Rate card (tabulador): pricing per unit/element/hour, per service type
- History: which shows they've worked, performance notes

**Behavior:**
- When assigning a vendor to a show, ClawPM checks if their documents are current or expired.
- If expired, it flags the item and the WhatsApp chase asks for updated documents.
- Rate card data feeds into RFP generation.

### 4. Roles Directory

People who fill roles on a show. Some are internal (productor, gestor), some are external (bar ops lead, access coordinator). A person can hold different roles on different shows.

**Standard roles:**
- Head of Operations (the user — oversees everything)
- Promotor
- Productor
- Productor Técnico
- Gestor (permits specialist)
- Bar Ops Lead
- Access Coordinator
- Brand Coordinator
- Hospitality Lead

Each role has a name, WhatsApp number, and is assigned per-show.

### 5. Checklist Template

The PC checklist + Production checklist, stored as a template. When a new show is created, the template stamps out tasks filtered by the setup questionnaire answers.

There are two layers:

**Layer A — PC Checklist (government compliance):**
Derived from the standard CDMX Protección Civil requirements. Sections: Trámites Gobierno, Responsivas de Proveedores, Planos y Programas. Each item has a condition (e.g., `IF_HAS_PIROTECNIA`, `IF_NOT_VENUE_PERMITTING`) that determines if it's active for this show.

**Layer B — Production Checklist (operational):**
The deliverables beyond government compliance. Sections: Bars & F&B, Access & Ticketing, Brands & Partnerships, Producción Técnica, Post-Layout Cascade. Same conditional logic.

**Important:** The PC checklist is deduplicated. Many documents are required by both Espectáculos Públicos and Protección Civil — the checklist has ONE task per document, not two. The gestor knows which filings it feeds into.

### 6. Tasks

A task is a single checklist item instantiated for a specific show.

**Properties:**
- Title, description
- Show (foreign key)
- Assigned to: a role + person (from the show's directory)
- Vendor (optional — if the deliverable comes from a vendor)
- Status: `pendiente` (red), `en_proceso` (yellow), `ok` (green), `na` (gray)
- Deadline: calculated from show date minus the template's "days before" offset
- Condition: why this task exists (or is N/A)
- Documents: attached files (responsivas, contracts, etc.)
- Chase log: history of WhatsApp messages sent and received for this task

### 7. WhatsApp Automation

The automated chasing system via Twilio WhatsApp API.

**Behaviors:**
- **Deadline approaching (configurable, default 5 days):** Sends a WhatsApp to the assigned person/vendor. "Hola [name], para [show name] del [date], necesitamos [document/deliverable]. Fecha límite: [deadline]. ¿Puedes confirmar?"
- **No response follow-up (configurable, default 48 hours):** Re-sends with escalation. "Recordatorio: [document] para [show] vence en [X] días. Por favor confirma estatus."
- **Reply handling:** Incoming messages are logged on the task. If they contain a document (image/PDF), it gets attached.
- **Morning briefing (cron):** Daily WhatsApp to the Head of Ops summarizing all active shows — what's green, yellow, red across the board. What needs attention today.

### 8. Tabulador & RFPs

The rate card system for generating vendor quotes.

**Tabulador:** Stored per vendor type. Contains standard pricing (e.g., security: $X per element per hour, medical: $X per paramedic per event). Can be populated from past show data.

**RFP generation:** From a checklist item, the Head of Ops can trigger an RFP. ClawPM generates a message with show details (date, venue, capacity, specific requirements) and sends it to multiple vendors from the directory. Responses are logged and compared.

### 9. Post-Layout Cascade (Triggers)

When certain milestone tasks move to `ok`, they trigger creation of downstream tasks.

**Example:** "Layout aprobado" → auto-creates:
- Confirmación final de proveedores
- Negociaciones finales
- Manual de producción
- Minuto x minuto final
- Distribución de credenciales

Triggers are defined in the template and fire automatically.

---

## Design Language

ClawPM has a deliberate aesthetic: **dark terminal / ops console**.

- Background: near-black (#0A0A0A)
- Accent: orange (#F97316)
- Typography: monospace for labels, system labels, statuses. Sans-serif for content.
- Status colors: red (#EF4444) = pendiente, yellow (#EAB308) = en proceso, green (#22C55E) = ok, gray (#525252) = n/a
- Interactions: minimal chrome. No unnecessary modals. Inline editing. Keyboard-friendly.
- Language: UI in Spanish for domain-specific terms (show, venue, gestor, tabulador). English for generic UI (status, settings).

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (single user for now, but multi-user ready)
- **WhatsApp:** Twilio WhatsApp Business API (sandbox for dev)
- **AI:** Anthropic Claude API (for coaching features, digest generation, future: smart summaries)
- **Deployment:** Railway
- **Cron:** Railway cron or external (cron-job.org)

---

## Implementation Phases

### PHASE 1: Data Model & Core CRUD
*Foundation. Get the entities right before building automation.*

**Step 1.1 — Database migration**
Create a new migration that adds/modifies these tables:

```
venues (id, name, address, alcaldia, capacity, contact_name, contact_whatsapp,
        handles_permitting, handles_bars, handles_ticketing, ticketing_platform,
        rigging_plot_url, base_layout_url, uso_de_suelo_url, aviso_funcionamiento_url,
        pipc_authorization_url, standard_contract_url,
        noise_restrictions, load_in_access, parking, special_requirements,
        created_at, updated_at)

vendors (id, company_name, contact_name, whatsapp, email, vendor_type,
         rate_card JSONB, performance_notes TEXT,
         created_at, updated_at)

vendor_documents (id, vendor_id, document_type, file_url, expires_at,
                  created_at)

shows (id, name, show_date, venue_id FK, status, setup_answers JSONB,
       created_at, updated_at)
       -- setup_answers stores the y/n questionnaire as JSON:
       -- {"venue_permitting": false, "has_pirotecnia": true, ...}

show_roles (id, show_id FK, role_type, person_name, whatsapp, email)

show_tasks (id, show_id FK, template_item_id, title, description,
            assigned_role, assigned_vendor_id FK nullable,
            status, deadline, condition, sort_order, section,
            created_at, updated_at)

show_task_documents (id, show_task_id FK, file_url, uploaded_by, created_at)

show_task_chase_log (id, show_task_id FK, direction, message, whatsapp_number,
                     message_sid, created_at)
                     -- direction: 'outbound' | 'inbound'

checklist_templates (id, layer, section, title, description,
                     default_responsible_role, default_days_before,
                     condition_key, sort_order)
                     -- layer: 'pc' | 'production'
                     -- condition_key: null (always) | 'IF_HAS_PIROTECNIA' | 'IF_NOT_VENUE_PERMITTING' | etc.

triggers (id, trigger_task_template_id FK, creates_task_template_id FK)
         -- when trigger task goes to 'ok', create the target task
```

Keep the existing `projects`, `tasks`, `ai_notes` tables — they still serve the personal coaching / general PM use case. Shows are a new, parallel entity.

**Step 1.2 — Seed the checklist template**
Insert all PC Checklist and Production Checklist items into `checklist_templates`. Use the deduplicated list from the v2 spreadsheet. This is the master template that all shows instantiate from.

**Step 1.3 — Seed sample venues**
Create a few venue profiles the user works with (Frontón Bucarelli, etc.) with their known attributes (handles permitting, etc.).

**Step 1.4 — Basic CRUD API routes**
Build API routes for:
- `/api/venues` — GET (list), POST (create)
- `/api/venues/[id]` — GET, PUT, DELETE
- `/api/vendors` — GET (list, filter by type), POST
- `/api/vendors/[id]` — GET, PUT, DELETE
- `/api/shows` — GET (list), POST (create — this triggers checklist instantiation)
- `/api/shows/[id]` — GET, PUT, DELETE
- `/api/shows/[id]/roles` — GET, POST, PUT, DELETE
- `/api/shows/[id]/tasks` — GET (with filters: section, status, assigned_role)
- `/api/shows/[id]/tasks/[taskId]` — PUT (status change, assignment), DELETE

**Step 1.5 — Show creation logic**
When POST `/api/shows` is called with `venue_id` and `setup_answers`:
1. Fetch the venue profile
2. Merge venue defaults into setup_answers (e.g., if venue.handles_permitting = true, set venue_permitting = true)
3. Fetch all `checklist_templates`
4. For each template item, evaluate its `condition_key` against the setup_answers
5. If condition is met (or no condition), create a `show_task` with deadline = show_date minus days_before
6. If condition is NOT met, create the task with status = 'na'

---

### PHASE 2: Frontend — Shows Dashboard & Management
*The Head of Ops view.*

**Step 2.1 — Shows list page (`/shows`)**
Grid of active shows. Each card shows: show name, date, venue, a mini traffic-light summary (X green / Y yellow / Z red). Click to enter a show.

**Step 2.2 — Show setup wizard (`/shows/new`)**
Terminal-style flow:
1. Pick venue (dropdown, or create new)
2. Enter show name and date
3. Y/N questionnaire (pre-filled from venue profile)
4. Assign roles (name + WhatsApp for each)
5. Review generated checklist
6. Confirm → creates the show

**Step 2.3 — Show detail page (`/shows/[id]`)**
Two-panel layout:
- Left: checklist grouped by section, traffic light status per item, click to expand/edit
- Right: show info, directory (roles + vendors assigned), timeline to show date

**Step 2.4 — Cross-show dashboard (`/` — new homepage)**
The Head of Ops overview:
- All active shows with their overall status
- Global red items across all shows (what needs attention NOW)
- Upcoming deadlines across all shows (next 7 days)
- Vendor document expirations

**Step 2.5 — Venue management page (`/venues`)**
List venues, click to edit profile. Upload/link documents. Terminal-style form.

**Step 2.6 — Vendor directory page (`/vendors`)**
List vendors with filters by type. Click to see history, documents, rate card. Flag expired documents.

---

### PHASE 3: WhatsApp Automation
*The chase engine.*

**Step 3.1 — Twilio integration (`src/lib/twilio.ts`)**
Already built. Functions to send and receive WhatsApp messages via Twilio API.

**Step 3.2 — Webhook endpoint (`/api/webhooks/whatsapp`)**
Already built for coaching. Extend to handle vendor/role replies:
- Parse incoming message
- Match sender's WhatsApp number to a show_role or vendor
- Find their active tasks
- Log the message on the relevant task(s)
- If it's a document (image/PDF from Twilio media URL), attach it to the task
- If it's a text reply, update the chase log
- Optionally use Claude API to interpret the reply and suggest a status update

**Step 3.3 — Chase cron (`/api/cron/chase`)**
Protected by CRON_SECRET. Runs daily (or twice daily).
1. Find all show_tasks where status = 'pendiente' or 'en_proceso'
2. Check deadline proximity (configurable: 5 days, 3 days, 1 day)
3. Check chase_log for last outbound message (don't spam — minimum 48 hours between messages)
4. For tasks that need chasing, compose a WhatsApp message:
   - Include: show name, deliverable name, deadline, what's needed
   - Tone: professional but direct, in Spanish
5. Send via Twilio
6. Log in chase_log

**Step 3.4 — Morning briefing cron (`/api/cron/morning-briefing`)**
Protected by CRON_SECRET. Runs daily at 8am.
1. Aggregate status across all active shows
2. Highlight: red items, items due this week, newly completed items
3. Format as a WhatsApp message (concise, scannable)
4. Send to Head of Ops WhatsApp number

**Step 3.5 — RFP sending**
From a task detail view, trigger an RFP:
1. Select vendors from directory (by vendor_type)
2. ClawPM composes message with show details + requirements
3. Sends to selected vendors via WhatsApp
4. Logs as outbound chase on the task

---

### PHASE 4: Triggers & Cascade
*Automation of the post-milestone workflow.*

**Step 4.1 — Trigger definitions in database**
Seed the `triggers` table with known cascades:
- "Layout aprobado" (ok) → creates: vendor confirmations, production manual, MxM final, credential distribution

**Step 4.2 — Trigger execution logic**
When a show_task status changes to 'ok':
1. Check `triggers` for any entries where trigger_task_template_id matches
2. For each triggered template, create a new show_task on the same show
3. Set deadline relative to show date
4. Assign based on template's default_responsible_role
5. Optionally send a WhatsApp notification to the assigned person: "New task unlocked on [show]: [task name]. Due: [date]."

---

### PHASE 5: Tabulador & Vendor Intelligence
*Rate cards, RFP comparison, vendor scoring.*

**Step 5.1 — Tabulador management**
UI for vendors to add/edit rate cards. Structured as JSON: `{ "element_per_hour": 250, "minimum_hours": 6, "minimum_elements": 10 }` — structure varies by vendor type.

**Step 5.2 — RFP comparison view**
When multiple vendors respond to an RFP for the same task, show a comparison table. Allow Head of Ops to select a winner, which auto-assigns the vendor to the task.

**Step 5.3 — Vendor scoring**
After show wrap, Head of Ops can rate vendors (1–5) and add notes. This builds a track record over time.

---

### PHASE 6: Document Management & Compliance
*Track expiration, store files, auto-flag issues.*

**Step 6.1 — Document upload on tasks**
Allow attaching files (PDFs, images) to show_tasks. Store in Supabase Storage.

**Step 6.2 — Vendor document expiration tracking**
Vendor documents (responsivas, registros, pólizas) have expiration dates. Dashboard flag when documents are expiring within 30 days. WhatsApp reminder to vendor to renew.

**Step 6.3 — Venue document management**
Upload and store venue documents (rigging plot, layout, uso de suelo). These auto-attach to relevant tasks when a show uses that venue.

---

## Implementation Rules for Claude Code

1. **Never break existing functionality.** The current projects/tasks/dashboard/coaching features must keep working. Shows are a new, parallel feature set.

2. **One step at a time.** Each step above is a single PR / coding session. Don't combine steps. Finish one, test it, then move to the next.

3. **API first, then UI.** Build the API routes and test them (with curl or the health check pattern) before building frontend pages.

4. **Maintain the design language.** Dark background, orange accent, monospace labels, minimal chrome. All new pages must match the existing aesthetic. Use Tailwind — no inline styles.

5. **Spanish for domain terms.** Show-related UI should use Spanish for domain-specific terms (responsiva, tabulador, gestor, productor, plano). Generic UI elements (buttons, navigation, status) can be in English or Spanish — just be consistent.

6. **WhatsApp messages in Spanish.** All automated WhatsApp messages must be in Spanish. Professional tone, direct, concise.

7. **Validate inputs.** All API routes must validate and whitelist fields. Return helpful 400 errors, not 500s from database constraint violations.

8. **Conditional logic is data-driven.** The setup questionnaire answers and venue profile determine which tasks are active. This logic lives in the show creation endpoint, not hardcoded in the frontend.

9. **The checklist template is the source of truth.** All show tasks are instantiated from `checklist_templates`. If the template changes, future shows get the updated checklist. Existing shows are not retroactively modified.

10. **Keep the coaching/personal trainer features.** They work and they're valuable. The WhatsApp webhook should handle both coaching messages (matched to Personal Trainer project) and show-related vendor/role messages (matched by phone number to show_roles/vendors).
