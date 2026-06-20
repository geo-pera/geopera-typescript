import { describe, it, expect, vi } from "vitest";
import { GeoperaClient } from "../src/index";

function spyFetch(status = 200, body: unknown = { ok: true }) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  ) as unknown as typeof fetch;
}
const calls = (f: unknown) => (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;

describe("namespaced operation methods", () => {
  it("client.catalog.search dispatches to /v1/op/catalog.search with the body", async () => {
    const f = spyFetch();
    const c = new GeoperaClient({ token: "gpra_x", fetch: f });
    await (c.catalog.search as (b: unknown) => Promise<unknown>)({ host_name: "h", limit: 5 });
    const [url, init] = calls(f)[0];
    expect(url).toBe("https://api.geopera.com/v1/op/catalog.search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ host_name: "h", limit: 5 });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gpra_x");
  });

  it("descends deeply: client.orders.archive.place -> orders.archive.place", async () => {
    const f = spyFetch(201, { id: "o1" });
    const c = new GeoperaClient({ token: "t", fetch: f });
    const out = await (c.orders.archive.place as (b: unknown) => Promise<unknown>)({});
    expect(calls(f)[0][0]).toBe("https://api.geopera.com/v1/op/orders.archive.place");
    expect(out).toEqual({ id: "o1" });
  });

  it("forwards the abort signal", async () => {
    const f = spyFetch();
    const c = new GeoperaClient({ token: "t", fetch: f });
    const ac = new AbortController();
    await (c.items.list as (b: unknown, o: unknown) => Promise<unknown>)({}, { signal: ac.signal });
    expect(calls(f)[0][1].signal).toBe(ac.signal);
  });

  it("throws GeoperaError carrying the operation id", async () => {
    const c = new GeoperaClient({ token: "t", fetch: spyFetch(403, { title: "Forbidden" }) });
    await expect((c.catalog.search as (b: unknown) => Promise<unknown>)({})).rejects.toMatchObject({
      name: "GeoperaError",
      status: 403,
      operation: "catalog.search",
    });
  });

  it("invoke still works as the low-level escape hatch", async () => {
    const f = spyFetch();
    const c = new GeoperaClient({ token: "t", fetch: f });
    await c.invoke("items.list" as never, {} as never);
    expect(calls(f)[0][0]).toBe("https://api.geopera.com/v1/op/items.list");
  });

  it("does not masquerade as a thenable (await-safe)", async () => {
    const c = new GeoperaClient({ token: "t", fetch: spyFetch() });
    expect((c as unknown as { then?: unknown }).then).toBeUndefined();
    expect((c.catalog as unknown as { then?: unknown }).then).toBeUndefined();
    // awaiting the client itself must resolve to the client, not hang
    expect(await c).toBe(c);
  });
});
