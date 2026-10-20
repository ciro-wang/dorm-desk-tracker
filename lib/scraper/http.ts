import axios from "axios";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const MIN_GAP_MS = 2000;
const lastHit = new Map<string, number>();

async function politeDelay(url: string) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

/** Plain HTTP fetch. Never throws on HTTP status; retries once on network errors. */
export async function fetchHtml(url: string): Promise<{ status: number; html: string }> {
  for (let attempt = 0; ; attempt++) {
    await politeDelay(url);
    try {
      const res = await axios.get<string>(url, {
        timeout: 20_000,
        responseType: "text",
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-CA,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      return { status: res.status, html: typeof res.data === "string" ? res.data : JSON.stringify(res.data) };
    } catch (e) {
      if (attempt >= 1) throw e;
    }
  }
}

/** Fetch through a real browser for pages that need JavaScript. Playwright is loaded lazily. */
export async function fetchRenderedHtml(url: string): Promise<{ status: number; html: string }> {
  await politeDelay(url);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: "en-CA", timezoneId: "America/Toronto", userAgent: USER_AGENT });
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    return { status: res?.status() ?? 0, html: await page.content() };
  } finally {
    await browser.close();
  }
}
