# Sahana Bhakshanam

A mobile-first, full-stack ordering application for a pure vegetarian Tamil Brahmin Iyer home kitchen. Customers order only inside fixed meal windows, authenticate by mobile OTP, and pay by cash or direct UPI only when food arrives. The chef gets a focused daily menu, availability, order, and profile dashboard.

## Product surfaces

- `/` — consumer menu, live cutoff countdown, OTP login, bag, delivery details, and order confirmation
- `/chef` — chef OTP gate, daily session toggles, specials, portions, incoming orders, and public profile
- `/api/*` — D1-backed OTP sessions, menu/profile state, server-enforced orders, and signed notification relay
- `android-app/` — installable Android shell that opens the same production application with HTTPS-only navigation

## Live application and Android download

- Web application: [Sahana Bhakshanam](https://namma-veetu-samayal.cheenu.chatgpt.site/)
- Latest installable APK: [Download Sahana-Bhakshanam.apk](https://github.com/vsreeni29-commits/Sahana-Bhakshanam/releases/latest/download/Sahana-Bhakshanam.apk)

The APK is produced automatically by GitHub Actions and published as the repository's latest release. It is debug-signed for direct testing and sideload installation. Configure a permanent signing key before distributing through Google Play.

## Local setup

```bash
npm ci
cp .env.example .env
npm run dev
```

The prototype can expose OTP `246810` only when `OTP_DEMO_MODE=true`. Never deploy publicly with demo mode enabled. Configure Twilio Verify and set demo mode to `false` for real SMS OTP.

## Data and migrations

Structured state is stored in Cloudflare D1. Drizzle schema is in `db/schema.ts`; generated SQL migrations are in `drizzle/`.

```bash
npm run db:generate
```

## GitHub repository strategy

Use one repository named `sahana-bhakshanam`. The customer application, chef dashboard, Worker API routes, D1 schema, migrations, assets, and architecture documentation share one release boundary and should be versioned together.

GitHub stores and reviews the source; GitHub Pages cannot run this application because OTP, orders, notifications, and D1 require a server runtime. Deploy the repository to a Cloudflare Worker-compatible host and keep production secrets in the hosting platform. The included GitHub Actions workflow validates lint, types, and the deployable build on every push and pull request.

The current web URL can later be replaced by a registered custom domain without splitting the repository. Add the hostname to the Worker-compatible host, set the required DNS records, then set the GitHub repository variable `WEB_APP_URL` to the new HTTPS address and rerun the Android workflow. The next APK will open the custom domain.

A second repository is justified only if the WhatsApp Business relay later becomes an independently owned and independently deployed service. It is not needed for the current operation.

## Integration boundaries

- `TWILIO_*` activates real SMS verification.
- `ORDER_RELAY_URL` receives a signed, server-to-server order payload suitable for a WhatsApp Business Cloud API adapter.
- Personal WhatsApp cannot be silently automated through `wa.me`; the app therefore guarantees immediate delivery to the chef dashboard and treats WhatsApp as a separately tracked relay.
- No payment gateway exists by design. The server stores only the customer’s selected doorstep method (`cash` or `upi`).
- Pure vegetarian is a server-enforced business rule: public menu queries filter legacy data, new specials are always vegetarian, and order confirmation rejects any non-vegetarian record.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete functional and technical specification.
