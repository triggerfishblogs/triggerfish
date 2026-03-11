import { mount } from "svelte";
import App from "./App.svelte";
import { connect } from "./lib/stores/websocket.svelte.js";
import { resolveScreenFromHash } from "./lib/stores/nav.svelte.js";
import "./app.css";

// Resolve initial screen from URL hash
resolveScreenFromHash();

// Listen for hash changes
window.addEventListener("hashchange", resolveScreenFromHash);

// Mount the app
mount(App, { target: document.getElementById("app")! });

// Connect WebSocket
connect();
