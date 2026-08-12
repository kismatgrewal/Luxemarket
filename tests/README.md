# LuxeMarket test suite

Two independent layers: fast **unit** tests (Vitest + jsdom) and **end-to-end**
browser tests (Playwright). They use different runners and never overlap —
Vitest only collects `tests/unit/**`, Playwright only `tests/e2e/**`.

## Running

```bash
# Unit / component tests (jsdom)
pnpm test            # vitest run — one-shot, used in CI
pnpm test:watch      # vitest — watch mode
pnpm test -- --coverage   # v8 coverage report (text + html + lcov)

# End-to-end tests (Chromium via Playwright)
pnpm test:e2e        # skips live steps unless E2E_LIVE is set (see below)
```

### Config

- `vitest.config.ts` — jsdom environment, `@` → `./src` alias (mirrors
  `tsconfig.json`), `tests/setup.ts` setup file, v8 coverage over `src/lib/**`.
- `tests/setup.ts` — registers `@testing-library/jest-dom` matchers and cleans
  up the DOM after every test.
- `playwright.config.ts` — `baseURL` `http://localhost:3000`, a single
  `chromium` project, traces/screenshots on failure. The `webServer` block is
  commented out; uncomment it to have Playwright boot `pnpm dev` automatically.

## What's covered

### Unit (`tests/unit/`)

| File                 | Under test                | Highlights                                                                 |
| -------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `rbac.test.ts`       | `@/lib/rbac`              | Full CUSTOMER/VENDOR/ADMIN × permission grant matrix; a vendor is denied `admin:access`; `assertCan` throws `ForbiddenError` with the missing permission; unauthenticated (`null`/`undefined`) denies everything. |
| `money.test.ts`      | `formatMoney`, `formatCompact` | Cents→dollars precision, zero, negatives, millions, USD/EUR/GBP/JPY, locale grouping; compact `K`/`M`/`B` abbreviation and rounding. |
| `slug.test.ts`       | `slugify`, `timeAgo`      | Spaces, punctuation, unicode/emoji stripping, leading/trailing dashes, empty results; deterministic relative time via fake timers (seconds→years, incl. "yesterday"). |
| `commission.test.ts` | commission formula        | Integer-cent split `commission = round(gross · bps / 10000)`, `earnings = gross − commission`; no float drift; boundary rates (0 / 10000 bps); multi-vendor order summation. Mirrors `src/server/services/orders.ts` (implemented inline until a shared helper is exported). |

### End-to-end (`tests/e2e/`)

| File                       | Flow                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| `checkout.spec.ts`         | Home → product detail → add to cart → cart → checkout; asserts order summary and the Stripe Payment Element iframe. Also an empty-cart empty-state check. |
| `vendor-product.spec.ts`   | Vendor signs in → create product → **Generate with AI** description → save → product appears in the vendor list. |
| `admin-approval.spec.ts`   | Admin signs in → vendors screen → approve a PENDING vendor → row status becomes Approved. |

The e2e specs use resilient role/text selectors. Each test skips at its first
line unless a live server is available, so `pnpm test:e2e` passes with no
database. To run them for real:

```bash
E2E_LIVE=1 pnpm dev          # in one terminal (or uncomment webServer)
E2E_LIVE=1 pnpm test:e2e     # in another
```

Credentials and target URL are read from env vars (with test defaults):
`E2E_BASE_URL`, `E2E_VENDOR_EMAIL`, `E2E_VENDOR_PASSWORD`, `E2E_ADMIN_EMAIL`,
`E2E_ADMIN_PASSWORD`.
