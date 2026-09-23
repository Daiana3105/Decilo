(function (root) {
  "use strict";

  const emptyState = () => ({ userId: null, notifications: [], unreadCount: null, revision: null,
    nextCursor: null, loaded: false, loading: false, busy: false, error: "", stale: false, connection: "offline" });

  function createController({ apiUrl = "", fetchImpl = root.fetch?.bind(root), socketFactory = root.io,
    documentTarget = root.document, windowTarget = root, onUnauthorized = () => {},
    setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    let current = null;
    const subscribers = new Set();
    const valid = (run) => current === run;
    const state = () => current ? { ...current.state, notifications: [...current.state.notifications] } : emptyState();
    const notify = () => { const value = state(); subscribers.forEach((listener) => listener(value)); };
    const revision = (value) => {
      if (typeof value !== "string" || !/^[0-9]+$/.test(value)) throw new Error("Invalid revision");
      return BigInt(value);
    };

    function stop() {
      const run = current;
      current = null; // Invalidate callbacks BEFORE aborting requests or disconnecting.
      if (run) {
        run.abort?.abort();
        clearTimer(run.retryTimer); clearTimer(run.expiryTimer); clearTimer(run.requestTimer);
        run.cleanup.forEach((remove) => remove());
        run.socket?.removeAllListeners();
        run.socket?.disconnect();
      }
      notify();
    }

    function expired(run) { if (valid(run)) { stop(); onUnauthorized(); } }

    function schedule(run) {
      if (!valid(run) || run.scheduled) return;
      run.scheduled = true;
      queueMicrotask(() => { run.scheduled = false; void pump(run); });
    }

    function refresh(minRevision) {
      const run = current;
      if (!run) return;
      if (minRevision !== undefined) {
        let next;
        try { next = revision(minRevision); } catch (_) { return; }
        // Duplicate signals do not cause duplicate requests or announcements.
        if (run.state.loaded && next <= revision(run.state.revision) && !run.state.error) return;
        run.target = next > run.target ? next : run.target;
        if (run.active === "refresh") return; // Current snapshot is checked against target on completion.
      }
      clearTimer(run.retryTimer); run.retryTimer = null;
      run.refresh = true;
      run.attempts = 0;
      schedule(run);
    }

    async function call(run, path, method = "GET") {
      const abort = new AbortController(); run.abort = abort;
      const timeout = setTimer(() => abort.abort(), 10000); run.requestTimer = timeout;
      try {
        const response = await fetchImpl(`${apiUrl}${path}`, {
          method, headers: { Authorization: `Bearer ${run.token}` }, signal: abort.signal, cache: "no-store"
        });
        if (response.status === 401) { expired(run); throw new Error("Unauthorized"); }
        if (!response.ok) throw new Error("Request failed");
        return await response.json();
      } finally { clearTimer(timeout); if (valid(run)) { run.abort = null; run.requestTimer = null; } }
    }

    function applySnapshot(run, result, append) {
      const nextRevision = revision(result.revision);
      if (!Number.isSafeInteger(result.unreadCount) || result.unreadCount < 0 || !Array.isArray(result.notifications)) throw new Error("Invalid snapshot");
      if (nextRevision < run.target || (run.state.revision !== null && nextRevision < revision(run.state.revision))) {
        throw new Error("Stale snapshot");
      }
      if (append && result.revision !== run.state.revision) {
        run.target = nextRevision; run.refresh = true; return;
      }
      const records = append ? [...run.state.notifications, ...result.notifications] : result.notifications;
      run.state.notifications = [...new Map(records.map((row) => [row.id, row])).values()];
      run.state.unreadCount = result.unreadCount;
      run.state.revision = result.revision;
      run.state.nextCursor = result.nextCursor;
      run.state.loaded = true;
      run.state.stale = false;
      run.state.error = "";
      run.target = nextRevision;
      run.attempts = 0;
    }

    async function pump(run) {
      if (!valid(run) || run.active) return;
      const mutation = run.mutation;
      const operation = mutation ? "mutation" : run.refresh ? "refresh" : run.more ? "more" : null;
      if (!operation) return;
      run.active = operation;
      if (operation === "mutation") run.mutation = null;
      if (operation === "refresh") { run.refresh = false; run.more = false; }
      if (operation === "more") run.more = false;
      run.state.loading = true;
      run.state.error = "";
      notify();
      try {
        if (operation === "mutation") {
          const path = mutation === "all" ? "/api/notifications/read-all" : `/api/notifications/${encodeURIComponent(mutation)}/read`;
          const result = await call(run, path, "POST");
          if (!valid(run)) return;
          const next = revision(result.revision);
          run.target = next > run.target ? next : run.target;
          run.refresh = true; // Count and rows are applied together from the next GET.
        } else {
          const cursor = operation === "more" ? `&before=${encodeURIComponent(run.state.nextCursor)}` : "";
          const result = await call(run, `/api/notifications?limit=20${cursor}`);
          if (!valid(run)) return;
          applySnapshot(run, result, operation === "more");
        }
      } catch (_) {
        if (!valid(run)) return;
        run.state.error = operation === "mutation" ? "No se pudo marcar como leído. Reintentá la acción." : "No pudimos actualizar las notificaciones.";
        run.state.stale = true;
        // Retry failed reads only, twice, then wait for a user/lifecycle trigger. No polling.
        if (operation !== "mutation" && run.attempts < 2 && !run.refresh) {
          const delay = 1000 * (2 ** run.attempts++);
          run.retryTimer = setTimer(() => { run.retryTimer = null; run.refresh = true; schedule(run); }, delay);
        }
      } finally {
        if (valid(run)) {
          run.active = null;
          run.state.loading = false;
          run.state.busy = Boolean(run.mutation);
          notify();
          schedule(run);
        }
      }
    }

    function start(session) {
      if (current?.userId === String(session.userId) && current.token === session.token) return;
      stop();
      const run = { userId: String(session.userId), token: session.token,
        state: { ...emptyState(), userId: String(session.userId), connection: "connecting" },
        target: 0n, refresh: true, more: false, mutation: null, active: null, attempts: 0, cleanup: [] };
      current = run;
      const recover = () => {
        if (!valid(run)) return;
        refresh();
        if (run.socket && !run.socket.connected && !run.socket.active) run.socket.connect();
      };
      const visible = () => { if (documentTarget?.visibilityState === "visible") recover(); };
      const offline = () => { if (valid(run)) { run.state.connection = "offline"; run.state.stale = true; notify(); } };
      for (const [target, name, callback] of [[documentTarget, "visibilitychange", visible],
        [windowTarget, "online", recover], [windowTarget, "offline", offline]]) {
        target?.addEventListener?.(name, callback);
        run.cleanup.push(() => target?.removeEventListener?.(name, callback));
      }
      try {
        // Expiry is an additional UI guard; the server remains the authority for JWT validation.
        const encoded = run.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const exp = JSON.parse(root.atob(encoded)).exp * 1000;
        if (Number.isFinite(exp)) {
          const check = () => { if (!valid(run)) return; const remaining = exp - Date.now();
            if (remaining <= 0) expired(run); else run.expiryTimer = setTimer(check, Math.min(remaining, 2147483647)); };
          check();
        }
      } catch (_) { /* Invalid credentials will be rejected by REST and Socket.IO. */ }
      if (!valid(run)) return;
      try {
        const socket = socketFactory(apiUrl || undefined, { autoConnect: false, forceNew: true,
          auth: { token: run.token }, reconnection: true, reconnectionAttempts: 5,
          reconnectionDelay: 1000, reconnectionDelayMax: 10000, randomizationFactor: 0.5 });
        run.socket = socket;
        socket.on("connect", () => { if (valid(run)) { run.state.connection = "online"; notify(); refresh(); } });
        socket.on("notifications:ready", () => { if (valid(run)) refresh(); });
        socket.on("notifications:changed", (event) => { if (valid(run)) refresh(event?.revision); });
        socket.on("disconnect", (reason) => {
          if (!valid(run)) return;
          if (reason === "io server disconnect") { expired(run); return; }
          run.state.connection = "reconnecting"; run.state.stale = true; notify();
        });
        socket.on("connect_error", (error) => {
          if (!valid(run)) return;
          if (error.message === "AUTH_INVALID") { expired(run); return; }
          run.state.connection = "reconnecting"; run.state.stale = true; notify();
        });
        socket.connect();
      } catch (_) { run.state.connection = "offline"; }
      notify(); schedule(run);
    }

    return {
      start, stop, refresh, getState: state,
      subscribe(listener) { subscribers.add(listener); listener(state()); return () => subscribers.delete(listener); },
      loadMore() {
        if (!current || !current.state.nextCursor || current.active || current.more || current.refresh) return;
        current.more = true; schedule(current);
      },
      markRead(id) {
        if (!current || current.state.busy || !current.state.loaded || current.state.loading) return;
        if (id !== "all" && !current.state.notifications.some((row) => row.id === id && !row.readAt)) return;
        current.mutation = id; current.state.busy = true; notify(); schedule(current);
      },
      dispose() { stop(); subscribers.clear(); }
    };
  }

  function createWidget(options) {
    const controller = createController(options);
    const doc = root.document;
    const bell = doc.createElement("button");
    bell.id = "notification-bell"; bell.className = "icon-button notification-bell";
    bell.type = "button"; bell.setAttribute("aria-haspopup", "dialog"); bell.setAttribute("aria-controls", "notification-dialog");
    bell.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="notification-badge" hidden aria-hidden="true"></span>';
    const badge = bell.querySelector("span");
    const dialog = doc.createElement("dialog");
    dialog.id = "notification-dialog"; dialog.className = "notification-dialog";
    dialog.setAttribute("aria-labelledby", "notification-title");
    dialog.innerHTML = '<header class="notification-header"><h2 id="notification-title">Notificaciones</h2><button type="button" class="icon-button" data-close aria-label="Cerrar notificaciones">×</button></header><p class="notification-connection" role="status"></p><p class="notification-error" role="alert" hidden></p><p class="notification-stale" hidden>La información puede estar desactualizada.</p><div class="notification-actions"><button type="button" class="secondary-button" data-all>Marcar todas como leídas</button><button type="button" class="secondary-button" data-retry hidden>Reintentar</button></div><p class="notification-loading" role="status" hidden>Cargando notificaciones…</p><p class="empty notification-empty" hidden>No tenés notificaciones todavía.</p><ul class="notification-list" aria-label="Notificaciones recibidas"></ul><button type="button" class="secondary-button notification-more" hidden>Cargar más</button>';
    const list = dialog.querySelector("ul");
    const close = dialog.querySelector("[data-close]");
    const all = dialog.querySelector("[data-all]");
    const more = dialog.querySelector(".notification-more");
    const retry = dialog.querySelector("[data-retry]");
    const live = doc.createElement("div"); live.className = "sr-only"; live.setAttribute("aria-live", "polite"); live.setAttribute("role", "status");
    let lastCount = null;
    const rows = new Map();
    const formatDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

    const closePanel = () => { dialog.close(); bell.setAttribute("aria-expanded", "false"); if (bell.isConnected) bell.focus(); };
    bell.addEventListener("click", () => {
      if (!dialog.open) { dialog.showModal(); bell.setAttribute("aria-expanded", "true"); close.focus(); }
      controller.refresh();
    });
    close.addEventListener("click", closePanel);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); closePanel(); });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button:not([disabled])")].filter((button) => button.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    all.addEventListener("click", () => { if (all.getAttribute("aria-disabled") !== "true") controller.markRead("all"); });
    more.addEventListener("click", () => controller.loadMore());
    retry.addEventListener("click", () => controller.refresh());

    controller.subscribe((state) => {
      if (!state.userId) {
        if (dialog.open) dialog.close();
        dialog.remove(); bell.remove(); live.remove(); rows.clear(); list.replaceChildren(); lastCount = null; live.textContent = "";
        badge.hidden = true; badge.textContent = "";
        return;
      }
      if (!dialog.isConnected) { doc.body.append(dialog, live); bell.setAttribute("aria-expanded", "false"); }
      const count = state.unreadCount;
      badge.hidden = count === null || count === 0; badge.textContent = count === null ? "" : String(count);
      bell.setAttribute("aria-label", count === null ? "Notificaciones, cantidad sin actualizar" : `Notificaciones, ${count} sin leer`);
      if (lastCount !== null && count !== null && count !== lastCount) live.textContent = `${count} notificaciones sin leer.`;
      lastCount = count;
      const labels = { online: "Conectado en tiempo real", connecting: "Conectando…", reconnecting: "Reconectando…", offline: "Sin conexión en tiempo real" };
      dialog.querySelector(".notification-connection").textContent = labels[state.connection];
      const error = dialog.querySelector(".notification-error"); error.hidden = !state.error; error.textContent = state.error;
      dialog.querySelector(".notification-stale").hidden = !state.stale;
      dialog.querySelector(".notification-loading").hidden = !state.loading;
      dialog.querySelector(".notification-empty").hidden = !state.loaded || state.notifications.length !== 0 || state.loading || Boolean(state.error);
      retry.hidden = !state.error;
      all.setAttribute("aria-disabled", String(!count || state.loading || state.busy));
      list.setAttribute("aria-busy", String(state.loading));
      more.hidden = !state.nextCursor; more.disabled = state.loading || state.busy;
      const active = doc.activeElement;
      const hadFocus = list.contains(active) || active === more;
      const ids = new Set(state.notifications.map((row) => row.id));
      for (const [id, element] of rows) { if (!ids.has(id)) { element.remove(); rows.delete(id); } }
      state.notifications.forEach((notice, index) => {
        let element = rows.get(notice.id);
        if (!element) {
          element = doc.createElement("li"); element.dataset.notificationId = notice.id;
          element.innerHTML = '<article><h3></h3><p class="notification-body"></p><time></time><span class="notification-read-state"></span><button type="button" class="secondary-button">Marcar como leída</button></article>';
          element.querySelector("button").addEventListener("click", () => controller.markRead(notice.id));
          rows.set(notice.id, element);
        }
        element.className = notice.readAt ? "notification-item is-read" : "notification-item is-unread";
        element.querySelector("h3").textContent = notice.title;
        element.querySelector(".notification-body").textContent = notice.body;
        const date = new Date(notice.createdAt);
        const time = element.querySelector("time");
        time.textContent = Number.isNaN(date.getTime()) ? "Fecha no disponible" : formatDate.format(date);
        if (!Number.isNaN(date.getTime())) time.dateTime = date.toISOString();
        element.querySelector(".notification-read-state").textContent = notice.readAt ? "Leída" : "Sin leer";
        const button = element.querySelector("button");
        button.textContent = notice.readAt ? "Leída" : "Marcar como leída";
        button.setAttribute("aria-disabled", String(Boolean(notice.readAt) || state.loading || state.busy));
        button.setAttribute("aria-label", `${notice.readAt ? "Leída" : "Marcar como leída"}: ${notice.title}`);
        if (list.children[index] !== element) list.insertBefore(element, list.children[index] || null);
      });
      if (dialog.open && hadFocus && (!active.isConnected || active.hidden)) close.focus();
    });
    return { ...controller, mount() {
      if (controller.getState().userId) doc.getElementById("notifications-slot")?.append(bell);
    } };
  }

  const api = { createController, createWidget };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DeciloNotifications = api;
})(typeof window === "undefined" ? globalThis : window);
