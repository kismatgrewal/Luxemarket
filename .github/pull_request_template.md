<!--
Thanks for contributing to LuxeMarket! Please fill out this template.
Keep PRs focused and reviewable. See CONTRIBUTING.md for conventions.
-->

## Summary

<!-- What does this PR do, and why? -->

## Related issues

<!-- e.g. Closes #123, Relates to #456 -->
Closes #

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behavior change
- [ ] `perf` — performance
- [ ] `test` — tests
- [ ] `build` / `ci` / `chore` — tooling
- [ ] Breaking change

## How has this been tested?

<!-- Unit/e2e tests, manual steps, screenshots for UI changes. -->

## Checklist

- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (tests added/updated where relevant)
- [ ] `pnpm build` succeeds
- [ ] Schema changes include a Prisma migration and updated `docs/DATA_MODEL.md`
- [ ] Docs updated for user-facing or API changes
- [ ] No secrets committed; `.env` untouched
- [ ] Money handled as integer cents (no floats)
- [ ] Privileged actions guarded with `assertCan` and input validated with Zod

## Screenshots / notes

<!-- Optional: UI before/after, migration notes, follow-ups. -->
