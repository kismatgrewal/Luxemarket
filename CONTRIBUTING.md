# Contributing to LuxeMarket

Thanks for helping build LuxeMarket. This guide covers the dev workflow, coding
conventions, and what a mergeable change looks like. For architecture and setup,
see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

By participating you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Getting set up

Prerequisites: **Node 20+**, **pnpm 9+**, Docker (for Postgres). Full instructions
live in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md#1-local-development).

```bash
nvm use                       # Node 20 (from .nvmrc)
corepack enable               # pnpm 9
pnpm install
cp .env.example .env          # fill in secrets
docker compose up -d db n8n
pnpm db:migrate && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

---

## Development workflow

1. **Find or open an issue** describing the change. For anything non-trivial,
   discuss the approach first.
2. **Branch** from `main` using the convention below.
3. **Build** the change with tests. Keep PRs focused and reviewable.
4. **Run the checks locally** (they must pass — CI runs the same ones):
   ```bash
   pnpm typecheck   # tsc --noEmit
   pnpm lint        # next lint
   pnpm test        # vitest run
   pnpm build       # prisma generate && next build
   ```
5. **Open a PR** against `main`, fill in the template, and link the issue.

### Branch naming

```
<type>/<short-slug>
```

Examples: `feat/vendor-payout-cycle`, `fix/cart-total-rounding`,
`docs/api-webhooks`, `chore/bump-prisma`.

---

## Commit conventions

We use [**Conventional Commits**](https://www.conventionalcommits.org/). The format
keeps history readable and drives the changelog.

```
<type>(optional scope): <description>

[optional body]

[optional footer(s)]
```

**Types**

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code-behavior change |
| `refactor` | Neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system, dependencies |
| `ci` | CI configuration |
| `chore` | Maintenance, tooling |
| `revert` | Reverts a previous commit |

**Examples**

```
feat(checkout): create Stripe PaymentIntent from server cart
fix(orders): round commission per line to avoid off-by-a-cent totals
docs(adr): add ADR 0003 for per-line commission
refactor(rbac): extract permission map into a typed record
```

- Use the imperative mood ("add", not "added").
- A breaking change is marked with `!` (`feat(api)!: …`) and a `BREAKING CHANGE:`
  footer.
- Scopes commonly map to areas: `storefront`, `vendor`, `admin`, `checkout`,
  `orders`, `payouts`, `catalog`, `auth`, `rbac`, `api`, `db`.

---

## Coding standards

- **TypeScript strict.** No `any` escapes without justification;
  `noUncheckedIndexedAccess` is on — handle possibly-undefined access.
- **Money is integer cents.** Never floats. Format with `formatMoney` from
  `@/lib/utils`. See [ADR 0002](./docs/adr/0002-money-as-integer-cents.md).
- **Server vs. client.** Data access (Prisma, Stripe, OpenAI) lives in
  `src/server/services/*` and `src/lib/*`; client components need `"use client"`.
  Presentation never queries Prisma directly.
- **Validate all external input** with Zod (form data, query params, webhook
  bodies).
- **Authorize privileged actions** with `assertCan(role, permission)` from
  `@/lib/rbac`, and still scope queries by owner.
- **Imports** use the `@/` alias. Reuse UI primitives from `@/components/ui`.
- **Comments explain *why*, not *what*.**
- **Formatting** is enforced by Prettier (2-space, double quotes, trailing commas,
  100-col) and ESLint. Run `pnpm format` before committing.

A Husky pre-commit hook runs `lint-staged` (ESLint `--fix` + Prettier) on staged
`*.ts`/`*.tsx` files.

---

## Testing

- **Unit / service tests:** Vitest. Cover business logic — commission math, RBAC
  permission checks, order state transitions, cart totals.
  ```bash
  pnpm test          # run once
  pnpm test:watch    # watch mode
  ```
- **End-to-end:** Playwright for critical flows (browse → cart → checkout, vendor
  fulfilment, admin approval).
  ```bash
  pnpm test:e2e
  ```
- New features should ship with tests; bug fixes should include a regression test.
- Don't rely on real external services in unit tests — mock Stripe/OpenAI/n8n at
  the `src/lib/*` boundary.

---

## Database changes

- Edit [`prisma/schema.prisma`](./prisma/schema.prisma), then create a migration:
  ```bash
  pnpm db:migrate --name <descriptive_name>
  ```
- Commit the generated migration files with your change.
- Never edit an already-merged migration; add a new one.
- Update [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) when the schema changes.

---

## Pull request checklist

Before requesting review, confirm:

- [ ] Branch and commits follow the conventions above
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (new/updated tests included)
- [ ] `pnpm build` succeeds
- [ ] Schema changes include a migration and updated `docs/DATA_MODEL.md`
- [ ] Docs updated for user-facing or API changes
- [ ] No secrets committed; `.env` untouched
- [ ] PR description explains the *why* and links the issue

Maintainers may request changes; keep the discussion focused and the diff small.
Thanks again for contributing.
