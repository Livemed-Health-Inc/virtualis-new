import { describe, expect, it } from "vitest";
import { assertAdmin, assertReviewer, type AuthedContext } from "./guards";

/* The server decides access, never the browser. These cover the refusal paths
   a signed-in user without the role must hit. */
const ctx = (roles: string[]): AuthedContext =>
  ({
    userId: "00000000-0000-4000-8000-000000000000",
    supabase: {
      rpc: async (_fn: string, args: { _role: string }) => ({
        data: roles.includes(args._role),
        error: null,
      }),
    },
  }) as unknown as AuthedContext;

describe("server-side role guards", () => {
  it("refuses a signed-in user with neither role", async () => {
    await expect(assertReviewer(ctx([]))).rejects.toThrow("Forbidden");
    await expect(assertAdmin(ctx([]))).rejects.toThrow("Forbidden");
  });

  it("refuses an ordinary member", async () => {
    await expect(assertReviewer(ctx(["member"]))).rejects.toThrow("Forbidden");
  });

  it("admits a clinical reviewer to review, but not to the Model Lab", async () => {
    await expect(assertReviewer(ctx(["clinical_reviewer"]))).resolves.toBeUndefined();
    await expect(assertAdmin(ctx(["clinical_reviewer"]))).rejects.toThrow("Forbidden");
  });

  it("admits an administrator to both", async () => {
    await expect(assertReviewer(ctx(["admin"]))).resolves.toBeUndefined();
    await expect(assertAdmin(ctx(["admin"]))).resolves.toBeUndefined();
  });
});
