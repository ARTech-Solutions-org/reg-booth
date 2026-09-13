# EventPass — QR Registration, Entrance Kiosk & Badge Printing System

A modern, full-stack event registration and check-in system. Features online guest self-registration with downloadable digital QR passes, a dedicated distraction-free entrance kiosk terminal for rapid barcode scanning and walk-in badge printing, and an administrative control portal with real-time attendance telemetry.

---

## Key Features

### 1. Public Registration Flow (`/register`)
- **Online Guest Sign-Up**: Public-facing registration form collecting Attendee Name, Email, Organization/Company, and Ticket Type.
- **Instant QR Pass Generation**: Immediately generates an event credential pass upon submission.
- **Pass Download**: Attendees can download a high-resolution digital pass formatted for smartphone camera rolls and apple/google wallet display.

### 2. Entrance Kiosk Station (`/kiosk`)
- **Dedicated Door Station**: Distraction-free, full-screen entrance interface designed for tablets or laptop desks at the venue entrance.
- **Option A — Rapid QR Scanner**:
  - Live camera scanner with high-performance detection.
  - Instant verification feedback: *Entry Approved*, *Duplicate / Already Checked In*, or *Invalid Pass*.
  - Large **Print Badge Now** action button for instant attendee badging.
- **Option B — On-Site Walk-In**:
  - Fast registration form for guests arriving without pre-registration.
  - Automatically registers and marks them checked in on-site.
- **Zero Distractions**: Hides admin telemetry and sensitive attendee roster data from guests standing at the desk.

### 3. Badge Printing System
- **Lanyard-Ready Format**: Formatted for standard 3" × 4" (76mm × 102mm) conference badges and credential pouches.
- **Print Optimization**: Clean `@media print` stylesheet that isolates the badge card, hiding browser navigation, margins, and backgrounds for clean thermal or standard printer output.
- **Color-Coded Tiers**: Distinct badge tier styling for VIP, Speaker, General Admission, Press, and Staff.

### 4. Admin Operations Portal (`/admin`)
- **Live Attendance Board (`/admin`)**: Real-time telemetry monitoring total registrations, arrivals, and percentage inside, along with a live feed of recent entries.
- **Attendee Roster (`/admin/attendees`)**: Searchable, filterable list of all attendees with status indicators and on-demand badge reprinting.
- **Organizer Authentication**: Secure login protecting administrative controls and rosters.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Wouter
- **Scanner & QR**: ZXing, HTML5 Canvas QR engine, QRCode
- **Backend**: Express 5, Node.js, TypeScript
- **Database**: PostgreSQL (Neon Serverless Connection Pooling via `pg`)
- **Deployment**: Vercel (Monolithic: Static SPA + Serverless Express API)

---

## Project Structure

```
├── api/                         # Vercel serverless function entrypoint
│   └── index.ts                 # Express API serverless handler
├── src/
│   ├── client/                  # Frontend (React 19, Vite, Tailwind CSS)
│   │   ├── components/          # BadgeCard, ScannerView, PrintBadgeModal
│   │   ├── pages/               # Register, Kiosk, Dashboard, Attendees, Login
│   │   ├── lib/                 # API client, QR pass utilities
│   │   └── App.tsx              # Router & layout shell
│   ├── server/                  # Backend Express application
│   │   ├── db/                  # PostgreSQL connection pool & schema initialization
│   │   ├── routes/              # Public, Attendees, Check-Ins, Dashboard, Auth
│   │   ├── lib/                 # Authentication & session helpers
│   │   └── app.ts               # Express application setup
│   └── shared/                  # TypeScript types shared between client and server
├── vercel.json                  # Vercel deployment & rewrite configuration
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (or npm / yarn)
- PostgreSQL database (e.g. Neon)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mohanned-Mahmoud/reg-booth.git
   cd reg-booth
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   PORT=8080
   SESSION_SECRET=your-secret-session-key
   ORGANIZER_PASSWORD=welcome123
   ```

4. **Build and start the application:**
   ```bash
   # Build the production bundle
   pnpm run build

   # Start the server
   pnpm start
   ```

5. **Open in browser:**
   - **Public Registration**: `http://localhost:8080/register`
   - **Entrance Kiosk**: `http://localhost:8080/kiosk`
   - **Admin Portal**: `http://localhost:8080/admin` *(Default: `organizer` / `welcome123`)*

---

## Deployment to Vercel

This repository is configured to deploy as a unified single project on Vercel:

1. Import the repository into [Vercel](https://vercel.com/new).
2. Configure **Environment Variables** in the Vercel project settings:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `SESSION_SECRET`: A secure random string for signing sessions.
3. Click **Deploy**. Vercel will automatically build the frontend and serve both the static SPA and `/api/*` serverless routes under your domain.
