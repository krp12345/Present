import { Show, createSignal, onMount } from "solid-js";
import { api, type RecordItem, type Tag } from "../api/client";

export default function History() {
  const [records, setRecords] = createSignal<RecordItem[]>([]);
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [tagId, setTagId] = createSignal("");
  const [from, setFrom] = createSignal("");
  const [to, setTo] = createSignal("");
  const [editing, setEditing] = createSignal<RecordItem | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<RecordItem | null>(null);
  const [error, setError] = createSignal("");

  const load = async () => {
    const params: { tagId?: string; from?: string; to?: string } = {};
    if (tagId()) params.tagId = tagId();
    if (from()) params.from = new Date(from()).toISOString();
    if (to()) params.to = new Date(to()).toISOString();
    setRecords(await api.listRecords(params));
  };

  onMount(async () => {
    setTags(await api.listTags());
    await load();
  });

  const toLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const saveEdit = async () => {
    const rec = editing();
    if (!rec) return;
    try {
      await api.updateRecord(rec.id, {
        description: rec.description,
        momentAt: rec.momentAt,
        tagIds: rec.tags.map((t) => t.id),
        version: rec.version,
      });
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteRec = async () => {
    const rec = confirmDelete();
    if (!rec) return;
    await api.deleteRecord(rec.id);
    setConfirmDelete(null);
    await load();
  };

  return (
    <div class="screen">
      <div class="filters">
        <select value={tagId()} onChange={(e) => setTagId(e.currentTarget.value)}>
          <option value="">All tags</option>
          {tags().map((t) => <option value={t.id}>{t.name}</option>)}
        </select>
        <input type="datetime-local" value={from()} onInput={(e) => setFrom(e.currentTarget.value)} />
        <input type="datetime-local" value={to()} onInput={(e) => setTo(e.currentTarget.value)} />
        <button type="button" class="secondary" onClick={load}>Apply filters</button>
      </div>

      <Show when={error()}><p class="error">{error()}</p></Show>

      <div class="record-list">
        {records().map((rec) => (
          <div class="record-card">
            <Show when={editing()?.id !== rec.id} fallback={
              <div class="field">
                <textarea
                  value={editing()!.description}
                  onInput={(e) => setEditing({ ...editing()!, description: e.currentTarget.value })}
                />
                <input
                  type="datetime-local"
                  value={toLocal(editing()!.momentAt)}
                  onInput={(e) => setEditing({ ...editing()!, momentAt: new Date(e.currentTarget.value).toISOString() })}
                />
                <button type="button" onClick={saveEdit}>Save</button>
                <button type="button" class="secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            }>
              <p>{rec.description || <span class="muted">No description</span>}</p>
              <p class="muted">{new Date(rec.momentAt).toLocaleString()}</p>
              <div>
                {rec.tags.map((t) => (
                  <span class={`tag-chip ${t.deleted ? "obsolete" : ""}`}>{t.name}{t.deleted ? " (obsolete)" : ""}</span>
                ))}
              </div>
              <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <button type="button" class="secondary" onClick={() => setEditing(rec)}>Edit</button>
                <button type="button" class="danger" onClick={() => setConfirmDelete(rec)}>Delete</button>
              </div>
            </Show>
          </div>
        ))}
      </div>

      <Show when={confirmDelete()}>
        <div class="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div class="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Delete this record?</p>
            <div style="display:flex; gap:0.5rem;">
              <button type="button" class="danger" onClick={deleteRec}>Confirm delete</button>
              <button type="button" class="secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
