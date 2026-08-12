# LuxeMarket — Complete Project Guide

> Server: **http://localhost:3000** (production mode — `next start`)
> App runs on: Next.js 14.2 + Prisma + PostgreSQL 17

---

## 1. Login / Admin & User Accounts

**Sabhi accounts ka password: `Passw0rd!`**

### Admin (poore system ka control)
| Role | Email | Access |
|------|-------|--------|
| **Admin** | `admin@luxemarket.com` | `/admin` (dashboard, catalog, orders, vendors, users, payouts, audit) |

### Vendor accounts (seller panel `/vendor`)
| Store | Email |
|-------|-------|
| Atelier Verdi | `hello@atelierverdi.com` |
| Maison Lumière | `studio@maisonlumiere.com` |
| Nord & Field | `team@nordandfield.com` |
| Aurelia Fine | `care@aureliafine.com` |
| Copper & Quill | `founders@copperquill.com` |
| Halcyon Supply Co. | `ops@halcyonsupply.com` |
| Meridian Trunk | `apply@meridiantrunk.com` |

### Customer accounts (shopping side)
`amara.okoye@example.com`, `elena.rossi@example.com`, `fatima.al.sayed@example.com`,
`grace.kim@example.com`, `henry.adler@example.com`, `isabella.moretti@example.com`,
`james.whitfield@example.com`, `liam.o.brien@example.com`, `marcus.chen@example.com`,
`nadia.haddad@example.com`, `oliver.bennett@example.com`, `rahul.kapoor@example.com`,
`sofia.herrera@example.com`, `thomas.muller@example.com`, `yuki.tanaka@example.com`

> Naya account: `/register` se banaya ja sakta hai (khud register → login → shop).

---

## 2. All Page Links

### Public pages (bina login)
| Page | URL |
|------|-----|
| Home (hero + 4 featured products) | `http://localhost:3000/` |
| Sign in | `http://localhost:3000/login` |
| Create account | `http://localhost:3000/register` |
| Product detail (public) | `http://localhost:3000/product/verdi-leather-tote` |

### Products (4)
| Product | Price | Link |
|---------|-------|------|
| Aurelius Gold Chronograph | $1,295 | `/product/aurelius-gold-chronograph` |
| Verdi Leather Tote | $429 | `/product/verdi-leather-tote` |
| Noir Ambré Eau de Parfum | $98 | `/product/noir-ambre-eau-de-parfum` |
| Court Sneaker in Ivory | $145 | `/product/court-sneaker-ivory` |

### Customer pages (login required — bina login `/register` pe redirect)
| Page | URL |
|------|-----|
| Shop / Search (catalog + filters) | `http://localhost:3000/search` |
| Vendor directory | `http://localhost:3000/vendors` |
| Store page (7 stores: `/store/atelier-verdi` etc.) | `http://localhost:3000/store/atelier-verdi` |
| Cart | `http://localhost:3000/cart` |
| Checkout | `http://localhost:3000/checkout` |
| Checkout success | `http://localhost:3000/checkout/success` |
| Account profile | `http://localhost:3000/account` |
| Order history | `http://localhost:3000/orders` |
| Order detail | `http://localhost:3000/orders/<number>` |

### Admin pages (sirf ADMIN — `admin@luxemarket.com`)
| Page | URL |
|------|-----|
| Admin dashboard | `http://localhost:3000/admin` |
| Catalog (products + **Add product**) | `http://localhost:3000/admin/catalog` |
| **Add product (images upload ke saath)** | `http://localhost:3000/admin/catalog/new` |
| Orders | `http://localhost:3000/admin/orders` |
| Vendor management | `http://localhost:3000/admin/vendors` |
| Users | `http://localhost:3000/admin/users` |
| Payouts | `http://localhost:3000/admin/payouts` |
| Audit log | `http://localhost:3000/admin/audit` |

### Vendor pages (sirf VENDOR/ADMIN)
| Page | URL |
|------|-----|
| Vendor dashboard | `http://localhost:3000/vendor` |
| Onboarding / Apply | `http://localhost:3000/vendor/onboarding` |
| Products | `http://localhost:3000/vendor/products` |
| Add product | `http://localhost:3000/vendor/products/new` |
| Edit product | `http://localhost:3000/vendor/products/<id>/edit` |
| Orders | `http://localhost:3000/vendor/orders` |
| Payouts | `http://localhost:3000/vendor/payouts` |
| Settings | `http://localhost:3000/vendor/settings` |

---

## 3. Database Details

| Item | Value |
|------|-------|
| Engine | PostgreSQL 17.10 (Postgres.app) |
| Host / Port | `localhost:5432` |
| Database | `luxemarket` |
| Username | `luxe` |
| Password | `luxe` |
| Schema | `public` |
| **Connection string** | `postgresql://luxe:luxe@localhost:5432/luxemarket?schema=public` |
| Health check | `http://localhost:3000/api/health` → `{"status":"ok","database":"up"}` |

**Tables:** `User`, `Vendor`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payout`, `Review`, `AuditLog` (+ NextAuth `Account`, `Session`)

**Current data:** 24 users · 7 vendors · 10 categories · 4 products · 1 order · 28 reviews

---

## 4. Useful Commands

```bash
# App — production mode (abhi yehi chal raha hai)
npx next build && npx next start -p 3000

# App — dev mode (fast reload, sirf development ke liye)
npx next dev

# Database start (reboot ke baad)
open /Applications/Postgres.app

# Prisma sync + seed (seed 43 products wapas laa deta hai — dhyan rahe)
npx prisma db push
npx tsx prisma/seed.ts

# Sirf 4 demo products rakhne ke liye (catalogue trim)
npx tsx scripts/trim-catalogue.ts
```

---

## 5. Flow Checklist (sab verified working)

1. **Guest** → home (4 products + images), product detail, login, register → sab 200
2. **Guest** → cart/checkout/account/orders/search → `/register` redirect (callback ke saath)
3. **Register** → account banta hai → `/login?registered=1` (success banner) → login → wahi page pe wapas
4. **Admin login** → `/admin` + `/admin/catalog` + `/admin/catalog/new` → 200
5. **Add product (admin/vendor)** → image "Upload from device" → `public/products/uploads/` → save → storefront pe dikhta hai
6. **Login user** → `/cart`, `/account`, `/orders`, `/search`, `/checkout` → 200
7. **Health** → database up, 0 server errors
