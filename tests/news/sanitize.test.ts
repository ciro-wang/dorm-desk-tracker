import { describe, expect, it } from "vitest";
import { toPlainText } from "@/lib/news/sanitize";

describe("toPlainText", () => {
  it("drops tags and script contents", () => {
    expect(toPlainText("<p>Hi <script>x</script><b>there</b></p>")).toBe("Hi there");
  });

  it("decodes entities, collapses whitespace and truncates", () => {
    expect(toPlainText("<div>A&amp;B\n\n  C</div>")).toBe("A&B C");
    expect(toPlainText("x".repeat(600), 500)).toHaveLength(500);
    expect(toPlainText("x".repeat(600), 500).endsWith("…")).toBe(true);
  });
});
