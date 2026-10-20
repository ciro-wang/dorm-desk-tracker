import { describe, expect, it } from "vitest";
import { describeError } from "@/lib/describe-error";

describe("describeError", () => {
  it("reads standard errors", () => {
    expect(describeError(new Error("Missing NEXT_PUBLIC_SUPABASE_URL"))).toBe("Missing NEXT_PUBLIC_SUPABASE_URL");
  });

  it("reads Supabase's plain-object errors with their code and hint", () => {
    expect(describeError({ message: 'relation "public.merchants" does not exist', code: "42P01", details: null, hint: null })).toBe(
      'relation "public.merchants" does not exist (code 42P01)',
    );
    expect(describeError({ message: "Invalid API key", hint: "Double check your Supabase `anon` or `service_role` API key." })).toBe(
      "Invalid API key — Double check your Supabase `anon` or `service_role` API key.",
    );
  });

  it("falls back for anything else", () => {
    expect(describeError("boom")).toBe("boom");
    expect(describeError(42)).toBe("unknown error");
  });
});
