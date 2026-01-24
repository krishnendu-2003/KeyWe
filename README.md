# Stellar Swap Aggregator – System Architecture & Soroban Contract Flow

---

## 1. High-Level System Architecture

```
┌──────────────────────────┐
│        Frontend UI       │
│  (Next.js / Web App)     │
│                          │
│ • Asset selection        │
│ • Slippage controls      │
│ • Route preview          │
│ • Wallet connect         │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│     Aggregator API       │
│   (Node.js / NestJS)     │
│                          │
│ • Path discovery         │
│ • Price simulation       │
│ • Slippage estimation    │
│ • Route ranking          │
│ • AI optimization layer  │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│    Data & Liquidity      │
│        Sources           │
│                          │
│ • Horizon Orderbooks     │
│ • AMM Pools              │
│ • Soroban Contracts      │
│ • Anchor Metadata        │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│   Soroban Smart Layer    │
│                          │
│ • Swap Executor          │
│ • Route Validator        │
│ • Fee Manager            │
│ • Privacy Router         │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│      Stellar Network     │
│                          │
│ • Orderbook DEX          │
│ • AMM Pools              │
│ • Path Payments          │
└──────────────────────────┘
```

---

## 2. Component-Level Breakdown

### 2.1 Frontend (Client Layer)

**Responsibilities**

* Asset discovery (USDC, EURC, XLM, RWAs)
* Real-time quotes (WebSockets)
* Route visualization
* User preferences (privacy, speed, price)

**Wallets**

* Freighter
* Albedo
* Ledger

---

### 2.2 Aggregator API (Off-chain Intelligence Layer)

**Core Modules**

#### 1. Path Discovery Engine

* Pulls orderbooks from Horizon
* Reads AMM reserves
* Builds liquidity graph

```
Node: Asset
Edge: Liquidity + rate
Weight: Price impact + fee
```

#### 2. Simulation Engine

* Simulates swaps off-chain
* Calculates:

  * Output amount
  * Slippage
  * Price impact

#### 3. Route Optimizer

* Dijkstra / A* / Bellman-Ford
* Multi-hop routing
* Hybrid paths (Orderbook + AMM)

#### 4. AI Optimization Layer (Optional)

* Predicts short-term liquidity shifts
* Suggests split orders (TWAP)
* Scores RWA trust & anchor risk

---

### 2.3 Caching & Storage

* Redis → Orderbook snapshots
* PostgreSQL → Routes, analytics
* Neo4j (optional) → Graph routing

---

## 3. Soroban Smart Contract Architecture

### 3.1 Contract Overview

```
┌──────────────────────────┐
│   AggregatorController   │  ← Entry point
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│     RouteExecutor        │
│                          │
│ • Multi-hop execution    │
│ • Atomic swaps           │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│     AMMAdapter           │
│     OrderbookAdapter     │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│      FeeManager          │
│      PrivacyRouter       │
└──────────────────────────┘
```

---

## 4. Soroban Contract Flow (Step-by-Step)

### Step 1: Quote Request (Off-chain)

User requests:

```
Swap 100 USDC → EURC
Slippage ≤ 0.5%
Privacy: ON
```

Aggregator API:

* Finds best route
* Simulates output
* Returns route payload

---

### Step 2: Transaction Preparation

Route example:

```
USDC → XLM → EURC
```

Payload:

```
[
  { pool: AMM1, from: USDC, to: XLM, amount: 100 },
  { pool: OB1, from: XLM, to: EURC }
]
```

---

### Step 3: AggregatorController.executeSwap()

**Responsibilities**

* Validate route
* Check slippage bounds
* Lock user funds

```
fn execute_swap(
  user: Address,
  input_asset: Asset,
  amount: i128,
  min_out: i128,
  route: Vec<RouteHop>
)
```

---

### Step 4: RouteExecutor

* Executes hops atomically
* Reverts on failure

```
for hop in route {
  if hop.type == AMM {
    call AMMAdapter.swap()
  }
  if hop.type == ORDERBOOK {
    call OrderbookAdapter.swap()
  }
}
```

---

### Step 5: FeeManager

* Platform fee
* Referral fee (optional)
* Sponsored fees (gasless UX)

```
fee = amount * 0.1%
```

---

### Step 6: PrivacyRouter (Optional)

If enabled:

* Randomized execution order
* Temporary contract vaults
* Route splitting

---

### Step 7: Settlement

* Final asset transferred to user
* Events emitted

```
event SwapExecuted {
  user,
  input_asset,
  output_asset,
  amount_in,
  amount_out
}
```

---

## 5. RWA Support in Contract Flow

### Asset Validation

* Issuer whitelist
* Anchor trust score

### Compliance Modes

* Public pool
* KYC-only pool
* Jurisdiction-based routing

---

## 6. Security & Safety

* Slippage guards
* Route validation
* Reentrancy protection
* Anchor risk scoring

---

## 7. Upgrade Path

* Add cross-chain bridges
* Add institutional custody
* Add AI-based execution contracts

---

## 8. Why This Architecture Wins

* Leverages Stellar’s native strengths
* Hybrid DEX routing (unique)
* RWA-first design
* AI + Privacy ready
* Institutional-grade

---
