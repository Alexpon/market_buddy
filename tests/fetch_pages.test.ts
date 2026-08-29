import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "../scripts/fetch_pages";

const page = (data: unknown[], next: boolean) =>
  ({ ok: true, json: async () => ({ Data: data, Next: next }) }) as unknown as Response;

describe("fetchAllPages", () => {
  it("依 Next 逐頁抓到底", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([1, 2], true))
      .mockResolvedValueOnce(page([3], false));
    expect(await fetchAllPages((p) => `u?Page=${p}`, f, 0)).toEqual([1, 2, 3]);
    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenNthCalledWith(1, "u?Page=1", expect.anything());
    expect(f).toHaveBeenNthCalledWith(2, "u?Page=2", expect.anything());
  });

  it("單頁失敗重試一次後成功", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(page([1], false));
    expect(await fetchAllPages(() => "u", f, 0)).toEqual([1]);
  });

  it("重試仍失敗則拋錯", async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error("boom"));
    await expect(fetchAllPages(() => "u", f, 0)).rejects.toThrow("boom");
  });

  it("HTTP 非 2xx 視為失敗", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    await expect(fetchAllPages(() => "u", f, 0)).rejects.toThrow("HTTP 500");
  });

  it("Data 空頁即停（防死迴圈）", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(page([], true));
    expect(await fetchAllPages(() => "u", f, 0)).toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
