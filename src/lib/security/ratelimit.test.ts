import { describe, expect, it } from "vitest";
import { clientIp } from "./ratelimit.server";

const req = (headers: Record<string, string>) => new Request("https://x/api", { headers });

describe("clientIp", () => {
  it("uses the edge-verified header", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("ignores a client-supplied X-Forwarded-For", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });

  it("cannot be shadowed by a spoofed X-Forwarded-For", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))).toBe(
      "203.0.113.7",
    );
  });

  it("returns null when no trusted header is present, so callers fail closed", () => {
    expect(clientIp(req({ "x-real-ip": "1.2.3.4" }))).toBeNull();
  });
});
