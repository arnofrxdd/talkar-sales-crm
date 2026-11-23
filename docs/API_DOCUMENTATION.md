# Talkar Universal Sales CRM & Live Lead Hub — API, Tools & Architecture Reference Manual

> **Production Gateway Base URL:** `https://salescrm.talkar.in`  
> **Local Development Base URL:** `http://localhost:7576`  
> **Protocol:** HTTPS / REST / Server-Sent Events (SSE) / JSON / Model Context Protocol (MCP)  
> **CORS:** Enabled globally (`*`) for frictionless browser UI, voice agent, and dashboard integrations.

---

## Table of Contents
1. [Architecture & Philosophy](#1-architecture--philosophy)
2. [Quick Reference Cheat Sheet](#2-quick-reference-cheat-sheet)
3. [REST API Endpoints](#3-rest-api-endpoints)
   - [Service Health Check](#service-health-check)
   - [Server-Sent Events (SSE) Live Feed](#server-sent-events-sse-live-feed)
   - [Companies & Multi-Tenancy](#companies--multi-tenancy)
   - [Offerings & Product Catalog](#offerings--product-catalog)
   - [Leads & BANT Qualification](#leads--bant-qualification)
   - [Appointments & Bookings](#appointments--bookings)
   - [Callbacks & Autonomous Auto-Dialer](#callbacks--autonomous-auto-dialer)
   - [Post-Call Intelligence Webhooks](#post-call-intelligence-webhooks)
4. [Talkar Voice AI Agent Integration & Tools](#4-talkar-voice-ai-agent-integration--tools)
   - [Tool 1: `sales_crm_check_offerings`](#tool-1-sales_crm_check_offerings)
   - [Tool 2: `sales_crm_book_appointment`](#tool-2-sales_crm_book_appointment)
   - [Tool 3: `sales_crm_schedule_callback`](#tool-3-sales_crm_schedule_callback)
   - [Tool 4: `sales_send_collateral_whatsapp`](#tool-4-sales_send_collateral_whatsapp)
   - [Tool 5: `sales_send_appointment_confirmation_whatsapp`](#tool-5-sales_send_appointment_confirmation_whatsapp)
   - [Telephony Context Variables & Conventions](#telephony-context-variables--conventions)
5. [Decoupled WhatsApp & n8n Architecture](#5-decoupled-whatsapp--n8n-architecture)
   - [n8n Webhook 1: Send Collateral & Brochure](#n8n-webhook-1-send-collateral--brochure)
   - [n8n Webhook 2: Appointment Confirmation](#n8n-webhook-2-appointment-confirmation)
   - [Meta WhatsApp Cloud API Credentials & Templates](#meta-whatsapp-cloud-api-credentials--templates)
6. [Autonomous Callback Scheduler & Auto-Dialer](#6-autonomous-callback-scheduler--auto-dialer)
7. [Multi-Industry Replication Playbook](#7-multi-industry-replication-playbook)
   - [Why Backend Code is 100% Reusable](#why-backend-code-is-100-reusable)
   - [Industry Dynamic Terminology Mapping](#industry-dynamic-terminology-mapping)
   - [3-Minute Onboarding Workflow](#3-minute-onboarding-workflow)
   - [Production Master Voice Agent Workflow Code Template](#production-master-voice-agent-workflow-code-template)

---

## 1. Architecture & Philosophy

The **Talkar Universal Sales CRM (`talkar-sales-crm`)** is a high-speed, multi-tenant lead qualification engine, BANT scoring hub, and real-time sales Kanban designed specifically for **Talkar Autonomous Voice AI Agents**.

### The "Chameleon" Design Principle
Every commercial sales conversation across any vertical follows the identical 5 operational stages:
1. **Discovery & Catalog Check:** Agent queries products/configurations and pricing via MCP/REST.
2. **BANT Qualification:** Evaluates Budget, Authority, Need, and Timeline to assign lead temperature (`HOT`, `WARM`, `COLD`).
3. **Appointment / Demo Booking:** Schedules high-intent milestone (Site Visit, Live Demo, Clinic OPD, Test Drive).
4. **Collateral & WhatsApp Sync:** Dispatches instant PDF brochures, layouts, and confirmation tickets.
5. **Post-Call Intelligence Sync:** Enriches the lead with audio recording, full summary, and auto-moves the card on the live Kanban board.

```
                         ┌────────────────────────────────────────┐
                         │      Prospect Phone Call (In/Out)      │
                         │    (Talkar Voice Agent + Telephony)    │
                         └──────────────────┬─────────────────────┘
                                            │
                    1. Real-time Tools      │      2. Post-Call Webhook
                    (Check Catalog, Book,   │      (Summary, Recording,
                     Schedule Callback)     │       Lead Temperature)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        https://salescrm.talkar.in (Port 7576)                          │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   REST API (/api/companies/:slug/...)     │   Live Pitch Kanban (SSE /api/events/leads)│
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│                       Prisma Engine (Universal Schema)                                 │
│   • Multi-Tenant Companies   • Offerings   • Leads (BANT)   • Appointments             │
└─────────────────────────────────────┬──────────────────────────────────────────────────┘
                                      │
                         Dispatches WhatsApp Collateral
                         & Appointment Confirmation
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Universal Production n8n Gateways                             │
│   POST https://n8n.talkar.in/webhook/send-sales-collateral                             │
│   POST https://n8n.talkar.in/webhook/send-sales-appointment-confirmation               │
│                                     │                                                  │
│                                     ▼                                                  │
│                    Meta WhatsApp Cloud API (Graph v23.0)                               │
│              Pre-approved Templates: sales_collateral_share, etc.                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quick Reference Cheat Sheet

| Endpoint | Method | Purpose | Typical Voice AI / System Action |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Health & container status | Uptime monitoring |
| `/api/events/leads` | `GET` | Server-Sent Events (SSE) live feed | Powers live Kanban animations during calls |
| `/api/companies` | `GET` | List active companies | Catalog discovery |
| `/api/companies` | `POST` | Register new company tenant | 2-minute client onboarding |
| `/api/companies/:slug` | `GET` | Retrieve company profile & config | Fetches tenant settings, currency, and terminology |
| `/api/companies/:slug/offerings` | `GET` | Check offerings / catalog | Agent queries products, pricing, specs, and brochure URLs |
| `/api/companies/:slug/offerings` | `POST` | Add product / offering | Seed catalog inventory |
| `/api/companies/:slug/leads` | `GET` | List leads with BANT filters | Sales team lead review & export |
| `/api/companies/:slug/leads/lookup` | `GET` | Fast lead lookup by phone or name | Agent recognizes returning callers |
| `/api/companies/:slug/leads` | `POST` | Manual lead creation / update | Admin updates |
| `/api/companies/:slug/leads/:id/stage` | `PATCH` | Update lead stage & temperature | Kanban drag-and-drop or pipeline promotion |
| `/api/companies/:slug/leads/:id/ai-call` | `POST` | Trigger outbound Voice AI call | One-click auto-dial from CRM dashboard |
| `/api/companies/:slug/leads/:id` | `DELETE` | Delete lead (cascades appointments)| Clean up test leads |
| `/api/companies/:slug/appointments`| `GET` | List scheduled appointments | Calendar & rep dispatch |
| `/api/companies/:slug/appointments`| `POST` | Book site visit / demo slot | Agent confirms appointment code (`VISIT-XXXX`) |
| `/api/companies/:slug/callbacks` | `POST` | Schedule follow-up callback | Agent books requested callback timestamp |
| `/api/webhooks/call-completed` | `POST` | Post-call intelligence receiver | Talkar webhook enriches summary & attaches recording |

---

## 3. REST API Endpoints

### Service Health Check
Verify API availability, container status, and port.

- **URL:** `GET https://salescrm.talkar.in/api/health`
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "talkar-sales-crm",
  "version": "1.0.0",
  "port": 7576,
  "timestamp": "2026-11-23T18:00:00.000Z"
}
```

---

### Server-Sent Events (SSE) Live Feed
Live stream pushing instant event notifications when leads are created, updated, stages are moved, or appointments are booked.

- **URL:** `GET https://salescrm.talkar.in/api/events/leads?company=:slug`
- **Headers:** `Accept: text/event-stream`
- **Event Types Emitted:**
  - `connected`: Initial connection handshake with `clientId`.
  - `lead_created`: New lead entered the system.
  - `lead_updated`: Lead metadata, notes, callback, or temperature updated.
  - `lead_stage_changed`: Lead moved between Kanban columns.
  - `lead_deleted`: Lead deleted from system.
  - `appointment_booked`: New appointment created and linked to lead.

---

### Companies & Multi-Tenancy

#### List All Companies
- **URL:** `GET https://salescrm.talkar.in/api/companies`
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 3,
  "companies": [
    {
      "id": "b7bd87c3-cdce-469c-bed1-59a4eea052ab",
      "slug": "prestige-group",
      "name": "Prestige Group",
      "industry": "REAL_ESTATE",
      "currency": "INR",
      "offeringNoun": "Villa & Apartment Configuration",
      "appointmentNoun": "Site Visit & Cab Pickup",
      "_count": { "offerings": 3, "leads": 2, "appointments": 1 }
    }
  ]
}
```

#### Get Company Profile
- **URL:** `GET https://salescrm.talkar.in/api/companies/:slug`
- **Example:** `GET https://salescrm.talkar.in/api/companies/prestige-group`

#### Register a New Company Tenant (2-Minute Onboarding)
- **URL:** `POST https://salescrm.talkar.in/api/companies`
- **Request Body:**
```json
{
  "name": "Clove Dental Care",
  "slug": "clove-dental",
  "industry": "HEALTHCARE_CLINIC",
  "brand": "Clove Dental",
  "tagline": "India's Largest Dental Clinic Chain",
  "currency": "INR",
  "city": "Bangalore",
  "offeringNoun": "Treatment & Procedure",
  "appointmentNoun": "Doctor OPD Consultation",
  "initialOfferings": [
    {
      "code": "CLOVE-IMPLANT",
      "title": "German Titanium Dental Implant",
      "category": "Dental Surgery",
      "price": 38000,
      "description": "Lifetime warranty titanium root implant with porcelain crown",
      "brochureUrl": "https://salescrm.talkar.in/brochures/dental-implants.pdf"
    }
  ]
}
```

---

### Offerings & Product Catalog

#### Check Catalog & Offerings
Used directly by Talkar Voice Agents to answer pricing and availability queries.

- **URL:** `GET https://salescrm.talkar.in/api/companies/:slug/offerings`
- **Query Parameters:**
  - `category` (`string`, optional): Filter by category (e.g. `3BHK`, `Enterprise`).
  - `budget_max` (`number`, optional): Filter offerings $\le$ budget.
  - `query` (`string`, optional): Search title, description, or specs.
- **Example cURL:**
```bash
curl -s "https://salescrm.talkar.in/api/companies/prestige-group/offerings?query=3BHK"
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 1,
  "company": {
    "name": "Prestige Group",
    "currency": "INR",
    "offeringNoun": "Villa & Apartment Configuration"
  },
  "offerings": [
    {
      "id": "76ec2a10-21a4-44b2-a42e-1510486ad09d",
      "code": "PRESTIGE-3BHK-LUX",
      "title": "3BHK Luxury Garden Villa",
      "category": "3BHK",
      "price": 18500000,
      "description": "2,450 sq.ft duplex villa with 450 sq.ft private garden lawn and double-height ceiling.",
      "specs": "{\"sqft\": 2450, \"facing\": \"East\", \"possession\": \"March 2027\"}",
      "brochureUrl": "https://salescrm.talkar.in/brochures/prestige-3bhk-garden-villa.pdf"
    }
  ]
}
```

---

### Leads & BANT Qualification

#### List Leads
- **URL:** `GET https://salescrm.talkar.in/api/companies/:slug/leads`
- **Query Parameters:** `temperature` (`HOT`, `WARM`, `COLD`), `stage` (`NEW`, `QUALIFIED`, `APPOINTMENT_BOOKED`, `WON`, `LOST`), `search`.
- **Response `200 OK`:** Includes aggregate stats and nested appointments array.

#### Voice AI Fast Lead Lookup
- **URL:** `GET https://salescrm.talkar.in/api/companies/:slug/leads/lookup?query=:phone_or_name`
- **Response `200 OK`:**
```json
{
  "success": true,
  "lead": {
    "id": "805e9396-db1f-4ea0-b5c2-374fe7279abc",
    "name": "Arnav Dalai",
    "phone": "+919827953551",
    "temperature": "HOT",
    "stage": "APPOINTMENT_BOOKED",
    "callbackAt": "2026-11-28T11:00:00.000Z",
    "appointments": [{ "reference": "VISIT-7021", "date": "2026-11-28", "timeSlot": "11:00 AM" }]
  }
}
```

#### Update Lead Stage / Temperature
- **URL:** `PATCH https://salescrm.talkar.in/api/companies/:slug/leads/:id/stage`
- **Request Body:**
```json
{
  "stage": "APPOINTMENT_BOOKED",
  "temperature": "HOT"
}
```

#### Trigger Outbound Voice AI Call
- **URL:** `POST https://salescrm.talkar.in/api/companies/:slug/leads/:id/ai-call`
- Initiates an immediate autonomous outbound call to the lead via the Talkar Voice Engine with full lead context injected.

---

### Appointments & Bookings

#### Book Appointment / Site Visit / Demo Slot
Invoked by Voice Agents during call.

- **URL:** `POST https://salescrm.talkar.in/api/companies/:slug/appointments`
- **Request Body:**
```json
{
  "lead_name": "Arnav Dalai",
  "lead_phone": "+919827953551",
  "slot_date": "2026-11-28",
  "slot_time": "11:00 AM",
  "appointment_type": "SITE_VISIT",
  "notes": "Pickup from Bhopal, Madhya Pradesh",
  "source": "VOICE_AI"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "appointment": {
    "reference": "VISIT-7021",
    "date": "2026-11-28",
    "timeSlot": "11:00 AM",
    "status": "SCHEDULED",
    "notes": "Pickup from Bhopal, Madhya Pradesh"
  },
  "lead": {
    "id": "805e9396-db1f-4ea0-b5c2-374fe7279abc",
    "name": "Arnav Dalai",
    "temperature": "HOT",
    "stage": "APPOINTMENT_BOOKED"
  }
}
```

---

### Callbacks & Autonomous Auto-Dialer

#### Schedule Follow-up Callback
- **URL:** `POST https://salescrm.talkar.in/api/companies/:slug/callbacks` *(also mounted at `/appointments/callbacks`)*
- **Request Body:**
```json
{
  "lead_phone": "+919827953551",
  "lead_name": "Arnav Dalai",
  "callback_time": "Saturday at 11:00 AM",
  "reason": "Follow-up call after site visit"
}
```
- **Flexible Natural Language Parser:** Accepts ISO timestamps (`2026-11-28T11:00:00Z`), relative phrases (`"in 2 hours"`), and day/time strings (`"Saturday at 11:00 AM"`).
- **Stage Preservation Guard:** If the lead already has a booked appointment, scheduling a callback updates `callbackAt` but **preserves `APPOINTMENT_BOOKED` and `HOT`** without demoting.

---

### Post-Call Intelligence Webhooks

#### Talkar Post-Call Completion Webhook
- **URL:** `POST https://salescrm.talkar.in/api/webhooks/call-completed`
- **Invoked by:** Talkar post-call `webhook` node when a call terminates.
- **Request Body Schema:**
```json
{
  "run_id": "10193",
  "workflow_run_id": "10193",
  "lead_id": "805e9396-db1f-4ea0-b5c2-374fe7279abc",
  "phone": "+919827953551",
  "recording_url": "https://talkar.in/voice-audio/recordings/10193.wav",
  "company_slug": "prestige-group",
  "summary": "Arnav Dalai is interested in the 3BHK Luxury Garden Villa...",
  "extracted_data": {
    "lead_id": "805e9396-db1f-4ea0-b5c2-374fe7279abc",
    "lead_name": "Arnav Dalai",
    "lead_phone": "+919827953551",
    "lead_quality": "HOT",
    "call_summary": "Arnav Dalai booked a VIP site visit for Saturday at 11:00 AM...",
    "action_taken": "site_visit_booked",
    "interested_configuration": "3BHK Villa",
    "appointment_ref": "VISIT-7021"
  }
}
```
- **Automated CRM Action:**
  1. Matches lead by `lead_id`, then `phone`, then `name`.
  2. Updates summary, notes, recording URL, and call run ID.
  3. Promotes temperature to `HOT` and locks stage to `APPOINTMENT_BOOKED`.
  4. Broadcasts SSE update to live Kanban.

---

## 4. Talkar Voice AI Agent Integration & Tools

Talkar Voice AI Agents integrate with the Sales CRM through **5 production-grade tools**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Talkar Voice AI Agent Tool Stack                              │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Tool Name                      │ Tool UUID                             │ Type          │
├────────────────────────────────┼───────────────────────────────────────┼───────────────┤
│ sales_crm_check_offerings      │ 63ea6f9d-0849-4bd1-a118-e6a148e978b1 │ HTTP GET (CRM)│
│ sales_crm_book_appointment     │ 19e9ba84-da79-4193-9b91-2698ece37c41 │ HTTP POST(CRM)│
│ sales_crm_schedule_callback    │ b740a505-e67c-4fc1-83b4-86ba1c5fd17b │ HTTP POST(CRM)│
│ sales_send_collateral_whatsapp │ 24c7b2cd-5038-431e-b24e-51bba04197ba │ HTTP POST(n8n)│
│ sales_send_appointment_..._wa  │ fbc9dc58-9290-454b-a956-d8686689a03c │ HTTP POST(n8n)│
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

### Tool 1: `sales_crm_check_offerings`
* **UUID:** `63ea6f9d-0849-4bd1-a118-e6a148e978b1`
* **Method:** `GET`
* **Endpoint:** `https://salescrm.talkar.in/api/companies/{{company_slug}}/offerings`
* **Parameters:**
  * `company_slug` (`string`, required): Tenant slug (e.g. `prestige-group`, `clove-dental`).
  * `category` (`string`, optional): Product category (e.g. `3BHK`, `Implants`).
  * `budget_max` (`number`, optional): Max price filter.
  * `query` (`string`, optional): Free-text search term.

### Tool 2: `sales_crm_book_appointment`
* **UUID:** `19e9ba84-da79-4193-9b91-2698ece37c41`
* **Method:** `POST`
* **Endpoint:** `https://salescrm.talkar.in/api/companies/{{company_slug}}/appointments`
* **Parameters:**
  * `company_slug` (`string`, required): Tenant slug.
  * `lead_name` (`string`, required): Customer name.
  * `lead_phone` (`string`, required): Customer phone number.
  * `slot_date` (`string`, required): Date in `YYYY-MM-DD` (or natural date).
  * `slot_time` (`string`, required): Time (e.g. `11:00 AM`).
  * `appointment_type` (`string`, optional): `SITE_VISIT`, `DEMO`, or `OPD`.
  * `notes` (`string`, optional): Pickup address, requirements, special notes.

### Tool 3: `sales_crm_schedule_callback`
* **UUID:** `b740a505-e67c-4fc1-83b4-86ba1c5fd17b`
* **Method:** `POST`
* **Endpoint:** `https://salescrm.talkar.in/api/companies/{{company_slug}}/callbacks`
* **Parameters:**
  * `company_slug` (`string`, required): Tenant slug.
  * `lead_name` (`string`, optional): Customer name.
  * `lead_phone` (`string`, required): Customer phone number.
  * `callback_time` (`string`, required): Target timestamp or relative time (e.g. `"tomorrow at 5 PM"`).
  * `reason` (`string`, optional): Reason for callback.

### Tool 4: `sales_send_collateral_whatsapp`
* **UUID:** `24c7b2cd-5038-431e-b24e-51bba04197ba`
* **Method:** `POST`
* **Endpoint:** `https://n8n.talkar.in/webhook/send-sales-collateral`
* **Parameters:**
  * `phone_number` (`string`, required): Customer mobile phone.
  * `customer_name` (`string`, required): Customer full name.
  * `company_name` (`string`, required): Business name (e.g. `Prestige Group`).
  * `item_name` (`string`, required): Product title (e.g. `3BHK Luxury Garden Villa`).
  * `brochure_url` (`string`, required): Direct PDF brochure link.

### Tool 5: `sales_send_appointment_confirmation_whatsapp`
* **UUID:** `fbc9dc58-9290-454b-a956-d8686689a03c`
* **Method:** `POST`
* **Endpoint:** `https://n8n.talkar.in/webhook/send-sales-appointment-confirmation`
* **Parameters:**
  * `phone_number` (`string`, required): Customer mobile phone.
  * `customer_name` (`string`, required): Customer full name.
  * `company_name` (`string`, required): Business name.
  * `appointment_type` (`string`, required): e.g. `VIP Site Visit & Cab Pickup`.
  * `booking_ref` (`string`, required): Appointment reference code (e.g. `VISIT-7021`).
  * `slot_date` (`string`, required): e.g. `Saturday, 28th November 2026`.
  * `slot_time` (`string`, required): e.g. `11:00 AM`.
  * `notes` (`string`, optional): Pickup location or meeting details.

---

### Telephony Context Variables & Conventions

| Variable Token | Purpose & Voice Agent Rule | Telephony Context |
| :--- | :--- | :--- |
| **`{{called_number}}`** | Dialed destination phone number. | **Outbound Calls:** Customer's mobile. Use for WhatsApp and CRM.<br/>**Inbound Calls:** Company sales desk number. |
| **`{{caller_number}}`** | Originating phone number. | **Outbound Calls:** Outbound Trunk ID (`+918031453020`). Do NOT send WhatsApp here!<br/>**Inbound Calls:** Customer's mobile number. |
| **`{{initial_context.lead_id}}`** | Pre-existing lead ID in Sales CRM. | Injected by auto-dialer or CRM trigger. |
| **`{{initial_context.customer_name}}`**| Prospect name from CRM. | Greeting personalization (`"Namaste Arnav Ji!"`). |
| **`{{current_weekday_Asia/Kolkata}}`** | Live wall-clock day of week in India. | Real-time date reasoning. |
| **`{{current_time_Asia/Kolkata}}`** | Live wall-clock time in India. | Prevents booking past slots. |

---

## 5. Decoupled WhatsApp & n8n Architecture

The Sales CRM follows a **Zero-Secret Architecture**: the CRM backend contains zero WhatsApp API tokens or Facebook app secrets. All Meta Cloud API dispatches route through universal, pre-authenticated n8n webhooks.

### n8n Webhook 1: Send Collateral & Brochure
- **Production URL:** `POST https://n8n.talkar.in/webhook/send-sales-collateral`
- **Authentication:** None (Public webhook gated by n8n validation)
- **Meta Template Dispatched:** `sales_collateral_share` (Category: `UTILITY`, Status: `APPROVED`)
- **Template Parameter Mapping:**
  - Header `{{1}}`: `company_name`
  - Body `{{1}}`: `customer_name`
  - Body `{{2}}`: `company_name`
  - Body `{{3}}`: `item_name`
  - Body `{{4}}`: `brochure_url`

### n8n Webhook 2: Appointment Confirmation
- **Production URL:** `POST https://n8n.talkar.in/webhook/send-sales-appointment-confirmation`
- **Meta Template Dispatched:** `sales_appointment_confirmed` (Category: `UTILITY`, Status: `APPROVED`)
- **Template Parameter Mapping:**
  - Header `{{1}}`: `company_name`
  - Body `{{1}}`: `customer_name`
  - Body `{{2}}`: `appointment_type`
  - Body `{{3}}`: `company_name`
  - Body `{{4}}`: `booking_ref`
  - Body `{{5}}`: `slot_date`
  - Body `{{6}}`: `slot_time`
  - Body `{{7}}`: `notes`

### Meta WhatsApp Cloud API Credentials & Templates
* **Business Name:** Talkar
* **WABA ID:** `1864197288272767`
* **Phone Number ID:** `1314579088403220` (`+91 22 6985 0873`)
* **Meta Permanent System User Token:** Gated inside n8n credential ID `A4TlqRpKEb5a6CGY`.

---

## 6. Autonomous Callback Scheduler & Auto-Dialer

The CRM includes a continuous background runner (`src/services/scheduler.ts`):

```typescript
// Background Service: polls every 30 seconds
export class CallbackSchedulerService {
  async processDueCallbacks(): Promise<number> {
    const dueLeads = await prisma.lead.findMany({
      where: {
        stage: 'QUALIFIED',
        callbackAt: { lte: now },
      },
    });

    for (const lead of dueLeads) {
      await salesService.triggerAiCall(lead.company.slug, lead.id);
      // Consumes timestamp to prevent double dialing
      await prisma.lead.update({
        where: { id: lead.id },
        data: { callbackAt: null, notes: `[Auto-Dialed] ...` },
      });
    }
  }
}
```

* **When Active:** Runs 24/7 on the CRM server.
* **Autonomous Trigger:** When `callbackAt` arrives and the lead is in `QUALIFIED`, the engine calls the Talkar API to dispatch Aditya/Aditi to auto-dial the prospect.

---

## 7. Multi-Industry Replication Playbook

### Why Backend Code is 100% Reusable
You **never need to modify the CRM backend or deploy new microservices** to support a new industry. The data model dynamically adapts via three tenant fields:
1. `company.slug`: Scopes all leads, offerings, and appointments.
2. `company.offeringNoun`: What the UI and agent call products (e.g. "Villa", "Treatment", "SaaS Tier").
3. `company.appointmentNoun`: What the UI and agent call appointments (e.g. "Site Visit", "OPD Consultation", "Live Demo").

### Industry Dynamic Terminology Mapping

| Industry | `offeringNoun` | `appointmentNoun` | Appointment Prefix | Typical Brochure |
| :--- | :--- | :--- | :--- | :--- |
| **Real Estate** | Villa & Apartment Configuration | VIP Site Visit & Cab Pickup | `VISIT-XXXX` | Floor Plan PDF |
| **Healthcare / Clinic** | Treatment & Dental Procedure | Doctor OPD Consultation | `OPD-XXXX` | Treatment Guide PDF |
| **B2B SaaS** | SaaS Subscription Tier | 15-Min Live Screen Demo | `DEMO-XXXX` | Product One-Pager PDF |
| **Automobile** | Vehicle Model & Trim | Home Test Drive | `DRIVE-XXXX` | Vehicle Specs PDF |
| **Education / EdTech**| Course & Batch | 1-on-1 Academic Counseling | `CLASS-XXXX` | Curriculum Syllabus PDF |

---

### 3-Minute Onboarding Workflow

#### Step 1: Provision Company in CRM (30 Seconds)
Send a single `POST /api/companies` request or use the Dashboard UI:
```bash
curl -X POST https://salescrm.talkar.in/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tata Motors EV",
    "slug": "tata-ev",
    "industry": "AUTOMOBILE",
    "offeringNoun": "EV Model & Trim",
    "appointmentNoun": "Home Test Drive",
    "initialOfferings": [
      {
        "code": "CURVV-EV-EMPOWERED",
        "title": "Tata Curvv EV Empowered Plus",
        "category": "SUV Coupe",
        "price": 2199000,
        "description": "55 kWh battery, 585 km range, panoramic sunroof, ADAS Level 2.",
        "brochureUrl": "https://salescrm.talkar.in/brochures/curvv-ev.pdf"
      }
    ]
  }'
```

#### Step 2: Upload Knowledge Base (1 Minute)
1. In Talkar Admin, create a Knowledge Base document named `"Tata Curvv EV Master FAQ"`.
2. Paste vehicle warranty, charging partners, battery chemistry, and exchange bonus details.
3. Set `retrieval_mode: "full_document"`.

#### Step 3: Create Voice AI Agent Workflow (1.5 Minutes)
Use the production TypeScript workflow template below. Attach the 5 standard tools and set:
`initial_context: { "company_slug": "tata-ev" }`.

---

### Production Master Voice Agent Workflow Code Template

```typescript
import { Workflow } from "@dograh/sdk";
import { agentNode, startCall, endCall, globalNode, webhook } from "@dograh/sdk/typed";

const wf = new Workflow({
  name: "Universal Sales Concierge (Sarvam 105B)",
});

// 1. Global Persona & Voice Rules
const global_node = wf.addTyped(globalNode({
  prompt: `
# CONTEXT & TELEPHONY
Today is {{current_weekday_Asia/Kolkata}}, {{current_time_Asia/Kolkata}} in year 2026.
Prospect Name: {{customer_name | fallback:Valued Customer}}.
Prospect Budget: {{budget | fallback:Unspecified}}.
Caller Phone: {{called_number}}.
Company Slug: {{company_slug | fallback:prestige-group}}.

# ROLE & PERSONA
You are Aditya, Senior Sales Executive.
- Tone: Attentive, polite, articulate, transparent.
- Language: Seamlessly match caller's language (English, Hindi, Hinglish, Kannada, Telugu, Tamil).
- Brevity: Speak at most 1 to 2 short sentences per turn (under 25 words). Never monologue.
- Turn-Taking: Always conclude with a single conversational question.
  `,
}));

// 2. Start Node: Personalized Opening
const start = wf.addTyped(startCall({
  name: "Start",
  greeting: "Namaste {{customer_name | fallback:Ji}}! This is Aditya from the sales desk. I'm reaching out regarding your recent inquiry — did I catch you at a good time for a quick 2-minute chat?",
  prompt: "If caller agrees or asks anything, immediately call begin_sales_desk. If caller says wrong number or hang up, call exit_from_start.",
  allow_interrupt: true,
  delayed_start: true,
  delayed_start_duration: 1.5,
}));

// 3. Sales Desk: BANT Qualification & Tool Execution
const sales_desk = wf.addTyped(agentNode({
  name: "Sales Desk",
  prompt: `
# GOAL
Qualify prospect, present matched catalog offerings, book appointments, and send WhatsApp brochures.

# WORKFLOW RULES
1. DISCOVERY: Ask configuration/model requirements. Call sales_crm_check_offerings with company_slug: '{{company_slug}}'.
2. PRICING: Quote accurate pricing from tool. Pronounce Indian currency naturally.
3. WHATSAPP BROCHURE: Offer to send PDF to WhatsApp. Call sales_send_collateral_whatsapp with phone_number: '{{called_number}}'.
4. BOOK APPOINTMENT: Offer complimentary appointment/demo slot. When agreed, call sales_crm_book_appointment. Immediately after, call sales_send_appointment_confirmation_whatsapp.
5. BUSY / CALLBACK: If prospect is busy, ask preferred time and call sales_crm_schedule_callback.
  `,
  tool_uuids: [
    "63ea6f9d-0849-4bd1-a118-e6a148e978b1", // sales_crm_check_offerings
    "19e9ba84-da79-4193-9b91-2698ece37c41", // sales_crm_book_appointment
    "b740a505-e67c-4fc1-83b4-86ba1c5fd17b", // sales_crm_schedule_callback
    "24c7b2cd-5038-431e-b24e-51bba04197ba", // sales_send_collateral_whatsapp
    "fbc9dc58-9290-454b-a956-d8686689a03c", // sales_send_appointment_confirmation_whatsapp
  ],
  extraction_enabled: true,
  extraction_prompt: "Extract customer requirements, appointment booking, and action taken.",
  extraction_variables: [
    { name: "prospect_name", type: "string", prompt: "Prospect full name" },
    { name: "action_taken", type: "string", prompt: "One of: site_visit_booked, brochure_sent, callback_scheduled, inquiry_only" },
    { name: "appointment_ref", type: "string", prompt: "Booking code like VISIT-7021 or 'none'" },
  ],
}));

// 4. End Call Node
const end_call = wf.addTyped(endCall({
  prompt: "Conclude warmly and thank the customer for speaking with us. Wish them a wonderful day.",
  extraction_enabled: true,
  extraction_prompt: "Summarize call outcome and lead quality.",
  extraction_variables: [
    { name: "lead_quality", type: "string", prompt: "One of: HOT, WARM, COLD" },
    { name: "call_summary", type: "string", prompt: "1-2 sentence overview of customer requirements and next steps" },
  ],
}));

// 5. CRM Live Lead Sync Webhook Node
const crm_sync = wf.addTyped(webhook({
  name: "CRM Live Lead Sync",
  endpoint_url: "https://salescrm.talkar.in/api/webhooks/call-completed",
  payload_template: {
    run_id: "{{workflow_run_id}}",
    workflow_run_id: "{{workflow_run_id}}",
    lead_id: "{{initial_context.lead_id}}",
    phone: "{{initial_context.phone}}",
    recording_url: "{{recording_url}}",
    company_slug: "{{company_slug}}",
    summary: "{{gathered_context.call_summary}}",
    extracted_data: {
      lead_id: "{{initial_context.lead_id}}",
      lead_name: "{{initial_context.customer_name}}",
      lead_phone: "{{initial_context.phone}}",
      lead_quality: "{{gathered_context.lead_quality}}",
      call_summary: "{{gathered_context.call_summary}}",
      action_taken: "{{gathered_context.action_taken}}",
      appointment_ref: "{{gathered_context.appointment_ref}}",
    },
  },
}));

// Canvas Transitions
wf.edge(start, sales_desk, {
  label: "Begin Sales Desk",
  condition: "Caller responds, agrees, or asks about offerings.",
});
wf.edge(start, end_call, {
  label: "Exit from Start",
  condition: "Caller says wrong number, not interested, or hangs up.",
});
wf.edge(sales_desk, end_call, {
  label: "Sales Complete",
  condition: "Appointment is booked, brochure sent, or all inquiries answered.",
});
```

---

## 8. Summary Checklist for Pitch Demos

| Phase | Duration | Action | What the Client Sees |
| :--- | :--- | :--- | :--- |
| **1. Company Setup** | 30 sec | `POST /api/companies` with client's brand & 2 offerings | Client's branded Kanban board on screen |
| **2. Live Voice Call** | 2 min | Client dials outbound or receives AI call | AI speaks in natural Hindi/English, answers catalog questions, quotes prices |
| **3. WhatsApp Proof** | Immediate | AI triggers collateral & appointment tools | Client's phone buzzes with approved Meta WhatsApp brochure and appointment reference |
| **4. CRM Closure** | Immediate | AI hangs up $\rightarrow$ post-call webhook fires | Client watches their own lead card turn **`🔥 HOT`** in the **Booked** column with full call recording and AI summary |

---

## 9. Production Database Management (Sales CRM & Hotel PMS)

Both the **Sales CRM** and **Hotel PMS** are powered by SQLite engines through Prisma ORM.

> ⚡ **No SSH or server access is required:** 100% of database inspection, record creation, data updates, and lead/booking cleanup can be executed directly via REST APIs from your local terminal or scripts.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     Production Database Management Architecture                        │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ Service                                  │ Production Base URL                         │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ Talkar Universal Sales CRM               │ https://salescrm.talkar.in                  │
│ Talkar Hotel Property Management System  │ https://hotelpms.talkar.in                  │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

### Part A: Sales CRM Operations (`https://salescrm.talkar.in`)

#### 1. Inspect & View Records
```bash
# View all leads and BANT stats for a company
curl -s https://salescrm.talkar.in/api/companies/prestige-group/leads | jq .

# View aggregate summary stats only
curl -s https://salescrm.talkar.in/api/companies/prestige-group/leads | jq .stats

# View all scheduled appointments
curl -s https://salescrm.talkar.in/api/companies/prestige-group/appointments | jq .

# View product catalog / offerings
curl -s https://salescrm.talkar.in/api/companies/prestige-group/offerings | jq .

# View company profile & configuration
curl -s https://salescrm.talkar.in/api/companies/prestige-group | jq .
```

#### 2. Clean / Delete a Lead (Cascades Appointments)
Deleting a lead automatically deletes all associated appointments in SQLite.
```bash
# Delete lead by UUID
curl -X DELETE https://salescrm.talkar.in/api/companies/prestige-group/leads/<LEAD_ID>
```

#### 3. One-Liner: Find & Delete Lead by Phone Number
```bash
PHONE="+919827953551"
LEAD_ID=$(curl -s https://salescrm.talkar.in/api/companies/prestige-group/leads | jq -r --arg p "$PHONE" '.leads[] | select(.phone == $p) | .id')

if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
  curl -s -X DELETE https://salescrm.talkar.in/api/companies/prestige-group/leads/$LEAD_ID | jq .
  echo "✅ Deleted lead $LEAD_ID ($PHONE)"
else
  echo "ℹ️ No lead found for $PHONE"
fi
```

#### 4. Add / Seed a Lead Manually
```bash
curl -X POST https://salescrm.talkar.in/api/companies/prestige-group/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vikram Malhotra",
    "phone": "+919876543210",
    "email": "vikram.m@example.com",
    "temperature": "HOT",
    "stage": "QUALIFIED",
    "budget": "2 Crore Rupees",
    "timeline": "30 days",
    "notes": "Looking for 3BHK duplex villa with east-facing garden"
  }' | jq .
```

#### 5. Add / Book an Appointment Manually
```bash
curl -X POST https://salescrm.talkar.in/api/companies/prestige-group/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "lead_name": "Vikram Malhotra",
    "lead_phone": "+919876543210",
    "slot_date": "2026-11-29",
    "slot_time": "03:00 PM",
    "appointment_type": "SITE_VISIT",
    "notes": "Pickup from Indiranagar, Bangalore"
  }' | jq .
```

#### 6. Update Lead Stage & Temperature (Kanban Movement)
Move a lead between Kanban columns (`NEW`, `QUALIFIED`, `APPOINTMENT_BOOKED`, `WON`, `LOST`):
```bash
curl -X PATCH https://salescrm.talkar.in/api/companies/prestige-group/leads/<LEAD_ID>/stage \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "APPOINTMENT_BOOKED",
    "temperature": "HOT"
  }' | jq .
```

#### 7. Add an Offering / Product to Catalog
```bash
curl -X POST https://salescrm.talkar.in/api/companies/prestige-group/offerings \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PRESTIGE-5BHK-PALACE",
    "title": "5BHK Signature Palace Villa",
    "category": "Villa",
    "price": 45000000,
    "description": "6,500 sq.ft private estate with infinity pool and private helipad",
    "brochureUrl": "https://salescrm.talkar.in/brochures/palace-villa.pdf"
  }' | jq .
```

---

### Part B: Hotel PMS Operations (`https://hotelpms.talkar.in`)

#### 1. Inspect & View Records
```bash
# View all configured hotel properties
curl -s https://hotelpms.talkar.in/api/hotels | jq .

# View all bookings for a hotel
curl -s https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings | jq .

# Lookup a specific reservation by Booking Reference or Phone
curl -s https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings/BER-4029 | jq .
curl -s https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings/+491701234567 | jq .

# Check live date availability & pricing quotes
curl -s "https://hotelpms.talkar.in/api/hotels/hotel-berlin/availability?check_in=2026-11-25&check_out=2026-11-27&adults=2" | jq .

# View hotel occupancy and front-desk KPI metrics
curl -s https://hotelpms.talkar.in/api/hotels/hotel-berlin/stats | jq .
```

#### 2. Clean / Hard-Delete a Reservation
Deletes the reservation record and its item line records from SQLite:
```bash
# Delete reservation by Reference Code or UUID
curl -X DELETE https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings/BER-4029 | jq .
```

#### 3. Cancel a Reservation (Releases Inventory)
Marks the reservation as `CANCELLED` and immediately releases room inventory back to availability:
```bash
curl -X POST https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings/BER-4029/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Guest called to cancel due to flight delay"}' | jq .
```

#### 4. Update Reservation Operational Status
Update status to `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, or `NO_SHOW`:
```bash
curl -X POST https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings/BER-4029/status \
  -H "Content-Type: application/json" \
  -d '{"status": "CHECKED_IN"}' | jq .
```

#### 5. Add / Create a Reservation Manually
```bash
curl -X POST https://hotelpms.talkar.in/api/hotels/hotel-berlin/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "room_code": "BER-DBL",
    "guest_first_name": "Hans",
    "guest_last_name": "Mueller",
    "guest_phone": "+491701234567",
    "guest_email": "hans.mueller@example.de",
    "check_in_date": "2026-11-26",
    "check_out_date": "2026-11-28",
    "adults_count": 2,
    "with_breakfast": true,
    "special_requests": "Quiet room on high floor"
  }' | jq .
```

#### 6. Add / Update Room Type Inventory
```bash
curl -X POST https://hotelpms.talkar.in/api/hotels/hotel-berlin/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BER-SUITE",
    "name": "Penthouse Sky Suite with Sauna",
    "description": "Top floor luxury suite with private sauna and city panoramic views",
    "basePriceNight": 190,
    "breakfastPriceNight": 20,
    "totalInventory": 3,
    "maxAdults": 2,
    "maxChildren": 2,
    "bedType": "1 King Bed"
  }' | jq .
```

#### 7. Upsert Complete Hotel Property (Without SSH)
Syncs hotel policies, amenities, and room inventory in a single call:
```bash
curl -X POST https://hotelpms.talkar.in/api/hotels/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "taj-goa",
    "name": "Taj Holiday Village Resort & Spa",
    "brand": "Taj Hotels",
    "city": "Goa",
    "country": "India",
    "currency": "INR",
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "roomTypes": [
      {
        "code": "TAJ-VIL",
        "name": "Cottage Garden View Villa",
        "basePriceNight": 14500,
        "breakfastPriceNight": 1500,
        "totalInventory": 12
      }
    ]
  }' | jq .
```

---

### Part C: Direct Server / Terminal Access (Server Admins Only)

If SSH access to the production host (`80.225.241.81`) is needed:

```bash
# Connect to production host
ssh ubuntu@80.225.241.81

# Sales CRM SQLite database location
cd /var/www/sales
sqlite3 prisma/dev.db "SELECT id, name, phone, stage, temperature FROM Lead;"

# Hotel PMS SQLite database location
cd /var/www/hotel-pms
sqlite3 prisma/dev.db "SELECT bookingReference, guestFirstName, guestLastName, checkInDate, status FROM Booking;"
```

