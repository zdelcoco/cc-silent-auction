# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint (src/, zero warnings allowed)
```

## Architecture Overview

This is a React 19 auction website using Vite, Bootstrap 5, and Firebase (anonymous auth + Firestore). Deployed via GitHub Pages.

### Key Patterns

**Firebase Integration**: Anonymous authentication with optional admin privileges. Users sign in anonymously and provide a display name to bid. Admin status is stored in Firestore user documents.

**Real-time Data**: `ItemsProvider` uses Firestore `onSnapshot` for live bid updates without page refresh. Auction items and bids are stored in a single flattened document (`auction/items`) with keys like `item{id}_bid{bidNumber}`.

**Context Providers**: Two context providers wrap the app:
- `ItemsContext` - auction items and bids from Firestore
- `ModalsContext` - modal state management (item details, sign-up)

**Routing**: Two routes - Home (public item grid) and Admin (protected, requires admin flag in user's Firestore doc).

### Data Model

Items are defined in `public/items.yml` and synced to Firestore via the Admin page. The Firestore document uses a flat structure where `item{N}_bid0` contains item metadata and `item{N}_bid{M>0}` contains individual bids.

### Demo Mode

Set `demo = true` in `src/App.jsx` to enable auto-resetting timers for demonstration purposes. Set to `false` for production auctions.

## Firebase Configuration

Firebase config lives in `src/firebase/config.jsx`. For your own deployment, replace the `firebaseConfig` object with your project's credentials.
