import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { api, type RecordItem, type Tag } from "../api/client";
import TagPickerSheet from "./TagPickerSheet";

export default function LogMoment() {
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [selected, setSelected] = createSignal<string[]>([]);
  const [description, setDescription] = createSignal("");
  const [momentAt, setMomentAt] = createSignal("");
  const [saved, setSaved] = createSignal<RecordItem | null>(null);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [pickerOpen, setPickerOpen] = createSignal(false);
  const [draftSelected, setDraftSelected] = createSignal<string[]>([]);

  const loadTags = async () => {
    setTags(await api.listTags());
  };

  onMount(loadTags);

  const createTag = async (name: string) => {
    try {
      const tag = await api.createTag(name);
      await loadTags();
      setError("");
      return tag;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const toLocalInput = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromLocalInput = (value: string) => new Date(value).toISOString();

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      const rec = await api.createRecord({
        description: description(),
        tagIds: selected(),
        momentAt: momentAt() ? fromLocalInput(momentAt()) : undefined,
      });
      setSaved(rec);
      setDescription(rec.description);
      setSelected(rec.tags.map((t) => t.id));
      setMomentAt(toLocalInput(rec.momentAt));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSaved = async () => {
    const rec = saved();
    if (!rec) return;
    setLoading(true);
    setError("");
    try {
      const updated = await api.updateRecord(rec.id, {
        description: description(),
        momentAt: fromLocalInput(momentAt() || toLocalInput(rec.momentAt)),
        tagIds: selected(),
        version: rec.version,
      });
      setSaved(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const descLen = () => description().length;

  createEffect(() => {
    if (!saved() && !momentAt()) setMomentAt("");
  });

  const canSave = () => selected().length > 0 && !loading();

  const selectedTags = createMemo(() =>
    selected()
      .map((id) => tags().find((tag) => tag.id === id))
      .filter((tag): tag is Tag => !!tag)
  );

  const openPicker = () => {
    setDraftSelected([...selected()]);
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  const donePicker = () => {
    setSelected(draftSelected());
    setPickerOpen(false);
  };

  const removeSelectedTag = (id: string) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  return (
    <div class="screen log-moment">
      <div class="field log-moment-description">
        <label>Description (optional)</label>
        <textarea
          class="log-moment-textarea"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
        <Show when={descLen() > 900}>
          <span class="muted">{descLen()} / 1000</span>
        </Show>
      </div>

      <div class="field log-moment-tags">
        <label>Tags (at least one)</label>
        <div class="tag-picker-summary">
          <Show
            when={selectedTags().length > 0}
            fallback={<span class="muted">No tags selected</span>}
          >
            <div class="tag-chip-list">
              <For each={selectedTags()}>
                {(tag) => (
                  <span class="tag-chip selected">
                    {tag.name}
                    <button
                      type="button"
                      class="tag-picker-remove"
                      aria-label={`Remove ${tag.name}`}
                      onClick={() => removeSelectedTag(tag.id)}
                    >
                      ×
                    </button>
                  </span>
                )}
              </For>
            </div>
          </Show>
          <button type="button" class="secondary" onClick={openPicker}>
            {selectedTags().length > 0 ? "Edit tags" : "Add tags"}
          </button>
        </div>
        <Show when={selected().length === 0}>
          <span class="muted">Select at least one tag to save.</span>
        </Show>
      </div>

      <TagPickerSheet
        open={pickerOpen()}
        tags={tags()}
        selected={draftSelected()}
        onSelectedChange={setDraftSelected}
        onClose={closePicker}
        onDone={donePicker}
        onCreateTag={createTag}
      />

      <div class="field log-moment-time">
        <label>Time (defaults to now)</label>
        <input
          type="datetime-local"
          value={momentAt()}
          onInput={(e) => setMomentAt(e.currentTarget.value)}
        />
      </div>

      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>

      <Show when={!saved()} fallback={
        <div class="log-moment-actions">
          <p class="muted">Saved. You can edit this record below.</p>
          <button type="button" onClick={updateSaved} disabled={!canSave()}>Update record</button>
          <button type="button" class="secondary" onClick={() => { setSaved(null); setDescription(""); setSelected([]); setMomentAt(""); }}>
            Log another
          </button>
        </div>
      }>
        <div class="log-moment-actions">
          <button type="button" onClick={save} disabled={!canSave()}>
            {loading() ? "Saving…" : "Save"}
          </button>
        </div>
      </Show>
    </div>
  );
}
