import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import type { Screen } from "../App";

type Props = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  children: any;
};

export default function Layout(props: Props) {
  const [menuOpen, setMenuOpen] = createSignal(false);

  const navigate = (screen: Screen) => {
    props.onNavigate(screen);
    setMenuOpen(false);
  };

  createEffect(() => {
    if (!menuOpen()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <div class="app-shell">
      <Show when={!menuOpen()}>
        <header class="top-bar">
          <button
            type="button"
            class="menu-btn secondary"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={false}
          >
            ☰
          </button>
          <h1>
            {props.screen === "log" ? "Log the moment" : props.screen === "history" ? "History" : "Tag management"}
          </h1>
          <button type="button" class="secondary top-bar-lock" onClick={props.onLogout}>Lock</button>
        </header>
      </Show>

      <Show when={menuOpen()}>
        <div class="side-menu-backdrop" onClick={() => setMenuOpen(false)} />
        <nav class="side-menu-panel">
          <div class="side-menu-header">
            <button
              type="button"
              class="menu-btn secondary"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <button type="button" class="secondary" onClick={() => navigate("log")}>Log the moment</button>
          <button type="button" class="secondary" onClick={() => navigate("history")}>History</button>
          <button type="button" class="secondary" onClick={() => navigate("tags")}>Tag management</button>
        </nav>
        <button type="button" class="secondary side-menu-lock" onClick={props.onLogout}>Lock</button>
      </Show>

      <main class="screen">{props.children}</main>
    </div>
  );
}
