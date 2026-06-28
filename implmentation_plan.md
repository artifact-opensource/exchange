AV Exchange Implementation Plan
This document outlines the proposed changes to address your requests across the main app, DApp, and Investor Hub.

User Review Required
IMPORTANT

Since we are dealing with 3 separate frontend applications (Root Vite+Express, DApp Next.js, and Investor Hub Vite) in one folder, I need to know how you plan to deploy them on Vercel. Should the main landing page simply link to the DApp and Investor Hub as separate deployments, or do we need to merge them into a single monorepo setup?

Open Questions
WARNING

TradingView Charts: You mentioned you want TradingView charts to work in the DApp. Do you have a paid TradingView Advanced Charts license/library, or should we use their free lightweight-charts library?
Aerodrome LP & NFT Staking Contracts: Since we are deploying soon, I will mock the ABI and contract addresses through environment variables (NEXT_PUBLIC_STAKING_CONTRACT etc.) for now. Is there a specific network (e.g. Base) this will be deployed on?
Proposed Changes
Main Application (Root)

[MODIFY] App.tsx
Landing Page: Add a new central landing page (minimal, bold, central logo) as the initial view before entering the dimensions.
Logo Interactions: Remove the CSS tilt (group-hover:rotate-12) from the AV logo. Update the logo onClick handler to navigate to the landing page, open the contact InfoOverlay, and trigger a global state refresh for API connections and GitHub sync.
Scroll Glitch: Fix the scroll snap behavior for the ML dimension to prevent the layout from pushing back up.

[MODIFY] components/ProjectCatalogue.tsx & services/githubService.ts
GitHub Refresh: The current caching strategy (CACHE_TTL = 5 mins) prevents immediate refreshes. I will add a force-refresh capability that can be triggered when clicking the logo.

[MODIFY] components/ResearchPortal.tsx & index_ipfs.md
IPFS Links: Read the IPFS CIDs from index_ipfs.md and Research.artifactvirtual.com and wire them into the ResearchPortal component's "RESEARCH_NODES" and "PUBLICATIONS" links so they resolve properly.
Ledger DApp (/ledger/dapp)

[MODIFY] ledger/dapp/package.json & Vercel Configs
Install required dependencies for Coinbase OnchainKit, TradingView lightweight-charts, and swap components.
Ensure vercel.json and next config are fully configured for Vercel deployment.

[MODIFY] ledger/dapp/src/components/*
Trading & Swaps: Implement swap interfaces and wire them.
TradingView: Integrate TradingView lightweight-charts.
DeFi Staking: Add an interface for Aerodrome LP and NFT staking (mocked via env vars).
Investor Hub (/im/artifact-virtual-investor-hub)

[MODIFY] im/artifact-virtual-investor-hub/index.html & CSS
Theming: Strip the generic template theme and apply the AV Exchange dark/glassmorphic theme (black/white/monochrome with minimal accents).

[MODIFY] im/artifact-virtual-investor-hub/src/App.tsx
Integration: Ensure the login and gated entry route correctly and share the visual language of the root application.
Verification Plan
Automated Tests
Run npm run build and npm run lint on the root, dapp, and im workspaces.
Manual Verification
Start the dev servers and verify the new landing page, logo click behavior, and scroll behavior on the ML page.
Test the GitHub refresh functionality.
Verify DApp components render correctly with mocked environment variables.
Verify Investor hub adopts the correct theme.
