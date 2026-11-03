import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { BY_IDS_BATCH_SIZE, chunk, recipeService, recipeSlug } from "./recipeService";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** fetch takes three input shapes; the service only ever passes the first. */
const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

function mockFetch(handler: (url: string) => unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    return {
      ok: true,
      json: async () => handler(urlOf(input)),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("chunk", () => {
  it("splits evenly and keeps the remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns nothing for an empty list", () => {
    expect(chunk([], 10)).toEqual([]);
  });
});

describe("getRecipesByIds", () => {
  it("does not call the API for an empty collection", async () => {
    const fetchMock = mockFetch(() => ({ items: [], total: 0 }));
    await expect(recipeService.getRecipesByIds([])).resolves.toEqual({ items: [], total: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one request when the collection fits", async () => {
    const ids = Array.from({ length: BY_IDS_BATCH_SIZE }, (_, i) => uuid(i));
    const fetchMock = mockFetch(() => ({ items: ids.map((id) => ({ id })), total: ids.length }));

    const page = await recipeService.getRecipesByIds(ids);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(page.items).toHaveLength(BY_IDS_BATCH_SIZE);
  });

  // The server rejects more than 100 ids outright, so an oversized collection
  // used to fail the whole saved page with "too many ids requested".
  it("splits a collection past the server cap", async () => {
    const ids = Array.from({ length: BY_IDS_BATCH_SIZE + 5 }, (_, i) => uuid(i));
    const fetchMock = mockFetch((url) => {
      const requested = new URL(url, "http://localhost").searchParams.get("ids")!.split(",");
      expect(requested.length).toBeLessThanOrEqual(BY_IDS_BATCH_SIZE);
      return { items: requested.map((id) => ({ id })), total: requested.length };
    });

    const page = await recipeService.getRecipesByIds(ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(ids.length);
    expect(page.total).toBe(ids.length);
    expect(page.items.map((r) => r.id)).toEqual(ids);
  });
});

describe("getRecipes", () => {
  it("omits keys when there is no search", async () => {
    const fetchMock = mockFetch(() => ({ items: [], total: 0 }));
    await recipeService.getRecipes({ keys: ["recipe.martini"] });

    const url = new URL(urlOf(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("search")).toBeNull();
    expect(url.searchParams.get("keys")).toBeNull();
  });

  it("passes translation keys alongside the search", async () => {
    const fetchMock = mockFetch(() => ({ items: [], total: 0 }));
    await recipeService.getRecipes({ search: "馬丁尼", keys: ["recipe.martini", "recipe.gibson"] });

    const url = new URL(urlOf(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("search")).toBe("馬丁尼");
    expect(url.searchParams.get("keys")).toBe("recipe.martini,recipe.gibson");
  });
});

// The server turns the slug back into a translation key, so the two have to
// agree. Ids are the fallback only for a row that somehow has no key.
describe("recipeSlug", () => {
  it("drops the prefix and writes underscores as hyphens", () => {
    expect(recipeSlug({ id: uuid(1), translation_key: "recipe.whiskey_sour" })).toBe(
      "whiskey-sour",
    );
    expect(recipeSlug({ id: uuid(1), translation_key: "recipe.20th_century" })).toBe(
      "20th-century",
    );
  });

  it("falls back to the id without a key", () => {
    expect(recipeSlug({ id: uuid(7) })).toBe(uuid(7));
    expect(recipeSlug({ id: uuid(7), translation_key: "" })).toBe(uuid(7));
  });
});
