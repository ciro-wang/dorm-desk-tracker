import { afterEach, describe, expect, it, vi } from "vitest";
import { ntfyNotifier } from "@/lib/alerts/ntfy";

describe("ntfyNotifier", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("publishes JSON to the ntfy server with the topic from the url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await ntfyNotifier("https://ntfy.sh/abc123secret").send({ title: "T · $1", message: "M", clickUrl: "https://x/p", priority: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ntfy.sh/");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ topic: "abc123secret", title: "T · $1", message: "M", click: "https://x/p", priority: 4, tags: ["shopping_cart"] });
  });

  it("throws on a failed publish without echoing the topic", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(ntfyNotifier("https://ntfy.sh/abc123secret").send({ title: "t", message: "m", clickUrl: "https://x", priority: 3 })).rejects.toThrow(
      /^ntfy publish failed: 500$/,
    );
  });
});
