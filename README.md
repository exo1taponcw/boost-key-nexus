# Boost Key Nexus

Build a modern, high-performance web dashboard and key redemption portal for "BoostBot" — an automated Discord Server Boosting platform based on the uploaded specification.

Theme & Aesthetic:
- Aurora / Sunset Nebula theme: Dark obsidian violet base (#0D0B18) with frosted glassmorphic panels, radiant gradient borders, and luminous accents shifting through violet (#8B5CF6), hot coral (#F43F5E), and sunset peach (#FB923C).
- Lucide React icons, smooth spring physics, monospace formatting for keys, glowing focus rings, and confetti on successful redemption.

Core Features:
1. Customer Redemption Experience (/):
   - Hero section: "✦ BoostBot Network • Instant Discord Server Boosts", title "Claim Your Server Boosts in Seconds", and subtitle.
   - Live Stock Ticker Widget: Floating pill / header cards showing real-time 1-Month and 3-Month stock with status indicators.
   - Interactive Redemption Form:
     - Step 1: Formatted 12-character license key input (e.g. UDZ5-RCM9-7ZEA) with auto-capitalization, validation, and auto-detected plan tier.
     - Step 2: Discord server invite or Guild ID input with a live preview card showing server icon, name, member count, and boost level.
     - Step 3: Optional booster nickname field.
     - Step 4: Radiant glowing launch CTA ("Deploy 14 Boosts Now").
   - Live Execution Progress Modal: Multi-step pipeline animation (validating key -> fetching metadata -> authorizing accounts -> applied boosts) with confetti and downloadable receipt.

2. Admin Management Dashboard (/admin):
   - Protected by admin secret / password.
   - Live Inventory Manager with stock health indicators.
   - Bulk License Key Generator (1, 5, 10, 50 keys) for 1-Month and 3-Month tiers with one-click copy and CSV export.
   - Redemption Audit Logs with searchable history and timestamps.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://boost-key-nexus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/68717c00-e5ce-468e-a59a-dce13e2dea1f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
