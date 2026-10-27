import { describe, expect, it, vi } from "vitest";
// @ts-expect-error JSX module without types
import { readStream } from "./Alis.jsx";

const reader = (chunks: string[]) => {
  const cancel = vi.fn(() => Promise.resolve());
  let i = 0;
  return {
    cancel,
    read: vi.fn(async () =>
      i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
    ),
  };
};

describe("ALIS stream lifecycle (synthetic, no network)", () => {
  it("delivers every chunk while the panel is open", async () => {
    const r = reader(["a", "b"]);
    const out: string[] = [];
    await readStream(
      r,
      () => true,
      (v: string) => out.push(v),
    );
    expect(out).toEqual(["a", "b"]);
    expect(r.cancel).not.toHaveBeenCalled();
  });
  it("stops and cancels when closed or switched mid-stream, leaking nothing", async () => {
    const r = reader(["a", "b", "c"]);
    const out: string[] = [];
    let live = true;
    await readStream(
      r,
      () => live,
      (v: string) => {
        out.push(v);
        live = false;
      },
    );
    expect(out).toEqual(["a"]);
    expect(r.cancel).toHaveBeenCalledOnce();
  });
  it("propagates read errors for the panel to show", async () => {
    const r = {
      cancel: vi.fn(),
      read: vi.fn(async () => {
        throw new Error("down");
      }),
    };
    await expect(
      readStream(
        r,
        () => true,
        () => {},
      ),
    ).rejects.toThrow("down");
  });
});
