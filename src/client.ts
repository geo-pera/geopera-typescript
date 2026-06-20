import type { OperationId, OperationInput, OperationOutput } from "./types";

export const DEFAULT_BASE_URL = "https://api.geopera.com";

/** Thrown on a non-2xx Geopera API response; preserves the RFC 9457 problem+json body. */
export class GeoperaError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: unknown,
    public readonly operation: string,
  ) {
    super(`Geopera operation '${operation}' failed (HTTP ${status})`);
    this.name = "GeoperaError";
  }
}

export interface GeoperaClientOptions {
  /** A Geopera API key (`gpra_...`) or an OAuth bearer token. */
  token: string;
  /** API base URL. Defaults to `https://api.geopera.com`. */
  baseUrl?: string;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Custom fetch (test stub, undici, etc.). Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/**
 * Fully-typed client for the Geopera platform. Every capability is an
 * operation reachable at `POST /v1/op/{operation_id}`; `invoke` infers the body
 * and return type from the `operation_id` you pass, so calls are checked at
 * compile time and track the live API by construction.
 *
 * ```ts
 * const geopera = new GeoperaClient({ token: "gpra_..." });
 * const out = await geopera.invoke("catalog.search", { collections: ["sentinel-2-l2a"], limit: 10 });
 * ```
 */
export class GeoperaClient {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly headers: Record<string, string>;
  private readonly _fetch: typeof fetch;

  constructor(opts: GeoperaClientOptions) {
    if (!opts || !opts.token) {
      throw new Error("GeoperaClient: `token` is required (a Geopera API key or OAuth bearer token).");
    }
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.token = opts.token;
    this.headers = opts.headers ?? {};
    const f = opts.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error("GeoperaClient: no global `fetch` available — pass `fetch` (Node < 18).");
    }
    this._fetch = f;
  }

  /** Invoke an operation by `operation_id`. Body + return type are inferred. */
  async invoke<K extends OperationId>(
    op: K,
    body: OperationInput<K>,
    options: { signal?: AbortSignal } = {},
  ): Promise<OperationOutput<K>> {
    const res = await this._fetch(`${this.baseUrl}/v1/op/${op}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.headers,
      },
      body: JSON.stringify(body ?? {}),
      signal: options.signal,
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new GeoperaError(res.status, data, op);
    }
    return data as OperationOutput<K>;
  }
}

/** Functional one-shot equivalent of {@link GeoperaClient.invoke}. */
export async function callOperation<K extends OperationId>(
  op: K,
  body: OperationInput<K>,
  token: string,
  options: { baseUrl?: string; headers?: Record<string, string>; fetch?: typeof fetch; signal?: AbortSignal } = {},
): Promise<OperationOutput<K>> {
  const { signal, ...clientOpts } = options;
  return new GeoperaClient({ token, ...clientOpts }).invoke(op, body, { signal });
}
