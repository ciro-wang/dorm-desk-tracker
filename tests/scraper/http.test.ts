import { describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn().mockResolvedValue({ status: 200, data: "<html></html>" }) } }));
import axios from "axios";
import { fetchHtml } from "@/lib/scraper/http";

describe("fetchHtml", () => {
  it("asks for HTML first, like a browser, so stores don't answer with JSON fragments", async () => {
    await fetchHtml("https://example.ca/p");
    const headers = vi.mocked(axios.get).mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Accept.startsWith("text/html")).toBe(true);
    expect(headers.Accept).not.toContain("application/json");
  });
});
