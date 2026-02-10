/**
 * Self-contained HTML chat interface for the Tidepool browser client.
 *
 * Exported as a single string constant to be served by the A2UI host.
 * Connects via WebSocket to the same host that served the page.
 *
 * @module
 */

/** Complete HTML chat application for the Tidepool browser interface. */
export const TIDEPOOL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Triggerfish — Tidepool</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #1a1b26; --bg2: #24283b; --bg3: #292e42;
    --fg: #c0caf5; --fg2: #a9b1d6; --fg3: #565f89;
    --accent: #7aa2f7; --green: #9ece6a; --yellow: #e0af68;
    --red: #f7768e; --border: #3b4261;
  }
  html, body { height: 100%; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: 14px; }
  body { display: flex; flex-direction: column; }

  /* Status bar */
  #status { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--bg2); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--fg3); }
  #status .dot { width: 8px; height: 8px; border-radius: 50%; }
  #status .dot.connected { background: var(--green); }
  #status .dot.connecting { background: var(--yellow); }
  #status .dot.disconnected { background: var(--red); }
  #status .provider { color: var(--fg2); }

  /* Messages */
  #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 85%; padding: 10px 14px; border-radius: 8px; line-height: 1.5; word-wrap: break-word; }
  .msg.user { align-self: flex-end; background: var(--accent); color: #1a1b26; }
  .msg.assistant { align-self: flex-start; background: var(--bg2); border: 1px solid var(--border); }
  .msg.assistant.thinking { color: var(--fg3); min-height: 20px; }
  .msg.assistant.thinking .thinking-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
  .msg.assistant.thinking .thinking-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--fg3); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  .msg.error { align-self: flex-start; background: #2d1b2e; border: 1px solid var(--red); color: var(--red); }
  .msg pre { background: var(--bg); padding: 8px; border-radius: 4px; overflow-x: auto; margin: 6px 0; font-size: 13px; }
  .msg code { background: var(--bg); padding: 2px 4px; border-radius: 3px; font-size: 13px; }
  .msg pre code { background: none; padding: 0; }
  .msg strong { font-weight: 600; }

  /* Tool calls */
  .tool { font-size: 12px; color: var(--fg3); padding: 4px 14px; display: flex; align-items: center; gap: 6px; }
  .tool .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--fg3); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  .tool.done .spinner { display: none; }
  .tool.done::before { content: "\\2713"; color: var(--green); }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Todo list */
  .todo-list { padding: 10px 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; max-width: 85%; font-size: 13px; line-height: 1.8; }
  .todo-list .todo-header { font-size: 13px; color: var(--fg2); margin-bottom: 4px; }
  .todo-list .todo-empty { color: var(--fg3); }
  .todo-list .todo-item { padding: 1px 0; }
  .todo-list .todo-done { color: var(--fg3); }
  .todo-list .todo-done .todo-check { color: var(--green); }
  .todo-list .todo-done s { text-decoration: line-through; }
  .todo-list .todo-active { color: var(--yellow); font-weight: 600; }
  .todo-list .todo-active .todo-arrow { color: var(--yellow); }
  .todo-list .todo-pending { color: var(--fg2); }
  .todo-list .todo-pending .todo-circle { color: var(--fg3); }

  /* Input */
  #input-bar { display: flex; gap: 8px; padding: 12px 16px; background: var(--bg2); border-top: 1px solid var(--border); }
  #input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; color: var(--fg); font-family: inherit; font-size: 14px; outline: none; resize: none; }
  #input:focus { border-color: var(--accent); }
  #send { background: var(--accent); color: #1a1b26; border: none; border-radius: 6px; padding: 10px 20px; font-weight: 600; cursor: pointer; font-size: 14px; }
  #send:hover { opacity: 0.9; }
  #send:disabled { opacity: 0.4; cursor: default; }
</style>
</head>
<body>

<div id="status">
  <span class="dot disconnected" id="dot"></span>
  <span>Triggerfish Tidepool</span>
  <span class="provider" id="provider-info"></span>
</div>

<div id="messages"></div>

<div id="input-bar">
  <textarea id="input" rows="1" placeholder="Type a message..." autocomplete="off"></textarea>
  <button id="send" disabled>Send</button>
</div>

<script>
(function() {
  const messages = document.getElementById("messages");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const dot = document.getElementById("dot");
  const providerInfo = document.getElementById("provider-info");

  let ws = null;
  let processing = false;
  let currentAssistantEl = null;
  let currentAssistantText = "";
  let reconnectDelay = 1000;

  function connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(proto + "//" + location.host);
    dot.className = "dot connecting";

    ws.onopen = function() {
      dot.className = "dot connected";
      sendBtn.disabled = false;
      reconnectDelay = 1000;
    };

    ws.onclose = function() {
      dot.className = "dot disconnected";
      sendBtn.disabled = true;
      processing = false;
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    };

    ws.onerror = function() {
      dot.className = "dot disconnected";
    };

    ws.onmessage = function(e) {
      try {
        var evt = JSON.parse(e.data);
        handleEvent(evt);
      } catch(err) {
        console.error("Parse error:", err);
      }
    };
  }

  function handleEvent(evt) {
    switch(evt.type) {
      case "connected":
        providerInfo.textContent = evt.provider + " / " + evt.model;
        break;
      case "llm_start":
        if (!currentAssistantEl) {
          currentAssistantEl = addMessage("assistant", "");
          currentAssistantEl.classList.add("thinking");
          currentAssistantEl.innerHTML = '<span class="thinking-label"><span class="thinking-spinner"></span> Thinking\\u2026</span>';
          currentAssistantText = "";
        }
        break;
      case "tool_call":
        addTool(evt.name, evt.args);
        break;
      case "tool_result":
        finishTool(evt.name, evt.result);
        break;
      case "response":
        if (currentAssistantEl) {
          currentAssistantEl.classList.remove("thinking");
          currentAssistantText = evt.text;
          currentAssistantEl.innerHTML = renderMarkdown(evt.text);
        } else {
          addMessage("assistant", evt.text);
        }
        currentAssistantEl = null;
        currentAssistantText = "";
        todoListEl = null;
        processing = false;
        sendBtn.disabled = false;
        input.focus();
        break;
      case "error":
        if (currentAssistantEl) currentAssistantEl.classList.remove("thinking");
        addMessage("error", evt.message);
        currentAssistantEl = null;
        currentAssistantText = "";
        todoListEl = null;
        processing = false;
        sendBtn.disabled = false;
        input.focus();
        break;
    }
  }

  function addMessage(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.innerHTML = renderMarkdown(text);
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  var activeTools = {};
  var pendingTodoArgs = null;
  var todoListEl = null;

  function isTodoTool(name) {
    return name === "todo_read" || name === "todo_write";
  }

  function addTool(name, args) {
    if (isTodoTool(name)) {
      pendingTodoArgs = args;
      return;
    }
    var el = document.createElement("div");
    el.className = "tool";
    var argStr = Object.keys(args || {}).map(function(k) { return args[k]; }).join(" ");
    el.innerHTML = '<span class="spinner"></span> ' + escapeHtml(name) + " " + escapeHtml(argStr.slice(0, 60));
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    activeTools[name] = el;
  }

  function finishTool(name, result) {
    if (isTodoTool(name)) {
      var todos = extractTodos(name, pendingTodoArgs, result);
      pendingTodoArgs = null;
      if (todos && todos.length > 0) {
        renderTodoList(todos);
      }
      return;
    }
    if (activeTools[name]) {
      activeTools[name].className = "tool done";
      delete activeTools[name];
    }
  }

  function extractTodos(name, args, result) {
    // Both todo_read and todo_write return JSON with merged list
    if (result) {
      try {
        var parsed = JSON.parse(result);
        if (parsed.todos && Array.isArray(parsed.todos)) return parsed.todos;
      } catch(e) {}
    }
    // Fallback: check args for todo_write (pre-merge input)
    if (name === "todo_write" && args && Array.isArray(args.todos)) {
      return args.todos;
    }
    return null;
  }

  function renderTodoList(todos) {
    var html = '<div class="todo-header">📋 Tasks</div>';
    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      var content = escapeHtml(t.content || "");
      if (t.status === "completed") {
        html += '<div class="todo-item todo-done"><span class="todo-check">✓</span> <s>' + content + '</s></div>';
      } else if (t.status === "in_progress") {
        html += '<div class="todo-item todo-active"><span class="todo-arrow">▶</span> ' + content + '</div>';
      } else {
        html += '<div class="todo-item todo-pending"><span class="todo-circle">○</span> ' + content + '</div>';
      }
    }
    if (todoListEl) {
      todoListEl.innerHTML = html;
    } else {
      todoListEl = document.createElement("div");
      todoListEl.className = "todo-list";
      todoListEl.innerHTML = html;
      messages.appendChild(todoListEl);
    }
    messages.scrollTop = messages.scrollHeight;
  }

  function renderMarkdown(text) {
    if (!text) return "";
    var html = escapeHtml(text);
    // Code blocks
    html = html.replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, "<pre><code>$2</code></pre>");
    // Inline code
    html = html.replace(/\`([^\`]+)\`/g, "<code>$1</code>");
    // Bold
    html = html.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");
    // Line breaks
    html = html.replace(/\\n/g, "<br>");
    return html;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN || processing) return;
    addMessage("user", text);
    ws.send(JSON.stringify({ type: "message", content: text }));
    input.value = "";
    input.style.height = "auto";
    processing = true;
    sendBtn.disabled = true;
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  connect();
})();
</script>
</body>
</html>`;
