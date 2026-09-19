import { Show, createSignal, onMount } from "solid-js";
import { api, type Tag } from "../api/client";

export default function TagManagement() {
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [newName, setNewName] = createSignal("");
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editName, setEditName] = createSignal("");
  const [confirmRemove, setConfirmRemove] = createSignal<Tag | null>(null);
  const [error, setError] = createSignal("");

  const load = async () => setTags(await api.listTags());

  onMount(load);

  const add = async () => {
    try {
      await api.createTag(newName());
      setNewName("");
      setError("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const rename = async (id: string) => {
    try {
      await api.renameTag(id, editName());
      setEditingId(null);
      setError("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const remove = async () => {
    const tag = confirmRemove();
    if (!tag) return;
    await api.deleteTag(tag.id);
    setConfirmRemove(null);
    await load();
  };

  const nameLen = () => (editingId() ? editName().length : newName().length);

  return (
    <div class="screen">
      <div class="field">
        <label>Add tag</label>
        <div style="display:flex; gap:0.5rem;">
          <input value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} placeholder="Tag name" />
          <button type="button" onClick={add}>Add</button>
        </div>
        <Show when={nameLen() > 190 && !editingId()}>
          <span class="muted">{newName().length} / 200</span>
        </Show>
      </div>

      <Show when={error()}><p class="error">{error()}</p></Show>

      <div class="tag-list">
        {tags().map((tag) => (
          <div class="record-card">
            <Show when={editingId() !== tag.id} fallback={
              <>
                <input value={editName()} onInput={(e) => setEditName(e.currentTarget.value)} />
                <Show when={editName().length > 190}>
                  <span class="muted">{editName().length} / 200</span>
                </Show>
                <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                  <button type="button" onClick={() => rename(tag.id)}>Save</button>
                  <button type="button" class="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            }>
              <strong>{tag.name}</strong>
              <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <button type="button" class="secondary" onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}>Rename</button>
                <button type="button" class="danger" onClick={() => setConfirmRemove(tag)}>Remove</button>
              </div>
            </Show>
          </div>
        ))}
      </div>

      <Show when={confirmRemove()}>
        <div class="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div class="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Remove tag “{confirmRemove()!.name}”?</p>
            <div style="display:flex; gap:0.5rem;">
              <button type="button" class="danger" onClick={remove}>Confirm remove</button>
              <button type="button" class="secondary" onClick={() => setConfirmRemove(null)}>Cancel</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
