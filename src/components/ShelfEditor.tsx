import type { Component } from "solid-js";
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { Ingredient, Tag } from "../types";
import { useI18n } from "../i18n";
import { inventoryStore } from "../stores/inventoryStore";
import { ingredientList, tagList, findIngredient, findTag } from "../data/catalog";
import { Icon } from "./Icon";

const SECTIONS = [
  { key: "Spirit", kind: "ingredient" },
  { key: "Liqueur", kind: "ingredient" },
  { key: "Syrup", kind: "ingredient" },
  { key: "Mixer", kind: "ingredient" },
  { key: "Bitters", kind: "ingredient" },
  { key: "Garnish", kind: "ingredient" },
  { key: "Palate", kind: "tag" },
  { key: "Style", kind: "tag" },
  { key: "Equipment", kind: "tag" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const isTagSection = (key: string) => SECTIONS.some((s) => s.key === key && s.kind === "tag");

interface ShelfEditorProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The shelf picker, as a dense ticklist rather than a wall of tiles.
 *
 * 151 ingredients rendered as 112px cards meant scrolling past three screens to
 * find a bottle; checkbox rows fit roughly five times as many in the same space
 * and read like the inventory page of a bar manual.
 */
export const ShelfEditor: Component<ShelfEditorProps> = (props) => {
  const { t, tName, tCategory, tTagType } = useI18n();
  const [section, setSection] = createSignal<SectionKey>("Spirit");
  const [search, setSearch] = createSignal("");

  createEffect(() => {
    if (!props.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
  });

  const sectionLabel = (key: string) => (isTagSection(key) ? tTagType(key) : tCategory(key));

  const sectionItems = (key: string): (Ingredient | Tag)[] =>
    isTagSection(key)
      ? tagList().filter((tag) => tag.type === key)
      : ingredientList().filter((ing) => ing.category === key);

  const isSelectedIn = (key: string, id: string) => {
    if (key === "Equipment") return inventoryStore.hasTool(id);
    return isTagSection(key) ? inventoryStore.hasTag(id) : inventoryStore.owns(id);
  };

  const selectedIn = (key: string) =>
    sectionItems(key).filter((item) => isSelectedIn(key, item.id)).length;

  /**
   * Equipment starts fully ticked, so a bare count would read "12" next to a
   * section nobody has touched. It shows have/total only once something is off.
   */
  const sectionBadge = (key: string) => {
    const count = selectedIn(key);
    if (key !== "Equipment") return count > 0 ? String(count) : undefined;
    const total = sectionItems(key).length;
    return count < total ? `${count}/${total}` : undefined;
  };

  /**
   * A search from any bottle section looks through every bottle. Nobody should
   * have to know that Campari is filed under liqueurs rather than bitters
   * before they can find it; the tag sections keep to themselves, because a
   * flavour is not something you own.
   */
  const searchingAll = () => search().trim() !== "" && !isTagSection(section());

  const visibleItems = createMemo<(Ingredient | Tag)[]>(() => {
    const query = search().toLowerCase().trim();
    const source = searchingAll() ? ingredientList() : sectionItems(section());
    if (!query) return source;
    // Matched against the localised name too, so a zh-TW reader can search in
    // either language.
    return source.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || tName(item).toLowerCase().includes(query),
    );
  });

  const isSelected = (id: string) => isSelectedIn(section(), id);

  const toggleItem = (id: string) => {
    const key = section();
    if (key === "Equipment") inventoryStore.toggleTool(id);
    else if (isTagSection(key)) inventoryStore.toggleTag(id);
    else inventoryStore.toggleIngredient(id);
  };

  const totalSelected = () =>
    inventoryStore.ownedIngredients.length + inventoryStore.selectedTags.length;

  const anythingToClear = () => totalSelected() > 0 || inventoryStore.missingTools.length > 0;

  return (
    <div class={`overlay ${props.open ? "open" : ""}`} onClick={props.onClose}>
      <div
        class="sheet max-w-[1080px] h-[min(86vh,820px)]"
        role="dialog"
        aria-modal="true"
        aria-label={t("shelf.title") ?? undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="shrink-0 flex items-start justify-between gap-6 px-6 lg:px-8 py-5 border-b border-rule">
          <h2 class="display text-[1.75rem] leading-none">{t("shelf.title")}</h2>
          <button
            type="button"
            aria-label={t("common.close") ?? "Close"}
            class="btn btn-quiet px-2.5 -mr-2"
            onClick={props.onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div class="flex-1 flex min-h-0">
          <nav class="w-40 sm:w-52 shrink-0 overflow-y-auto border-r border-rule py-2">
            <For each={SECTIONS}>
              {(entry) => {
                const badge = () => sectionBadge(entry.key);
                const active = () => section() === entry.key;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setSection(entry.key);
                      setSearch("");
                    }}
                    aria-current={active() ? "true" : undefined}
                    class="w-full text-left px-5 sm:px-6 py-2.5 text-[14px] flex items-baseline justify-between gap-2 transition-colors"
                    classList={{
                      "text-ink bg-paper-sunk": active(),
                      "text-ink-muted hover:text-ink hover:bg-paper-sunk/60": !active(),
                    }}
                  >
                    <span>{sectionLabel(entry.key)}</span>
                    <Show when={badge()}>
                      {(text) => (
                        <span class="font-mono text-[11px] tabular text-accent">{text()}</span>
                      )}
                    </Show>
                  </button>
                );
              }}
            </For>
          </nav>

          <div class="flex-1 flex flex-col min-w-0">
            <div class="shrink-0 px-6 lg:px-8 pt-5 pb-1 relative">
              <input
                type="search"
                aria-label={
                  (isTagSection(section()) ? t("shelf.search") : t("shelf.searchAll")) ?? undefined
                }
                placeholder={
                  (isTagSection(section()) ? t("shelf.search") : t("shelf.searchAll")) ?? undefined
                }
                class="field"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
              <Show when={search()}>
                <button
                  type="button"
                  aria-label={t("common.clearSearch") ?? "Clear"}
                  onClick={() => setSearch("")}
                  class="absolute right-6 lg:right-8 top-[26px] text-ink-faint hover:text-ink"
                >
                  <Icon name="close" size={14} />
                </button>
              </Show>
            </div>

            <div class="flex-1 overflow-y-auto px-6 lg:px-8 py-4">
              <Show
                when={visibleItems().length > 0}
                fallback={<p class="py-10 text-[14px] text-ink-faint">{t("shelf.noResults")}</p>}
              >
                <ul class="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-8">
                  <For each={visibleItems()}>
                    {(item) => (
                      <li>
                        <label class="flex items-center gap-2.5 py-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            class="check"
                            checked={isSelected(item.id)}
                            onChange={() => toggleItem(item.id)}
                          />
                          <span
                            class="text-[14px] transition-colors"
                            classList={{
                              "text-ink": isSelected(item.id),
                              "text-ink-muted group-hover:text-ink": !isSelected(item.id),
                            }}
                          >
                            {tName(item)}
                            <Show when={searchingAll()}>
                              <span class="meta ml-2 text-ink-faint">
                                {tCategory((item as Ingredient).category)}
                              </span>
                            </Show>
                          </span>
                        </label>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>
        </div>

        <div class="shrink-0 border-t border-rule px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <span class="eyebrow">{t("shelf.stocked")}</span>
            <div class="mt-2 flex flex-wrap gap-1.5 max-h-[4.5rem] overflow-y-auto">
              <Show
                when={totalSelected() > 0}
                fallback={
                  <span class="text-[13px] text-ink-faint">{t("shelf.nothingStocked")}</span>
                }
              >
                <For each={inventoryStore.ownedIngredients}>
                  {(id) => (
                    <Show when={findIngredient(id)}>
                      {(ing) => (
                        <button
                          type="button"
                          class="chip"
                          aria-label={
                            t("home.controls.remove", { name: tName(ing()) }) ?? undefined
                          }
                          onClick={() => inventoryStore.toggleIngredient(id)}
                        >
                          {tName(ing())}
                          <Icon name="close" size={11} />
                        </button>
                      )}
                    </Show>
                  )}
                </For>
                <For each={inventoryStore.selectedTags}>
                  {(id) => (
                    <Show when={findTag(id)}>
                      {(tag) => (
                        <button
                          type="button"
                          class="chip"
                          aria-label={
                            t("home.controls.remove", { name: tName(tag()) }) ?? undefined
                          }
                          onClick={() => inventoryStore.toggleTag(id)}
                        >
                          {tName(tag())}
                          <Icon name="close" size={11} />
                        </button>
                      )}
                    </Show>
                  )}
                </For>
              </Show>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <Show when={anythingToClear()}>
              <button type="button" class="btn btn-danger" onClick={() => inventoryStore.clear()}>
                {t("shelf.clear")}
              </button>
            </Show>
            <button type="button" class="btn btn-solid" onClick={props.onClose}>
              {t("shelf.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
