# Talkar Universal Sales CRM & Live Lead Hub (`talkar-sales-crm`)

A multi-tenant, industry-agnostic Sales CRM, BANT Lead Qualification Engine, and Live Kanban Hub built for **Talkar Autonomous Voice AI Agents**.

Served locally on **Port `7576`** and configured for production at **`https://salescrm.talkar.in`**.

---

## 1. System Philosophy: The Chameleon Architecture

Every commercial sales call across all industries executes the exact same 5 operational primitives:

```
[Inbound / Outbound Lead] 
           │
           ▼
[Discovery & Catalog Check]  ──► Query offerings, configurations, pricing via MCP
           │
           ▼
[BANT Lead Qualification]    ──► Budget, Authority, Need, Timeline, Temperature
           │
           ▼
[Appointment / Slot Booking] ──► Site Visit, Live Screen Demo, Clinic OPD, Test Drive
           │
           ▼
[Collateral & WhatsApp Sync] ──► Instant Brochure PDF / Floor Plan via n8n Webhook
           │
           ▼
[Post-Call Intelligence]     ──► Auto-move Kanban card via Server-Sent Events (SSE)
```

The CRM database stores an `industry` field and customizable terminology nouns (`offeringNoun` and `appointmentNoun`). When a client or rep accesses `https://salescrm.talkar.in/:company_slug`, the dashboard and agent prompts dynamically adapt:

| Industry | What the CRM Calls "Products" | What the CRM Calls "Appointments" | Qualifying Metrics (Hot Lead) | Sample Pre-seeded Company |
| :--- | :--- | :--- | :--- | :--- |
| **`REAL_ESTATE`** | **Villas & Units** *(2BHK, 3BHK, Penthouse)* | **Site Visits & Cab Pickups** | Budget $\ge$ 1.5 Cr, buying within 60 days | `prestige-group` |
| **`HEALTHCARE_CLINIC`** | **Treatments & Procedures** *(Implants, Aligners)* | **Doctor OPD Consultations** | Severe pain, seeking appointment this week | `clove-dental` |
| **`B2B_SAAS`** | **SaaS Subscription Tiers** *(Starter, Enterprise)* | **15-Min Live Screen Demos** | Team size $\ge$ 20, decision-maker on call | `gurug-saas` |
| **`AUTOMOBILE`** | **Vehicle Trims & Models** *(EV SUV, Dark Edition)* | **Home Test Drives** | Looking to exchange or buy this month | *Customizable* |
| **`EDUCATION_COACHING`**| **Courses & Batches** *(NEET, Full-Stack)* | **Counseling Sessions** | Student/parent seeking immediate intake | *Customizable* |

---

## 2. Decoupled WhatsApp Architecture (Zero Meta Secrets in CRM)

Mirroring `talkar-hotel-pms`, the CRM backend contains **ZERO Meta tokens, WABA credentials, or WhatsApp API secrets**:

```
[Talkar Voice AI Agent]
     │
     ├──► 1. Queries Catalog / Books Slot ──► [Talkar Sales CRM (Port 7576)]
     │                                        - SQLite DB (Prisma)
     │                                        - Live SSE Stream to Kanban
     │
     └──► 2. Sends Brochure / Confirmation ─► [Universal n8n Webhook]
                                               - Holds Meta Bearer Auth (A4TlqRpKEb5a6CGY)
                                               - Dispatches Approved Template
                                               - Graph API v23.0 
```

### Production WhatsApp Dispatch Webhooks & Talkar Tool UUIDs
Two universal production webhooks and Talkar tools are active and live:

| Tool Name | Tool UUID | Target n8n Webhook URL | Meta Template |
| :--- | :--- | :--- | :--- |
| **`sales_send_collateral_whatsapp`** | `24c7b2cd-5038-431e-b24e-51bba04197ba` | `POST https://n8n.talkar.in/webhook/send-sales-collateral` | `sales_collateral_share` |
| **`sales_send_appointment_confirmation_whatsapp`** | `fbc9dc58-9290-454b-a956-d8686689a03c` | `POST https://n8n.talkar.in/webhook/send-sales-appointment-confirmation` | `sales_appointment_confirmed` |

1. **CRM Engine (`Port 7576`):** Manages companies, offerings catalog, leads, BANT scores, appointments, and pushes real-time updates via Server-Sent Events (`/api/events/leads`).
2. **Universal n8n Webhooks:** Live on `https://n8n.talkar.in/webhook/...` with Meta credentials pre-configured (`A4TlqRpKEb5a6CGY`).
3. **Meta WhatsApp MCP:** Used to create, inspect, and approve WhatsApp message templates (`meta-whatsapp` tool).


---

## 3. The 5-Minute Client Onboarding Playbook

Whenever a prospect from ANY industry asks for a demo, follow this rapid 3-step checklist:

### Step 1: Onboard Company in CRM (2 Minutes)
Open `https://salescrm.talkar.in` (or local `http://localhost:7576`), click **New Client**, and enter:
1. Company Name: `Sobha Developers`
2. Slug: `sobha-devs`
3. Industry: `REAL_ESTATE`
4. Add 2-3 products with prices (e.g., 3BHK Luxury Flat - ₹1.4 Cr) and brochure PDF URLs.

### Step 2: Upload Knowledge Base to Talkar (2 Minutes)
1. Grab their website FAQ or product one-pager.
2. In Talkar Platform, create a document with `retrieval_mode: "full_document"`.

### Step 3: Duplicate Master Voice Agent & Publish (1 Minute)
1. Open Master Sales Agent in Talkar, click **Duplicate**.
2. Set greeting: *"Hello! Welcome to Sobha Developers. I'm your AI property concierge. How can I assist you with our luxury homes today?"*
3. Set initial context: `{"company_slug": "sobha-devs"}`.
4. Click **Publish**.

> 💡 **The Result of the Pitch:**
> The customer dials the number. The AI answers in natural language, quotes exact pricing, sends the brochure to their WhatsApp, and books a site visit. You show them your laptop screen: their **HOT LEAD** card with audio recording is already sitting on the live Kanban board. **Deal closed.**

---

## 4. MCP Tools Catalog (`talkar-sales-crm`)

Register in `~/.gemini/config/mcp_config.json` or run via stdio (`npm run mcp`):

| Tool Name | Key Parameters | Function |
| :--- | :--- | :--- |
| **`sales_crm_list_companies`** | *(none)* | Returns all active registered accounts, their industry type, terminology nouns, and pipeline stats. |
| **`sales_crm_add_company`** | `name`, `slug`, `industry`, `initial_offerings` | Instantly registers a new client account for live demos without server restarts. |
| **`sales_crm_check_offerings`** | `company_slug`, `category`, `budget_max` | Checks products/plans/units, prices, specifications, and returns direct brochure URLs. |
| **`sales_crm_book_appointment`** | `company_slug`, `lead_name`, `lead_phone`, `slot_date`, `slot_time` | Reserves appointment, sets lead to `HOT`, generates reference code (e.g. `VISIT-4821`, `DEMO-9102`), and pushes SSE event to Kanban. |
| **`sales_crm_schedule_callback`**| `company_slug`, `lead_phone`, `callback_time`, `reason` | Schedules a follow-up callback and queues lead for automated or human redial. |
| **`sales_crm_lookup_lead`** | `company_slug`, `query` | Retrieves lead history, BANT scores, past audio recording, and scheduled appointments. |

---

## 5. REST API & Webhook Reference

### Core Endpoints
- `GET /` or `GET /:company_slug`: Interactive Tailwind + Lucide Live Kanban Dashboard.
- `GET /api/health`: Health status and port verification.
- `GET /api/events/leads?company=:slug`: Server-Sent Events (SSE) live feed.
- `GET /api/companies`: List all companies.
- `GET /api/companies/:slug/offerings`: Query catalog offerings with optional `?category=` or `?budget_max=`.
- `GET /api/companies/:slug/leads`: List leads with BANT statistics.
- `POST /api/companies/:slug/appointments`: Book an appointment.
- `POST /api/companies/:slug/appointments/callbacks`: Schedule a callback.

### Post-Call Webhook (`POST /api/webhooks/call-completed`)
Add to Talkar Agent workflow as a webhook node:
```json
{
  "company_slug": "prestige-group",
  "workflow_run_id": "WR-98102",
  "caller_number": "+919827953551",
  "extracted_data": {
    "lead_name": "Vikram Malhotra",
    "lead_temperature": "HOT",
    "appointment_booked": true,
    "appointment_type": "Site Visit & VIP Cab Pickup",
    "appointment_date": "2026-11-28",
    "appointment_time": "11:30 AM",
    "budget_range": "1.8 - 2.0 Cr",
    "summary": "Customer interested in 3BHK Villa, booked site visit for Saturday 11:30 AM."
  },
  "recording_url": "https://cdn.talkar.in/recordings/demo-prestige.mp3"
}
```

---

## 6. Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Setup SQLite database and seed 3 industries
npm run setup

# 3. Start local development server on Port 7576
npm run dev

# 4. Open dashboard
open http://localhost:7576
```

---

## 7. Production Server Deployment (`salescrm.talkar.in`)

### Docker Compose
Run on your server:
```bash
# Pull or clone into server
git clone <repo-url> /opt/talkar-sales-crm
cd /opt/talkar-sales-crm

# Build and start container on Port 7576 with persistent SQLite volume
docker compose up -d --build

# View container logs
docker compose logs -f
```

### Caddy Reverse Proxy (`salescrm.talkar.in`)
Add to `/etc/caddy/Caddyfile`:
```caddy
salescrm.talkar.in {
    reverse_proxy 127.0.0.1:7576 {
        # Crucial: Disable proxy buffering for real-time Server-Sent Events (SSE)
        flush_interval -1
    }
    encode gzip zstd
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```
