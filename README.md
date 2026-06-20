# @geopera/sdk

[![npm](https://img.shields.io/npm/v/@geopera/sdk.svg)](https://www.npmjs.com/package/@geopera/sdk)
[![types](https://img.shields.io/npm/types/@geopera/sdk.svg)](https://www.npmjs.com/package/@geopera/sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The official TypeScript client for the **Geopera** geospatial data platform — satellite tasking
& archive ordering, catalog search, the data platform, billing, and more.

Every capability is an *operation* at `POST /v1/op/{operation_id}`. `invoke` infers the request
body **and** the return type from the `operation_id` you pass — so calls are checked at compile
time and the whole surface tracks the live API by construction. No hand-maintained types, no drift.

- 🟦 **Fully typed by `operation_id`** — wrong body? wrong field? caught at compile time.
- 🪶 **Tiny + dependency-free** — one `fetch` wrapper, ESM + CJS, tree-shakeable.
- 🌐 **Runs anywhere `fetch` does** — Node 18+, Deno, Bun, edge runtimes, the browser.
- 🔑 **Auth your way** — a Geopera API key, or an OAuth bearer token from sign-in.

## Install

```bash
npm install @geopera/sdk
# or: pnpm add @geopera/sdk · yarn add @geopera/sdk
```

## Quickstart

```ts
import { GeoperaClient } from "@geopera/sdk";

const geopera = new GeoperaClient({ token: "gpra_..." }); // base URL defaults to https://api.geopera.com

const results = await geopera.invoke("catalog.search", {
  collections: ["sentinel-2-l2a"],
  limit: 10,
});
//    ^? typed as the catalog.search output model
```

The operation id, the `body` type, and the awaited result type are all linked: change the id and
your editor immediately knows the new body and return shapes.

## Authentication

Pass either credential as `token`; Geopera accepts both and runs every call as that principal
(with its scopes, audit, and provenance):

```ts
// Headless / server-to-server — a Geopera API key (create one in the portal).
const geopera = new GeoperaClient({ token: "gpra_..." });

// A signed-in user's OAuth bearer token.
const geopera = new GeoperaClient({ token: userAccessToken });
```

## Error handling

A non-2xx response throws a `GeoperaError` carrying the HTTP status and the RFC 9457
`problem+json` body Geopera returns for business / permission errors:

```ts
import { GeoperaClient, GeoperaError } from "@geopera/sdk";

try {
  await geopera.invoke("orders.tasking.estimate", body);
} catch (err) {
  if (err instanceof GeoperaError) {
    console.error(err.status, err.operation, err.problem);
  }
}
```

## Advanced

```ts
// Custom base URL (staging), extra headers, a custom fetch, request cancellation:
const geopera = new GeoperaClient({
  token: "gpra_...",
  baseUrl: "https://staging-api.geopera.com",
  headers: { "X-Request-Source": "my-app" },
  fetch: myFetch, // e.g. undici / a test stub
});

const ac = new AbortController();
await geopera.invoke("catalog.search", { limit: 50 }, { signal: ac.signal });

// One-off without constructing a client:
import { callOperation } from "@geopera/sdk";
const out = await callOperation("organizations.create", { name: "Acme" }, "gpra_...");
```

## Types

`OperationId`, `OperationInput<K>`, and `OperationOutput<K>` are exported for building your own
typed helpers. They are derived from the Geopera OpenAPI (regenerate with `pnpm gen`), the same
document that drives the REST API and the Python SDK.

## Links

- 📚 API reference: https://docs.geopera.com/api-reference
- 🌐 Geopera: https://geopera.com
- 📦 npm: https://www.npmjs.com/package/@geopera/sdk

## License

MIT © Geopera
