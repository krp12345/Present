import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { Tag } from "../api/client";

type Props = {
  open: boolean;
  tags: Tag[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  onClose: () => void;
  onDone: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
};

export default function TagPickerSheet(props: Props) {
  const [search, setSearch] = createSignal("");
  const [creating, setCreating] = createSignal(false);

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
    props.onSelectedChange(next);
  };

  const removeTag = (id: string) => {
    props.onSelectedChange(props.selected.filter((x) => x !== id));
  };

  const addTag = async () => {
    const name = query();
    if (!canAdd() || creating()) return;
    setCreating(true);
    try {
      const tag = await props.onCreateTag(name);
      props.onSelectedChange([...props.selected, tag.id]);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  createEffect(() => {
    if (!props.open) {
      setSearch("");
      return;
    }

    document.body.classList.add("tag-picker-open");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      document.body.classList.remove("tag-picker-open");
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  return (
    <Show when={props.open}>
      <div class="tag-picker-sheet">
        <div class="tag-picker-sheet-inner">
          <header class="tag-picker-header">
            <button type="button" class="secondary menu-btn" onClick={props.onClose} aria-label="Cancel">
              ✕
            </button>
            <h2>Choose tags</h2>
            <button type="button" onClick={props.onDone}>Done</button>
          </header>

          <div class="tag-picker-body">
            <input
              type="text"
              class="tag-picker-search"
              placeholder="Search tags…"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />

            <Show when={query().length > 190}>
              <span class="muted">{query().length} / 200</span>
            </Show>

            <Show when={selectedTags().length > 0}>
              <div class="tag-chip-list tag-picker-selected">
                <For each={selectedTags()}>
                  {(tag) => (
                    <span class="tag-chip selected">
                      {tag.name}
                      <button
                        type="button"
                        class="tag-picker-remove"
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

            <div class="tag-picker-list">
              <For each={filteredTags()}>
                {(tag) => {
                  const isSelected = () => props.selected.includes(tag.id);
                  return (
                    <button
                      type="button"
                      class={`tag-picker-option ${isSelected() ? "selected" : ""}`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span class="tag-picker-check">{isSelected() ? "✓" : ""}</span>
                      <span>{tag.name}</span>
                    </button>
                  );
                }}
              </For>

              <Show when={canAdd()}>
                <button type="button" class="tag-picker-add" onClick={addTag} disabled={creating()}>
                  {creating() ? "Adding…" : `Add "${query()}"`}
                </button>
              </Show>

              <Show when={filteredTags().length === 0 && !canAdd()}>
                <p class="muted tag-picker-empty">No tags found.</p>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
