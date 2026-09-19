import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import type { Tag } from "../api/client";

const SCROLL_LOCK_CLASS = "scroll-locked";

function lockPageScroll() {
  document.documentElement.classList.add(SCROLL_LOCK_CLASS);
  document.body.classList.add(SCROLL_LOCK_CLASS);
  document.querySelector("main.screen")?.classList.add(SCROLL_LOCK_CLASS);
}

function unlockPageScroll() {
  document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  document.body.classList.remove(SCROLL_LOCK_CLASS);
  document.querySelector("main.screen")?.classList.remove(SCROLL_LOCK_CLASS);
}

type Props = {
  tags: Tag[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
};

type DropdownPosition = {
  top: string;
  left: string;
  width: string;
  maxHeight: string;
};

export default function TagMultiSelect(props: Props) {
  const [search, setSearch] = createSignal("");
  const [open, setOpen] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [dropdownStyle, setDropdownStyle] = createSignal<DropdownPosition | null>(null);
  let rootRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;

  const query = createMemo(() => search().trim());
  const queryLower = createMemo(() => query().toLowerCase());

  const filteredTags = createMemo(() => {
    const q = queryLower();
    const list = props.tags.filter((tag) => !tag.deleted);
    if (!q) return list;
    return list.filter((tag) => tag.name.toLowerCase().includes(q));
  });

  const exactMatch = createMemo(() =>
    props.tags.some((tag) => tag.name.toLowerCase() === queryLower())
  );

  const canAdd = createMemo(() => query().length > 0 && !exactMatch() && query().length <= 200);

  const selectedTags = createMemo(() =>
    props.selected
      .map((id) => props.tags.find((tag) => tag.id === id))
      .filter((tag): tag is Tag => !!tag)
  );

  const toggleTag = (id: string) => {
    const next = props.selected.includes(id)
      ? props.selected.filter((x) => x !== id)
      : [...props.selected, id];
    props.onChange(next);
  };

  const removeTag = (id: string) => {
    props.onChange(props.selected.filter((x) => x !== id));
  };

  const addTag = async () => {
    const name = query();
    if (!canAdd() || creating()) return;
    setCreating(true);
    try {
      const tag = await props.onCreateTag(name);
      props.onChange([...props.selected, tag.id]);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  const updateDropdownPosition = () => {
    if (!inputRef) return;
    const rect = inputRef.getBoundingClientRect();
    const gap = 6;
    const edge = 12;
    const top = rect.bottom + gap;
    const maxHeight = Math.max(window.innerHeight - top - edge, 120);
    setDropdownStyle({
      top: `${top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${maxHeight}px`,
    });
  };

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open()) return;
      const target = e.target as Node;
      if (rootRef?.contains(target)) return;
      if (dropdownRef?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    onCleanup(() => {
      document.removeEventListener("mousedown", onDocClick);
      unlockPageScroll();
    });
  });

  createEffect(() => {
    if (!open()) {
      unlockPageScroll();
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();
    lockPageScroll();

    const onLayout = () => updateDropdownPosition();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    window.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      unlockPageScroll();
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  return (
    <div class="tag-multi-select" ref={rootRef}>
      <Show when={selectedTags().length > 0}>
        <div class="tag-chip-list tag-multi-select-chips">
          <For each={selectedTags()}>
            {(tag) => (
              <span class="tag-chip selected tag-multi-select-chip">
                {tag.name}
                <button
                  type="button"
                  class="tag-multi-select-remove"
                  aria-label={`Remove ${tag.name}`}
                  onClick={() => removeTag(tag.id)}
                >
                  ×
                </button>
              </span>
            )}
          </For>
        </div>
      </Show>

      <div class="tag-multi-select-input-wrap">
        <input
          ref={inputRef}
          type="text"
          class="tag-multi-select-input"
          placeholder="Search or add tags…"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          onFocus={() => setOpen(true)}
          aria-expanded={open()}
          aria-haspopup="listbox"
        />
      </div>

      <Show when={query().length > 190}>
        <span class="muted">{query().length} / 200</span>
      </Show>

      <Show when={open() && dropdownStyle()}>
        <Portal>
          <div
            ref={dropdownRef}
            class="tag-multi-select-dropdown"
            role="listbox"
            aria-multiselectable="true"
            style={{
              top: dropdownStyle()!.top,
              left: dropdownStyle()!.left,
              width: dropdownStyle()!.width,
              height: dropdownStyle()!.maxHeight,
            }}
          >
            <For each={filteredTags()}>
              {(tag) => {
                const isSelected = () => props.selected.includes(tag.id);
                return (
                  <button
                    type="button"
                    class={`tag-multi-select-option ${isSelected() ? "selected" : ""}`}
                    role="option"
                    aria-selected={isSelected()}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <span class="tag-multi-select-check">{isSelected() ? "✓" : ""}</span>
                    <span>{tag.name}</span>
                  </button>
                );
              }}
            </For>

            <Show when={canAdd()}>
              <button type="button" class="tag-multi-select-add" onClick={addTag} disabled={creating()}>
                {creating() ? "Adding…" : `Add "${query()}"`}
              </button>
            </Show>

            <Show when={filteredTags().length === 0 && !canAdd()}>
              <p class="muted tag-multi-select-empty">No tags found.</p>
            </Show>
          </div>
        </Portal>
      </Show>

      <Show when={props.selected.length === 0}>
        <span class="muted">Select at least one tag to save.</span>
      </Show>
    </div>
  );
}
