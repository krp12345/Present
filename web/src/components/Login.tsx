import { Show, createSignal } from "solid-js";
import { signIn, signOut } from "../api/firebase";

type Props = { notAllowed?: { uid: string; email: string | null } };

export default function Login(props: Props) {
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn();
    } catch (err: any) {
      setError(err?.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-screen">
      <Show
        when={props.notAllowed}
        fallback={
          <form class="login-card" onSubmit={submit}>
            <h1>Present</h1>
            <p class="muted">Sign in to continue.</p>
            <button type="submit" disabled={loading()}>{loading() ? "Signing in…" : "Sign in with Google"}</button>
            <Show when={error()}>
              <p class="error">{error()}</p>
            </Show>
          </form>
        }
      >
        {(who) => (
          <div class="login-card">
            <h1>Present</h1>
            <p class="error">Access denied.</p>
            <p class="muted">
              {who().email ?? "This account"} is not allowed to open this app. If this is your account,
              add a document with this ID to the <code>owners</code> collection in the Firebase console:
            </p>
            <p><code class="uid">{who().uid}</code></p>
            <button type="button" class="secondary" onClick={() => signOut()}>Use another account</button>
          </div>
        )}
      </Show>
    </div>
  );
}
