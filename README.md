# B2B Wholesale & Escrow Marketplace (Ethiopia Ecosystem) 🇪🇹

A highly scalable B2B multi-vendor marketplace tailored for the Ethiopian commerce ecosystem. The system is designed to seamlessly handle diverse product domains—including **Apparel/Boutiques, Electronics, Fast-Moving Consumer Goods (FMCG), and Hotel Room/Dorm Bookings**—within a unified, single-schema database architecture.

---

## 🌟 Key Architectural Features & Guardrails

### 1. Dual-Mode PostgreSQL Engine (Section 6 & 7)
- **Embedded Zero-Config Execution**: Supports both standard PostgreSQL (`pg`) connection pools and embedded **PGlite** (`@electric-sql/pglite`) for instant, zero-dependency demo execution.
- **Dynamic Structural Types (JSONB)**: Leverages PostgreSQL JSONB columns with GIN indexing for `wholesale_prices`, `specifications`, and `attributes`, enabling fast containment queries (`WHERE attributes @> '{"size": "32"}'`).

### 2. Core Business Logic & Pricing Engines (Section 2)
- **Section 2.1 Tiered Wholesale Pricing**: Dynamic volume-based discount resolution algorithms.
- **Section 2.2 RFQ & Negotiation Engine**: Enables custom bulk unit rates that override default pricing tiers during checkout upon vendor approval.
- **Section 2.3 Retail Sample Pipeline**: MOQ bypass logic permitting physical quality auditing without triggering bulk wholesale MOQ rejection.
- **Section 2.4 Logistics & Shared-Freight Pooling**: Enables micro-retailers sharing delivery footprints within temporal windows to join consolidation pools and split commercial vehicle rental rates (e.g., Isuzu 5-Ton trucks).

### 3. Centralized Escrow & Financial Lifecycle (Section 3)
- Strict Escrow State Machine enforcing sequential progression: `Created` ➔ `Paid` ➔ `Shipped` ➔ `Delivered` ➔ `Released` / `Disputed`.
- Localized payment aggregator integration (Chapa & Telebirr) with automated 2.5% platform commission calculation upon escrow release.

### 4. Security Architecture Guardrails (Section 5)
- **5.1 Concurrency Lock Engine**: Explicit database transactions with Pessimistic Locking (`SELECT ... FOR UPDATE`) preventing negative stock race conditions.
- **5.2 Idempotent Payment Webhooks**: Cryptographic HMAC SHA256 signature verification + DB unique constraints on `tx_ref`, dropping duplicate webhooks cleanly with `200 OK` without multiplying balances.
- **5.3 IDOR Perimeter Shielding**: Token-bound query scoping (`WHERE id = ? AND vendor_id = current_user_id`).
- **5.4 Chat & Communication Scrubbers**: Real-time Socket.io regex filters scanning for offline contact details (phone numbers, CBE/Telebirr bank accounts, external links) to protect escrow integrity.
- **5.5 Global Maintenance Control**: Instantaneous 503 API freeze middleware for emergency maintenance.

### 5. Real-Time Duplex Socket.io Server & Premium SPA
- Glassmorphic obsidian UI featuring live persona switching (Abebe Kebede - Buyer, Sara Tadesse - Vendor, Admin Arbiter).
- Interactive simulators for tiered pricing, sample MOQ bypass, RFQ negotiations, shared-freight cost splits, and escrow webhook triggers.

---

## 🚀 Quickstart & Installation

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/demirewu-manidefro/B2B-Wole.git
   cd B2B-Wole
   npm install
   ```

2. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   *The server will boot automatically on `http://localhost:3000` using the embedded PGlite engine and seed initial Ethiopian marketplace test personas and inventory.*

3. **Run Automated Verification Suite**:
   ```bash
   npm test
   ```
   *Executes automated verification asserting concurrency locks, webhook idempotency, JSONB containment queries, chat scrubbers, and sample MOQ bypasses.*

---

## 📁 Project Structure

```
├── public/                 # Glassmorphic Frontend SPA
│   ├── css/style.css       # Obsidian & emerald/gold design system
│   ├── js/app.js           # UI state controller & interactive simulators
│   ├── js/api.js           # REST API client wrapper
│   ├── js/socket-client.js # Real-time Socket.io event handler
│   └── index.html          # Main application dashboard
├── src/                    # Backend Node.js & Express Engine
│   ├── controllers/        # Business logic (Products, Orders, RFQ, Freight, Webhooks, Admin)
│   ├── db/                 # Dual-mode PG/PGlite adapter, DDL schema, and Ethiopian seeder
│   ├── middleware/         # Auth, IDOR shield, and 503 Maintenance freeze
│   ├── routes/             # REST API routes
│   ├── services/           # Cloud storage URL pointers & orphan cleanup
│   ├── socket/             # Socket.io duplex server & chat regex scrubber
│   ├── utils/              # Ethiopian phone/bank regex scrubber engine
│   └── server.js           # Main server boot & integration
└── tests/                  # Automated verification test suite
    └── verify_engine.js    # Comprehensive 15-test architecture assertion suite
```
