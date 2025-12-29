# Technical Due Diligence: Quest

**Version:** 1.0  
**Date:** December 29, 2025  
**Status:** Audit Passed (Security Hardening Complete)

---

## 1. Executive Summary
Quest is built on a modern, high-performance web stack designed for scalability, type safety, and strict security boundaries. The architecture leverages **Serverless/Edge computing** (Next.js 14) and **Database-Native Security** (PostgreSQL RLS) to minimize infrastructure overhead while maximizing data protection.

## 2. Architecture Overview

### 2.1 Stack
*   **Frontend**: Next.js 14 (App Router), React Server Components (RSC), TailwindCSS.
*   **Backend / API**: Server Actions (Zero-API boilerplate), Supabase (PostgreSQL 15+).
*   **Runtime**: Vercel Edge Runtime (Middleware), Node.js (Server Actions).
*   **State Management**: React Query (Server State optimization).

### 2.2 Data Model
*   **Core Entity**: `Team`. All data is strictly siloed by `team_id`.
*   **Hierarchy**: `Team` -> `Department` -> `Project` -> `Quest` -> `Task`.
*   **Identity**: Managed via Supabase Auth. User Profiles are separate relations linked to Auth UIDs.

## 3. Security & Compliance ( The "Zero-Leak" Policy )

### 3.1 Database-Level Isolation (RLS)
Security is not handled in the application layer alone; it is enforced by the database kernel.
*   **Mechanism**: PostgreSQL Row Level Security (RLS).
*   **Policy**: `USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))`.
*   **Guarantee**: It is physically impossible for a user to query data from a team they do not belong to, even if the API endpoint contains a vulnerability.

### 3.2 Access Control (RBAC)
*   **Roles**: `Owner`, `Admin`, `Manager`, `Analyst`, `Member`.
*   **Implementation**: A centralized `getRoleContext(teamId)` service verifies permissions before *every* mutation.
*   **Protection**: Middleware ensures session validity; Server Actions enforce role capability.

### 3.3 Profile Privacy
*   **Strict Visibility**: User profiles are not public. A user can only view the profile of another user if they share a mutual Team membership. This prevents user enumeration attacks.

## 4. Scalability & Performance

### 4.1 Serverless Infrastructure
*   **No Cold Boots**: Middleware runs on Edge (global distribution).
*   **Connection Pooling**: Supavisor (Supabase) handles DB connection pooling, allowing thousands of concurrent lambda invocations without exhausting DB slots.

### 4.2 Frontend Optimization
*   **RSC Payload**: Heavy computations happen on the server; minimal JS is sent to the client.
*   **Optimistic UI**: The Quest Board uses optimistic updates for instant drag-and-drop feedback, syncing with the DB asynchronously.

## 5. Code Quality & Standards

*   **Type Safety**: 100% TypeScript coverage. Inference from Database Schema ensures end-to-end type safety.
*   **Documentation**:
    *   `LOGS.md`: Immutable record of all engineering phases.
    *   `ARCHITECTURE.md`: System design blueprints.
    *   `CODE_INVENTORY.md`: Map of all system components.
*   **Testing**: E2E Testing infrastructure ready (Playwright).

## 6. Risk Assessment

*   **Vendor Lock-in**: High reliance on Supabase/Next.js ecosystem. *Mitigation*: Core business logic is SQL (portable) and React (standard).
*   **Complexity**: RLS policies can be complex to debug. *Mitigation*: We maintain a "Nuclear Option" migration script (`99_security_sweep.sql`) to reset and re-verify all security policies instantly.
