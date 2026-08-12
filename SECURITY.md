# Security Policy

We take the security of LuxeMarket and its users seriously. This document explains
which versions receive security fixes and how to report a vulnerability
responsibly.

## Supported Versions

Security updates are provided for the latest minor release. Older minors receive
critical fixes on a best-effort basis until the next minor supersedes them.

| Version | Supported |
| --- | :---: |
| 1.4.x | ✅ |
| 1.3.x | ⚠️ Critical fixes only |
| < 1.3 | ❌ |

We recommend always running the latest `1.4.x` patch release.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately through either channel:

- **GitHub Security Advisories** — use *Security → Report a vulnerability* ("Report
  a vulnerability" / private advisory) on the repository. This is preferred.
- **Email** — **security@luxemarket.example**. Encrypt sensitive details with our
  PGP key if possible.

Please include, as far as you can:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept, affected endpoint/component, version)
- Any relevant logs, requests, or screenshots
- Your assessment of severity

### What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement of your report | within **48 hours** |
| Initial assessment & triage | within **5 business days** |
| Status updates | at least every **7 days** until resolved |
| Fix & coordinated disclosure | severity-dependent; critical issues expedited |

We follow **coordinated disclosure**: we will work with you on a fix and a
disclosure timeline, and we ask that you give us a reasonable window to release a
patch before any public disclosure. With your consent, we are happy to credit you
in the advisory and release notes.

### Scope

In scope: the LuxeMarket application code in this repository — authentication and
session handling, RBAC enforcement, payment and webhook handling (Stripe/n8n),
the AI generation endpoint, data exposure, injection, and access-control flaws.

Out of scope: vulnerabilities in third-party services themselves (report those to
Stripe, OpenAI, n8n, or the hosting provider directly), findings that require a
compromised device or privileged local access, social engineering, and volumetric
denial-of-service. Automated scanner output without a demonstrated impact is not
considered a valid report.

### Safe harbor

We will not pursue or support legal action against researchers who act in good
faith, avoid privacy violations and service disruption, only interact with
accounts they own or have explicit permission to test, and give us a reasonable
time to remediate before disclosure.

## Handling of Secrets

If you believe credentials (e.g. `NEXTAUTH_SECRET`, Stripe keys, `OPENAI_API_KEY`,
`N8N_WEBHOOK_SECRET`, database URLs) have been exposed, treat it as an incident:
rotate the affected secrets immediately and notify us. Never post secrets in an
issue, PR, or log attachment. See
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md#2-environment-variables) for how
configuration is managed.

Thank you for helping keep LuxeMarket and its community safe.
