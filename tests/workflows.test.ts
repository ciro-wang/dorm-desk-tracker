import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(__dirname, "../.github/workflows");
const files = readdirSync(dir).map((f) => ({ f, y: readFileSync(path.join(dir, f), "utf8") }));

describe("GitHub workflows (public repo hygiene)", () => {
  it("pin every action to a full commit sha", () => {
    for (const { f, y } of files) {
      for (const m of y.matchAll(/uses:\s*([^\s#]+)/g)) expect(m[1], f).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("never run on pull_request_target and never echo or trace secrets", () => {
    for (const { f, y } of files) {
      expect(y, f).not.toMatch(/pull_request_target/);
      expect(y, f).not.toMatch(/set -x|echo .*secrets\.|\$\{\{\s*secrets\.[A-Z_]+\s*\}\}.*\|/);
    }
  });

  it("let a manual price check skip the 3-hour wait via a force checkbox", () => {
    const y = files.find((x) => x.f === "check-prices.yml")!.y;
    expect(y).toMatch(/workflow_dispatch:\n    inputs:\n      force:\n        description: [^\n]+\n        type: boolean/);
    expect(y).toContain("npx tsx scripts/check-prices.ts ${{ inputs.force && '--force' || '' }}");
  });

  it("give scheduled jobs read-only access to the code (needed to check out a private repo) and nothing else", () => {
    for (const { f, y } of files.filter((x) => /schedule:/.test(x.y))) {
      expect(y, f).toMatch(/^permissions:\n  contents: read\n(?!  )/m);
      expect(y, f).not.toMatch(/: write\b/);
      expect(y, f).not.toMatch(/pull_request/);
    }
  });
});
