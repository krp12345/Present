import { createSignal, onMount, Show } from "solid-js";
import { api } from "./api/client";
import Login from "./components/Login";
import Layout from "./components/Layout";
import LogMoment from "./components/LogMoment";
import History from "./components/History";
import TagManagement from "./components/TagManagement";

export type Screen = "log" | "history" | "tags";

export default function App() {
  const [authed, setAuthed] = createSignal(false);
  const [screen, setScreen] = createSignal<Screen>("log");
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      if (api.hasSession()) {
        const status = await api.status();
        if (status.sessionValid) setAuthed(true);
        else api.clearSession();
      }
    } catch {
      api.clearSession();
    } finally {
      setLoading(false);
    }
  });

  const logout = () => {
    api.clearSession();
    setAuthed(false);
    setScreen("log");
  };

  return (
    <Show when={!loading()} fallback={<div class="app-shell muted">Loading…</div>}>
      <Show
        when={authed()}
        fallback={<Login onSuccess={() => { setAuthed(true); setScreen("log"); }} />}
      >
        <Layout screen={screen()} onNavigate={setScreen} onLogout={logout}>
          <Show when={screen() === "log"}>
            <LogMoment />
          </Show>
          <Show when={screen() === "history"}>
            <History />
          </Show>
          <Show when={screen() === "tags"}>
            <TagManagement />
          </Show>
        </Layout>
      </Show>
    </Show>
  );
}
