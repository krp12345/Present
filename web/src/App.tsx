import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
import { AuthState, signOut, watchAuth } from "./api/firebase";
import Login from "./components/Login";
import Layout from "./components/Layout";
import LogMoment from "./components/LogMoment";
import History from "./components/History";
import TagManagement from "./components/TagManagement";

export type Screen = "log" | "history" | "tags";

export default function App() {
  const [auth, setAuth] = createSignal<AuthState | null>(null);
  const [screen, setScreen] = createSignal<Screen>("log");
  const [loadError, setLoadError] = createSignal("");
  let expiryTimer: number | undefined;
  let unsubscribe: (() => void) | undefined;

  onMount(async () => {
    try {
      unsubscribe = await watchAuth((state) => {
        clearTimeout(expiryTimer);
        if (state.kind === "signedIn") {
          // One hour after sign-in, return to the sign-in screen. Unsaved
          // work is dropped because the screens unmount.
          expiryTimer = window.setTimeout(() => signOut(), Math.max(0, state.expiresAt - Date.now()));
        } else {
          setScreen("log");
        }
        setAuth(state);
      });
    } catch (err: any) {
      setLoadError(err?.message || "Could not start the app.");
    }
  });

  onCleanup(() => {
    clearTimeout(expiryTimer);
    unsubscribe?.();
  });

  const signedIn = () => {
    const state = auth();
    return state?.kind === "signedIn" ? state : null;
  };
  const notAllowed = () => {
    const state = auth();
    return state?.kind === "notAllowed" ? state : undefined;
  };

  return (
    <Switch fallback={<div class="app-shell muted">Loading…</div>}>
      <Match when={loadError()}>
        <div class="app-shell error">{loadError()}</div>
      </Match>
      <Match when={signedIn()}>
        <Layout screen={screen()} onNavigate={setScreen} onLogout={() => signOut()}>
          <Switch>
            <Match when={screen() === "log"}>
              <LogMoment />
            </Match>
            <Match when={screen() === "history"}>
              <History />
            </Match>
            <Match when={screen() === "tags"}>
              <TagManagement />
            </Match>
          </Switch>
        </Layout>
      </Match>
      <Match when={auth()}>
        <Login notAllowed={notAllowed()} />
      </Match>
    </Switch>
  );
}
