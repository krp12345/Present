import { Show, createEffect, createSignal, onMount } from "solid-js";
import { api, type RecordItem, type Tag } from "../api/client";

export default function LogMoment() {
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [selected, setSelected] = createSignal<string[]>([]);
  const [description, setDescription] = createSignal("");
  const [momentAt, setMomentAt] = createSignal("");
  const [saved, setSaved] = createSignal<RecordItem | null>(null);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const loadTags = async () => {
    setTags(await api.listTags());
  };

  onMount(loadTags);

  const toggleTag = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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

  return (
    <div class="screen">
      <div class="field">
        <label>Description (optional)</label>
        <textarea value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
        <Show when={descLen() > 900}>
          <span class="muted">{descLen()} / 1000</span>
        </Show>
      </div>

      <div class="field">
        <label>Tags (at least one)</label>
        <div>
          {tags().map((tag) => (
            <button
              type="button"
              class={`tag-chip ${selected().includes(tag.id) ? "selected" : ""}`}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div class="field">
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
        <>
          <p class="muted">Saved. You can edit this record below.</p>
          <button type="button" onClick={updateSaved} disabled={loading()}>Update record</button>
          <button type="button" class="secondary" onClick={() => { setSaved(null); setDescription(""); setSelected([]); setMomentAt(""); }}>
            Log another
          </button>
        </>
      }>
        <button type="button" onClick={save} disabled={loading() || selected().length === 0}>
          {loading() ? "Saving…" : "Save"}
        </button>
      </Show>
    </div>
  );
}
