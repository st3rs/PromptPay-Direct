# PromptPay-to-Crypto Gateway (PromptPayDirect)

![Fintech Architecture](https://img.shields.io/badge/Architecture-Fintech%20Prototype-blue?style=for-the-badge)
![Compliance](https://img.shields.io/badge/Compliance-AML%2FCFT%20Simulated-emerald?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-React%2019%20%7C%20Tailwind-94a3b8?style=for-the-badge)

PromptPayDirect is a production-ready fintech prototype demonstrating a seamless bridge between Thailand's **PromptPay (EMVCo QR)** ecosystem and **Digital Asset (USDT-TRC20)** disbursement. 

This repository showcases a complete "Provider Loop" simulation, including dynamic exchange rate fluctuations, logic-gated disbursement, and a multi-sig administrative console for high-value transaction approval.

## 🚀 Key Features

- **Dynamic EMVCo QR Generation**: Real-time generation of Thai QR Payment standard (v1.1) payloads with accurate CRC16-CCITT checksums.
- **Transaction Pulse Monitoring**: A high-fidelity "Pulse" screen that provides real-time status updates via a simulated backend socket.
- **Multi-Level Compliance Logic**:
  - **KYC/AML Screening**: Simulated beneficiary verification.
  - **Logic Guard**: Automated fuzzy-match verification between bank sender names and KYC records.
  - **Multi-Sig Approval**: Transactions exceeding $5,000 (configurable) are automatically held for administrative manual review.
- **Admin Terminal**:
  - **Liquidity Management**: Real-time monitoring of THB custody and USDT float.
  - **Auto-Hedge Simulation**: Automated buy-order placement on external exchanges (mocked) to maintain delta-neutral reserves.
  - **Audit Ledger**: High-integrity system logs with simulated hash-chains for event traceability.
- **Fintech UI/UX**:
  - Professional "Statement Style" data presentation.
  - Dual-language support (English/Thai).
  - Dark/Light mode optimization for 24/7 trading environments.

## 🛠 Technical Stack

- **Framework**: [React 19](https://react.dev/) (Concurrent Rendering)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Modular Design System)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/) (Financial Data Visualization)
- **Core Logic**:
  - `utils/promptpay.ts`: TLV (Tag-Length-Value) encoding for EMVCo.
  - `services/mockBackend.ts`: Async state machine simulating banking webhooks and blockchain disbursement.
  - `services/configService.ts`: Persistent global configuration for exchange rates and fees.

## 📐 Architecture Overview

### 1. The Exchange Loop
The application follows a strict linear workflow designed to minimize slippage and ensure compliance:
1. **Swap Interface**: User selects THB amount; real-time rate engine calculates USDT output including service fees.
2. **KYC Gate**: Collection of beneficiary PII (Personally Identifiable Information) and TRC20 destination address.
3. **Escrow/Pulse**: Dynamic QR is generated. The system enters a "Listening" state, awaiting a bank webhook.

### 2. The Verification Logic (MockBackend)
When a "transfer" is triggered via the Admin Simulator:
- **Verification**: The system compares the `senderName` from the bank payload against the `fullName` in the KYC record.
- **Risk Assessment**: If the amount is within the `MAX_AUTO_APPROVE_USD` threshold, disbursement happens automatically.
- **Disbursement**: Simulation of TRC20 broadcast and auto-hedging logic to balance the provider's book.

## 🔒 Security Measures (Simulated)

- **PII Masking**: Sensitive data is masked in the UI to prevent shoulder-surfing.
- **Integrity Logs**: Every system event is assigned a unique hash to simulate a tamper-evident audit trail.
- **Multi-Sig Gate**: Critical "Disbursement" stage requires a manual `AWAITING_APPROVAL` override for high-risk volumes.

## 📖 Development

This project uses modern ESM module imports via `esm.sh`. No local `node_modules` installation is required for quick prototyping.

### Quick Start
1. Clone the repository.
2. Open `index.html` in any modern browser or host via a static server.
3. Access the **Admin Terminal** at the bottom of the page to simulate bank webhooks and manage system configuration.

---

*Disclaimer: This is a prototype designed for architectural demonstration. Real-world implementation requires integration with authorized Thai Payment Service Providers (PSPs) and licensed Digital Asset Exchanges.*