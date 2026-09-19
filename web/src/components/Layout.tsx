import { Show, createSignal } from "solid-js";
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

  return (
    <div class="app-shell">
      <div class="top-bar">
        <button type="button" class="menu-btn secondary" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
        <h1>
          {props.screen === "log" ? "Log the moment" : props.screen === "history" ? "History" : "Tag management"}
        </h1>
        <button type="button" class="secondary" onClick={props.onLogout}>Lock</button>
      </div>

      <Show when={menuOpen()}>
        <div class="side-menu" onClick={() => setMenuOpen(false)}>
          <nav onClick={(e) => e.stopPropagation()}>
            <h2>Menu</h2>
            <button type="button" class="secondary" onClick={() => navigate("log")}>Log the moment</button>
            <button type="button" class="secondary" onClick={() => navigate("history")}>History</button>
            <button type="button" class="secondary" onClick={() => navigate("tags")}>Tag management</button>
            <button type="button" class="secondary" onClick={() => setMenuOpen(false)}>Close</button>
          </nav>
        </div>
      </Show>

      <main class="screen">{props.children}</main>
    </div>
  );
}
