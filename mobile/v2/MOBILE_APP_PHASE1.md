# ChatOrbit Mobile v2 – Foundation & Architecture

## Overview

We are building an **independent v2 version of the ChatOrbit mobile application** located in mobile/v2.


This version is **not a refactor of v1**. It is a fresh implementation with a new layout, modern design language, and cleaner internal structure, while **reusing the existing backend and token-based session model**.

The goal of v2 is to establish a strong, scalable foundation that improves UX, code structure, and long-term maintainability.

---

## Core Principles

- Independent implementation (do not copy v1 mobile code)
- Same backend API and token/session model as v1
- Modern, clean UI and UX
- Clear project structure (no monolithic `App.ts`)
- WebRTC-based real-time communication
- Strong separation of concerns (UI, state, networking, WebRTC)

---

## Backend & API

- The **API backend remains unchanged**
- The same token-based session mechanism is used
- Each session supports **exactly two participants**
- OpenAPI documentation for the backend is provided in: mobile/v2/OPENAPI.json


This file should be used as the **primary reference** for API endpoints, request/response formats, and authentication rules.

---

## Entry Flow (Landing Screen)

The landing screen must present **two primary actions**, identical in behavior to v1:

1. **Mint a new token** to create a new chat session
2. **Join an existing session** using a token

### Notes
- Token rules and validation remain the same as in v1
- UI/UX must be newly designed (do not reuse v1 layouts)
- Minimal, focused first impression

---

## Design & Visual Language

- **Do not reference v1 or the web app for layout**
- Create a **new, modern mobile-first design**
- Preferred color palette:
  - Deep blue as the primary background
  - Yellow and orange as accent and action colors
- Clean typography, high contrast, accessible UI
- Designed for iPhone first, adaptable to iPad

---

## Application Structure

The application must be **cleanly structured**.

### Key rule
> Do **not** place all logic in `App.ts`.

Recommended high-level structure:
- `screens/` – navigation-level views
- `components/` – reusable UI components
- `webrtc/` – WebRTC connection and media handling
- `services/` – API and signaling logic
- `state/` – session and UI state management
- `utils/` – helpers and shared utilities

---

## Session Cockpit Screen (Phase 1)

Once a user joins a session, they are taken to the **Cockpit screen**.

### Initial Mode: Text-Only Chat

The cockpit opens in **full-screen text chat mode**, similar to modern chat or messenger apps.

#### Chat behavior
- Messages flow **from top to bottom**
- New messages appear at the bottom
- Text input is anchored at the bottom
- Submission via button or Enter key

#### Encryption
- Messages must be **encrypted**
- Encryption follows the same token-based rules as v1

---

## Cockpit Layout

### Header (Top)

The header must be **compact and always visible**.

From left to right:
1. **Back button**
2. **ChatOrbit logo + “ChatOrbit” text** (small, centered)
3. **Accordion / menu icon**

#### Header status indicator
- Green dot → connection active
- Orange dot → waiting / negotiating
- Red dot → disconnected

#### Menu (accordion)
Phase 1 menu items:
- FAQ
- Privacy
- About
- Help

(Content ideas may be referenced from the web app, but layout must remain new.)

---

### Chat Area (Center)

- Scrollable message list
- Must properly resize for keyboard
- No clipped or inaccessible content

---

### Footer (Bottom)

- Text input field
- Send button
- Keyboard-aware layout

---

## WebRTC Connectivity

- WebRTC is used for session connectivity
- Text chat is the initial mode
- Video and audio will be layered on later phases
- Connection lifecycle must be cleanly managed
- Session teardown must not affect token validity unless explicitly ended

---

## Phase 1 Scope Summary

Included:
- New landing screen
- Token minting and joining
- Cockpit screen
- Encrypted text chat
- Connection status indicator
- Header menu with static links
- Clean project structure

Excluded (future phases):
- Video/audio UI
- Advanced session controls
- Animations and transitions
- Multi-session handling

---

## Final Notes

- This v2 app is a **foundation**, not a feature dump
- Focus on correctness, structure, and UX clarity
- Design and architecture decisions should favor long-term extensibility
- v1 and web app should not dictate layout decisions

---
