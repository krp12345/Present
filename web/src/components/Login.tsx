import { Show, createSignal } from "solid-js";
import { api } from "../api/client";

type Props = { onSuccess: () => void };

export default function Login(props: Props) {
  const [key, setKey] = createSignal("");
  const [error, setError] = createSignal("");
  const [tries, setTries] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.unlock(key());
      props.onSuccess();
    } catch (err: any) {
      if (err.status === 403) {
        setError("Access blocked. Contact the operator to clear the block.");
        setTries(0);
      } else if (err.body?.triesRemaining != null) {
        setTries(err.body.triesRemaining);
        setError("Access denied.");
      } else {
        setError(err.message || "Access denied.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-screen">
      <form class="login-card" onSubmit={submit}>
        <h1>Present</h1>
        <p class="muted">Enter your key to continue.</p>
        <input
          type="password"
          placeholder="Key"
          value={key()}
          onInput={(e) => setKey(e.currentTarget.value)}
          autocomplete="current-password"
        />
        <button type="submit" disabled={loading()}>{loading() ? "Unlocking…" : "Unlock"}</button>
        <Show when={error()}>
          <p class="error">{error()}</p>
          <Show when={tries() != null && tries()! > 0}>
            <p class="muted">{tries()} tries remaining</p>
          </Show>
        </Show>
      </form>
    </div>
  );
}
