# 1. Next.js App Router with React Server Components and Server Actions

- **Status:** Accepted
- **Date:** 2025-02-18
- **Deciders:** Engineering
- **Tags:** framework, architecture, rendering

## Context

LuxeMarket is a data-heavy, three-audience application (customer storefront,
vendor dashboards, admin console) that must be SEO-friendly on the public side and
richly interactive on the authenticated side. We needed a rendering and
data-access model that:

- ships minimal JavaScript for content-heavy catalog pages,
- keeps privileged logic (pricing, commission, payouts, RBAC) on the server where
  it cannot be tampered with,
- avoids a proliferation of bespoke REST endpoints for every mutation,
- and gives us one deployable, one language (TypeScript), and one type system end
  to end.

We are already committed to React and TypeScript. The main axis of choice was
*how* to render and *how* to mutate.

## Decision

Adopt **Next.js 14 with the App Router**, using **React Server Components (RSC)**
as the default and **Server Actions** for mutations.

Concretely:

- **RSC by default.** Pages and layouts are server components that read data by
  calling domain services in `src/server/services/*` directly — no client fetch,
  no serialization boundary for reads. `"use client"` is reserved for genuinely
  interactive leaves (cart drawer, checkout form, charts).
- **Server Actions for writes.** Form submissions and UI mutations invoke actions
  in `src/server/actions/*`. Each action validates input with Zod, authorizes with
  `assertCan`, calls a service, and revalidates affected paths.
- **Route handlers only for machine callers.** The `/api` surface is limited to
  NextAuth, webhooks (Stripe, n8n), `/api/health`, and the OpenAI helper — things
  that must be HTTP.
- **Layered server code.** Presentation → actions/services → Prisma. Presentation
  never touches the database directly.

## Consequences

**Positive**

- Smaller client bundles; catalog pages render as HTML with little hydration.
- Secrets and business logic stay server-side by construction.
- Far fewer endpoints to build, secure, and version — a mutation is a typed
  function call, not a hand-rolled route + client fetch + schema.
- End-to-end type safety from Prisma models through services to the UI.
- Streaming/suspense improves perceived performance on data-heavy pages.

**Negative / trade-offs**

- The RSC/Client boundary has a learning curve; forgetting `"use client"` or
  passing non-serializable props across the boundary causes confusing errors.
- Server Actions are newer and less familiar than REST; third-party/mobile clients
  can't call them, so any truly external API still needs a route handler.
- Some libraries assume a client runtime and need care (or wrappers) in RSC.
- Tighter coupling to Next.js/Vercel conventions.

**Mitigations**

- A clear layering rule (services own all queries) keeps the boundary legible.
- The route-handler surface remains available for anything that must be HTTP.

## Alternatives considered

- **Next.js Pages Router + REST/tRPC.** Mature and familiar, but pushes more work
  to the client, requires an explicit API layer for every mutation, and ships more
  JS. Rejected in favor of the smaller-surface RSC model.
- **SPA (Vite/CRA) + standalone API (NestJS/Express).** Maximum flexibility and a
  clean client/server split, but two codebases, two deploys, duplicated types, and
  worse SEO for the storefront. Overkill for a single product.
- **Remix.** Excellent data/mutation ergonomics (loaders/actions) and progressive
  enhancement, but the team's React Server Component direction and the Next.js
  ecosystem (Vercel, image optimization) tipped the decision.
- **Astro.** Great for content/SEO, weaker fit for the highly interactive,
  authenticated dashboards that are half the product.
