# EventPass — QR Registration, Check-In & Badge Printing System

An end-to-end event registration, on-site mobile QR scanning, and lanyard badge printing application. Built with React 19, TypeScript, Express, Tailwind CSS, ZXing, and QRCode.

---

## Key Features

1. **Public-Facing Registration Flow (`/register`)**:
   - Shareable link for attendees to register online.
   - Collects Name, Email, Organization/Company, and Ticket Type.
   - Instantly generates a unique, collision-resistant QR code pass.
   - **Download Ticket**: Generates a high-resolution PNG digital pass formatted with the event banner, attendee name, ticket tier, and QR code to save to mobile camera roll or photos.

2. **Admin Entrance Station (`/admin`)**:
   - Secured with organizer authentication (Default: `organizer` / `welcome123`).
   - **Option A — Mobile Camera QR Scanner**:
     - Dual-engine architecture:
       - **Hardware-accelerated Native `BarcodeDetector`** for 60 FPS scanning on Android Chrome.
       - **`@zxing/browser` + `BrowserMultiFormatReader`** with `TRY_HARDER: true` fallback for iOS Safari and other browsers.
       - iOS-specific permission handling (`playsInline`, rear-camera constraints `facingMode: 'environment'`, tap-to-enable button).
       - Haptic vibration feedback on successful scan.
       - Instant status banner: Entry Approved (Green) / Duplicate Check-In (Amber) / Unrecognized (Red).
       - **Print Badge Button**: Immediately visible upon scan completion.
   - **Option B — Manual Walk-In Registration**:
     - Rapid on-site registration form for guests who did not register online.
     - Automatically creates attendee record and marks them as **checked in immediately**.
     - Generates unique QR ID and displays instant **Print Badge** button.

3. **Badge Printing System (Lanyard & Credential Ready)**:
   - Formatted for standard 3" × 4" (76mm × 102mm) conference lanyard holders.
   - Includes punch-hole alignment guide, event header, prominent attendee name, company affiliation, ticket tier badge (`VIP`, `SPEAKER`, `ATTENDEE`), and high-contrast centered QR code.
   - Optimized `@media print` stylesheet isolates the badge card, hiding all web UI, backgrounds, and navigation for crisp printing to any thermal or standard printer.

4. **Live Board & Attendee Roster (`/admin/dashboard` & `/admin/attendees`)**:
   - Real-time attendance percentage and counts (Total, Checked In, Pending).
   - Searchable and filterable attendee roster with individual "Print Badge" and "Download Pass" actions on every row.

---

## Quick Start & Operating Guide

### 1. Install & Run
```bash
# Navigate to project directory
cd F:\ARTech\reg

# Install dependencies (already completed)
pnpm install

# Build client and server
pnpm run build

# Start the unified server (port 8080)
pnpm start
```

Once started, open your browser:
- **Public Registration Portal**: `http://localhost:8080/register`
- **Admin Entrance Check-In Station**: `http://localhost:8080/admin`
  - Username: `organizer`
  - Password: `welcome123`

### 2. Mobile Browser Access (Android & iPhone)
The server binds to `0.0.0.0:8080`. To access from a mobile device on the same local Wi-Fi network:
1. Find your computer's local IP address (e.g. `ipconfig` -> `192.168.1.xxx`).
2. Open `http://<YOUR-IP>:8080/admin` on your iPhone or Android browser.
3. Allow camera permissions when prompted to scan attendee QR codes.

---

## Architecture & Project Structure

```
F:\ARTech\reg\
├── src/
│   ├── client/                  # Frontend (React 19, Vite, Tailwind CSS)
│   │   ├── components/
│   │   │   ├── BadgeCard.tsx    # Lanyard-ready 3"x4" physical badge component
│   │   │   ├── PrintBadgeModal.tsx # Badge preview & print trigger modal
│   │   │   └── ScannerView.tsx  # Mobile camera scanner (native BarcodeDetector + ZXing)
│   │   ├── pages/
│   │   │   ├── Register.tsx     # Public registration page & QR pass download
│   │   │   ├── AdminCheckIn.tsx # Admin Option A (Scan) & Option B (Manual Walk-In)
│   │   │   ├── Attendees.tsx    # Attendee roster with search, filter, badge printing
│   │   │   ├── Dashboard.tsx    # Live telemetry and recent check-ins
│   │   │   └── Login.tsx        # Organizer gatepass login
│   │   ├── lib/
│   │   │   ├── api.ts           # Type-safe API client
│   │   │   └── qr-utils.ts      # QR generation & PNG ticket download logic
│   │   ├── App.tsx              # Routing and navigation shell
│   │   ├── main.tsx
│   │   └── index.css            # Tailwind CSS & @media print badge styles
│   ├── server/                  # Backend (Express 5, TypeScript)
│   │   ├── db/
│   │   │   └── index.ts         # Persistent data store (SQLite file-backed / JSON)
│   │   ├── routes/
│   │   │   ├── public.ts        # Public registration endpoints
│   │   │   ├── attendees.ts     # Admin attendee management & walk-in registration
│   │   │   ├── check-ins.ts     # QR check-in & duplicate detection
│   │   │   ├── dashboard.ts     # Live summary statistics
│   │   │   └── auth.ts          # Organizer session management
│   │   ├── app.ts               # Express middleware & static client serving
│   │   └── index.ts             # Server startup entrypoint
├── data/                        # Persistent database store (data/event-data.json)
├── dist/                        # Production client & server builds
├── scripts/
│   └── verify.js                # End-to-end flow test suite
├── package.json
└── vite.config.ts
```
