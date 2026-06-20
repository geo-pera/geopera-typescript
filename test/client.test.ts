import { describe, it, expect, vi } from "vitest";
import { GeoperaClient, GeoperaError, callOperation, DEFAULT_BASE_URL } from "../src/index";

function mockFetch(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(body === undefined ? "" : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

describe("GeoperaClient", () => {
  it("requires a token", () => {
    // @ts-expect-error token is required
    expect(() => new GeoperaClient({})).toThrow(/token/i);
  });

  it("defaults to the public base URL and strips trailing slashes", () => {
    expect(new GeoperaClient({ token: "t" }).baseUrl).toBe(DEFAULT_BASE_URL);
    expect(new GeoperaClient({ token: "t", baseUrl: "https://x.test/" }).baseUrl).toBe("https://x.test");
  });

  it("POSTs to /v1/op/{op} with bearer auth and returns the parsed body", async () => {
    const f = mockFetch(200, { items: [], total: 0 });
    const c = new GeoperaClient({ token: "gpra_x", fetch: f });
    const out = await c.invoke("catalog.search" as never, { limit: 5 } as never);
    expect(out).toEqual({ items: [], total: 0 });
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://api.geopera.com/v1/op/catalog.search");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gpra_x");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("throws GeoperaError carrying status + problem body on non-2xx", async () => {
    const problem = { type: "about:blank", title: "Forbidden", detail: "insufficient scope" };
    const c = new GeoperaClient({ token: "gpra_x", fetch: mockFetch(403, problem) });
    await expect(c.invoke("catalog.search" as never, {} as never)).rejects.toMatchObject({
      name: "GeoperaError",
      status: 403,
      operation: "catalog.search",
      problem,
    });
  });

  it("callOperation works for one-offs and honours a custom baseUrl", async () => {
    const f = mockFetch(201, { ok: true });
    const out = await callOperation("organizations.create" as never, { name: "Acme" } as never, "gpra_x", {
      baseUrl: "https://staging.example.com",
      fetch: f,
    });
    expect(out).toEqual({ ok: true });
    expect((f as unknown as { mock: { calls: [string][] } }).mock.calls[0][0]).toBe(
      "https://staging.example.com/v1/op/organizations.create",
    );
  });
});
