(function () {
  "use strict";
  const STORAGE_KEY = "decilo-mvp-v1";
  const SESSION_KEY = "decilo-session-v1";
  const API_PUBLIC_URL = typeof window !== "undefined" ? String(window.DECILO_CONFIG?.apiPublicUrl || "").trim().replace(/\/$/, "") : "";
  const pictograms = [
    { id: "quiero", word: "Quiero", alt: "Mano abierta para expresar deseo", symbol: "🙋", category: "necesidades", license: "DECILO inicial" },
    { id: "necesito", word: "Necesito", alt: "Mano levantada para pedir ayuda", symbol: "🤲", category: "necesidades", license: "DECILO inicial" },
    { id: "comer", word: "Comer", alt: "Plato con cubiertos", symbol: "🍽️", category: "acciones", license: "DECILO inicial" },
    { id: "tomar", word: "Tomar", alt: "Vaso para beber", symbol: "🥤", category: "acciones", license: "DECILO inicial" },
    { id: "mama", word: "Mamá", alt: "Persona adulta cuidadora", symbol: "👩", category: "personas", license: "DECILO inicial" },
    { id: "papa", word: "Papá", alt: "Persona adulta cuidadora", symbol: "👨", category: "personas", license: "DECILO inicial" },
    { id: "galletita", word: "Galletita", alt: "Galletita redonda", symbol: "🍪", category: "objetos", license: "DECILO inicial" },
    { id: "agua", word: "Agua", alt: "Vaso de agua", symbol: "💧", category: "objetos", license: "DECILO inicial" },
    { id: "pelota", word: "Pelota", alt: "Pelota de colores", symbol: "⚽", category: "objetos", license: "DECILO inicial" },
    { id: "musica", word: "Música", alt: "Nota musical", symbol: "🎵", category: "objetos", license: "DECILO inicial" },
    { id: "feliz", word: "Feliz", alt: "Cara sonriente", symbol: "🙂", category: "emociones", license: "DECILO inicial" },
    { id: "cansado", word: "Cansado", alt: "Cara con expresión de cansancio", symbol: "😴", category: "emociones", license: "DECILO inicial" },
    { id: "hola", word: "Hola", alt: "Mano saludando", symbol: "👋", category: "acciones", license: "DECILO inicial" },
    { id: "gracias", word: "Gracias", alt: "Manos juntas para agradecer", symbol: "🙏", category: "acciones", license: "DECILO inicial" },
    { id: "triste", word: "Triste", alt: "Cara triste", symbol: "😢", category: "emociones", license: "DECILO inicial" },
    { id: "enojado", word: "Enojado", alt: "Cara enojada", symbol: "😠", category: "emociones", license: "DECILO inicial" },
    { id: "asustado", word: "Asustado", alt: "Cara asustada", symbol: "😨", category: "emociones", license: "DECILO inicial" },
    { id: "tranquilo", word: "Tranquilo", alt: "Cara tranquila", symbol: "😌", category: "emociones", license: "DECILO inicial" },
    { id: "preocupado", word: "Preocupado", alt: "Cara preocupada", symbol: "😟", category: "emociones", license: "DECILO inicial" },
    { id: "ayuda", word: "Ayuda", alt: "Mano pidiendo ayuda", symbol: "🆘", category: "necesidades", license: "DECILO inicial" },
    { id: "hambre", word: "Tengo hambre", alt: "Plato de comida", symbol: "🍲", category: "necesidades", license: "DECILO inicial" },
    { id: "sed", word: "Tengo sed", alt: "Vaso con agua", symbol: "🥛", category: "necesidades", license: "DECILO inicial" },
    { id: "bano", word: "Baño", alt: "Señal de baño", symbol: "🚻", category: "necesidades", license: "DECILO inicial" },
    { id: "dolor", word: "Me duele", alt: "Persona señalando dónde le duele", symbol: "🤕", category: "necesidades", license: "DECILO inicial" },
    { id: "frio", word: "Tengo frío", alt: "Cara con frío", symbol: "🥶", category: "necesidades", license: "DECILO inicial" },
    { id: "calor", word: "Tengo calor", alt: "Cara con calor", symbol: "🥵", category: "necesidades", license: "DECILO inicial" },
    { id: "descanso", word: "Necesito descansar", alt: "Persona descansando", symbol: "🛌", category: "necesidades", license: "DECILO inicial" },
    { id: "casa", word: "Casa", alt: "Casa", symbol: "🏠", category: "lugares", license: "DECILO inicial" },
    { id: "escuela", word: "Escuela", alt: "Edificio escolar", symbol: "🏫", category: "lugares", license: "DECILO inicial" },
    { id: "hospital", word: "Hospital", alt: "Hospital", symbol: "🏥", category: "lugares", license: "DECILO inicial" },
    { id: "parque", word: "Parque", alt: "Árboles en un parque", symbol: "🌳", category: "lugares", license: "DECILO inicial" },
    { id: "plaza", word: "Plaza", alt: "Plaza de juegos", symbol: "🛝", category: "lugares", license: "DECILO inicial" },
    { id: "cocina", word: "Cocina", alt: "Cocina de una casa", symbol: "🍳", category: "lugares", license: "DECILO inicial" },
    { id: "habitacion", word: "Habitación", alt: "Dormitorio", symbol: "🛏️", category: "lugares", license: "DECILO inicial" },
    { id: "patio", word: "Patio", alt: "Patio al aire libre", symbol: "🌤️", category: "lugares", license: "DECILO inicial" },
    { id: "abuela", word: "Abuela", alt: "Mujer adulta mayor", symbol: "👵", category: "personas", license: "DECILO inicial" },
    { id: "abuelo", word: "Abuelo", alt: "Hombre adulto mayor", symbol: "👴", category: "personas", license: "DECILO inicial" },
    { id: "hermana", word: "Hermana", alt: "Niña", symbol: "👧", category: "personas", license: "DECILO inicial" },
    { id: "hermano", word: "Hermano", alt: "Niño", symbol: "👦", category: "personas", license: "DECILO inicial" },
    { id: "amiga", word: "Amiga", alt: "Amiga", symbol: "👩‍🤝‍👩", category: "personas", license: "DECILO inicial" },
    { id: "amigo", word: "Amigo", alt: "Amigo", symbol: "🧑‍🤝‍🧑", category: "personas", license: "DECILO inicial" },
    { id: "docente", word: "Docente", alt: "Persona enseñando", symbol: "🧑‍🏫", category: "personas", license: "DECILO inicial" },
    { id: "terapeuta", word: "Terapeuta", alt: "Profesional de apoyo", symbol: "🧑‍⚕️", category: "personas", license: "DECILO inicial" },
    { id: "dormir", word: "Dormir", alt: "Persona durmiendo", symbol: "😴", category: "acciones", license: "DECILO inicial" },
    { id: "jugar", word: "Jugar", alt: "Juguetes para jugar", symbol: "🧸", category: "acciones", license: "DECILO inicial" },
    { id: "leer", word: "Leer", alt: "Libro abierto", symbol: "📖", category: "acciones", license: "DECILO inicial" },
    { id: "escribir", word: "Escribir", alt: "Mano escribiendo", symbol: "✍️", category: "acciones", license: "DECILO inicial" },
    { id: "escuchar", word: "Escuchar", alt: "Oreja", symbol: "👂", category: "acciones", license: "DECILO inicial" },
    { id: "hablar", word: "Hablar", alt: "Bocadillo de diálogo", symbol: "💬", category: "acciones", license: "DECILO inicial" },
    { id: "ir", word: "Ir", alt: "Persona caminando", symbol: "🚶", category: "acciones", license: "DECILO inicial" },
    { id: "venir", word: "Venir", alt: "Persona acercándose", symbol: "🚶‍➡️", category: "acciones", license: "DECILO inicial" },
    { id: "parar", word: "Parar", alt: "Señal de alto", symbol: "🛑", category: "acciones", license: "DECILO inicial" },
    { id: "lavarse", word: "Lavarse", alt: "Manos con agua", symbol: "🧼", category: "acciones", license: "DECILO inicial" },
    { id: "esperar", word: "Esperar", alt: "Reloj", symbol: "⏳", category: "acciones", license: "DECILO inicial" },
    { id: "silla", word: "Silla", alt: "Silla", symbol: "🪑", category: "objetos", license: "DECILO inicial" },
    { id: "libro", word: "Libro", alt: "Libro cerrado", symbol: "📚", category: "objetos", license: "DECILO inicial" },
    { id: "lapiz", word: "Lápiz", alt: "Lápiz", symbol: "✏️", category: "objetos", license: "DECILO inicial" },
    { id: "mochila", word: "Mochila", alt: "Mochila", symbol: "🎒", category: "objetos", license: "DECILO inicial" },
    { id: "ropa", word: "Ropa", alt: "Prenda de vestir", symbol: "👕", category: "objetos", license: "DECILO inicial" },
    { id: "manta", word: "Manta", alt: "Manta", symbol: "🧣", category: "objetos", license: "DECILO inicial" },
    { id: "telefono", word: "Teléfono", alt: "Teléfono", symbol: "📱", category: "objetos", license: "DECILO inicial" },
    { id: "tenedor", word: "Tenedor", alt: "Tenedor", symbol: "🍴", category: "objetos", license: "DECILO inicial" },
    { id: "vaso", word: "Vaso", alt: "Vaso", symbol: "🥛", category: "objetos", license: "DECILO inicial" },
    { id: "juguete", word: "Juguete", alt: "Juguete", symbol: "🧩", category: "objetos", license: "DECILO inicial" }
  ];
  const categories = ["todas", "emociones", "necesidades", "lugares", "personas", "acciones", "objetos"];
  const categoryLabels = { todas: "Todos", emociones: "Emociones", necesidades: "Necesidades", lugares: "Lugares", personas: "Personas", acciones: "Acciones", objetos: "Objetos cotidianos" };
  const roleLabels = { profesional: "Profesional", paciente: "Paciente", familiar: "Familiar" };
  const seed = {
    users: [
      { id: "prof-1", name: "Sofía Valenzuela", email: "sofia@decilo.test", role: "profesional" },
      { id: "pac-1", name: "Mateo Gómez", email: "mateo@decilo.test", role: "paciente" },
      { id: "fam-1", name: "Carla Gómez", email: "carla@decilo.test", role: "familiar" }
    ],
    relationships: [{ professionalId: "prof-1", patientId: "pac-1", familyIds: ["fam-1"] }],
    boards: [{ id: "board-1", patientId: "pac-1", professionalId: "prof-1", name: "Comunicación cotidiana", pictogramIds: ["quiero", "necesito", "comer", "tomar", "galletita", "agua", "feliz", "hola", "gracias"] }],
    activities: [
      { id: "activity-1", patientId: "pac-1", professionalId: "prof-1", title: "Pedir la merienda", instruction: "Construir una frase con Quiero y un alimento antes de la merienda.", availability: "Hogar", points: 15, status: "available" },
      { id: "activity-2", patientId: "pac-1", professionalId: "prof-1", title: "Saludar al llegar", instruction: "Usar Hola y Gracias durante una interacción familiar.", availability: "Consulta", points: 10, status: "available" }
    ],
    deliveries: [], comments: [], badges: []
  };
  let data = loadData();
  let session = loadSession();
  let view = session ? (session.role === "paciente" ? "comunicador" : "inicio") : "login";
  let selectedRole = "profesional";
  let activePatientId = "pac-1";
  let phrase = [];
  let activeCategory = "todas";
  let authMode = "login";
  let authMessage = "";
  let loginRequest = null;
  let assistantRequest = null;
  let assistantCapabilitiesRequest = null;
  let familyContext = { token: null, mode: 'loading', selected: '', controller: null };
  let boardContext = { token: null, view: null, status: 'idle', patients: [], boards: [], selected: '' };
  function resetFamilyContext() {
    familyContext.controller?.abort();
    familyContext = { token: session?.token || null, mode: 'loading', selected: '', controller: null };
    activePatientId = '';
  }
  const notifications = window.DeciloNotifications.createWidget({
    apiUrl: API_PUBLIC_URL,
    onUnauthorized: () => logoutSession("Tu sesi\u00f3n venci\u00f3. Inici\u00e1 sesi\u00f3n nuevamente.")
  });
  function logoutSession(message = "") {
    notifications.stop(); session = null; sessionStorage.removeItem(SESSION_KEY);
    phrase = []; view = "login"; authMode = "login"; authMessage = message; render();
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(seed); } catch (_) { return clone(seed); } }
  function loadSession() { try { const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY)); return stored?.token && stored?.user ? stored : null; } catch (_) { return null; } }
  function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function announce(message) { document.getElementById("live-region").textContent = message; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function user() { return session?.user || data.users.find((item) => item.id === session?.userId); }
  function relationshipFor(patientId) { return data.relationships.find((item) => item.patientId === patientId && (item.patientId === session?.userId || item.professionalId === session?.userId || item.familyIds.includes(session?.userId))); }
  function canAccessPatient(patientId) { return Boolean(session && relationshipFor(patientId)); }
  function patientsForCurrentUser() { if (!session) return []; if (session.role === "paciente") return data.users.filter((item) => item.id === session.userId); const ids = data.relationships.filter((item) => session.role === "profesional" ? item.professionalId === session.userId : item.familyIds.includes(session.userId)).map((item) => item.patientId); return data.users.filter((item) => ids.includes(item.id)); }
  function activitiesFor(patientId) { return canAccessPatient(patientId) ? data.activities.filter((item) => item.patientId === patientId) : []; }
  function deliveryFor(activityId) { return data.deliveries.find((item) => item.activityId === activityId); }
  function pointsFor(patientId) { return data.deliveries.filter((item) => item.patientId === patientId).reduce((sum, item) => sum + item.points, 0); }
  function badgesFor(patientId) { return data.badges.filter((item) => item.patientId === patientId); }
  function patientName(patientId) { return data.users.find((item) => item.id === patientId)?.name || "Paciente"; }
  function showToast(message) { const old = document.querySelector(".toast"); if (old) old.remove(); const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 3200); }

  function render() {
    if (loginRequest) { loginRequest.abort(); loginRequest = null; }
    const boardSessionChanged = boardContext.token !== (session?.token || null);
    if (boardContext.token !== (session?.token || null) || boardContext.view !== view) {
      boardContext.controller?.abort(); boardContext.editorController?.abort(); boardContext.dialog?.remove();
      boardContext = { token: session?.token || null, view, status: 'idle', patients: [], boards: [], selected: '' };
      if (boardSessionChanged || familyContext.mode === 'enabled') { phrase = []; activeCategory = 'todas'; }
    }
    familyContext.controller?.abort();
    if (familyContext.token !== (session?.token || null)) resetFamilyContext();
    assistantRequest?.abort(); assistantRequest = null;
    assistantCapabilitiesRequest?.abort(); assistantCapabilitiesRequest = null;
    const role = session?.user?.role;
    if (Object.hasOwn(roleLabels, role)) document.body.dataset.identityRole = role;
    else delete document.body.dataset.identityRole;
    document.getElementById("app").innerHTML = session ? renderApp() : authMode === "register" ? renderRegister() : renderLogin();
    if (session && Object.hasOwn(roleLabels, role)) {
      const badge = document.createElement("span");
      badge.className = "session-role";
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = { profesional: "✦", paciente: "◉", familiar: "⌂" }[role];
      badge.append(icon, document.createTextNode(` ${roleLabels[role]}`));
      (document.querySelector(".account-info") || document.querySelector(".topbar-actions")).prepend(badge);
    }
    mountAssistant(); bindEvents(); notifications.mount(); mountFamilyDemo(); mountRemoteBoards();
  }
  function familyPanel() {
    if (familyContext.mode === 'loading') return '<section class="panel"><p role="status">Comprobando acompañamiento…</p></section>';
    if (familyContext.mode === 'error') return '<section class="panel"><p role="alert">No pudimos comprobar el acceso. No se mostrarán datos locales.</p><button id="family-retry" class="secondary-button">Reintentar</button></section>';
    const professional = session.user.role === 'profesional', family = session.user.role === 'familiar';
    const title = { agenda: 'Agenda', inicio: 'Resumen', pacientes: 'Pacientes vinculados', actividades: family ? 'Actividades de Hogar' : 'Actividades', progreso: 'Progreso' }[view];
    return `<section class="panel family-demo" data-family-view="${view}" aria-labelledby="family-title"><h1 id="family-title" tabindex="-1">${title}</h1>
      <p class="hint">Demo ficticia · Datos autorizados en PostgreSQL. ${family ? 'Solo Hogar y su progreso.' : 'Sin importación de datos locales.'}</p>
      <p id="family-status" role="status" aria-live="polite">Cargando vínculos…</p>
      <div id="family-selector"></div>
      ${family ? '<form id="family-accept"><label for="family-code">Código de invitación<input id="family-code" required maxlength="32" autocomplete="off" spellcheck="false" /></label><button class="primary-button">Aceptar invitación</button></form>' : ''}
      <div id="family-content"></div>
    </section>`;
  }
  async function mountAgenda({ state, patient, base, request, mutate, current, content, professional }) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const month = state.agendaMonth || today.slice(0,7);
    const result = await request(base + '/appointments?month=' + encodeURIComponent(month));
    if (!current() || state.selected !== patient.id) return;
    const [year, number] = month.split('-').map(Number);
    const days = new Date(Date.UTC(year,number,0)).getUTCDate(), offset = (new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7;
    const dateOf = value => new Intl.DateTimeFormat('en-CA',{ timeZone: result.timezone, year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(value));
    const timeOf = value => new Intl.DateTimeFormat('es-AR',{ timeZone: result.timezone, hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(value));
    content.innerHTML = `<h2>Turnos de ${escapeHtml(patient.name)}</h2><p>Demo ficticia · Hora de Buenos Aires (UTC−3). ${professional ? 'Solo tus turnos con este paciente.' : 'Consulta de turnos autorizados.'}</p>
      <label>Mes<input id="agenda-month" type="month" min="2000-01" max="2099-12" required value="${month}" /></label>
      <div class="agenda-calendar" role="group" aria-label="Calendario mensual">${['L','M','X','J','V','S','D'].map(d=>`<span aria-hidden="true">${d}</span>`).join('')}${'<span aria-hidden="true"></span>'.repeat(offset)}${Array.from({length:days},(_,i)=>{
        const day = `${month}-${String(i+1).padStart(2,'0')}`, count = result.appointments.filter(a=>dateOf(a.startsAt)===day && a.status!=='cancelado').length;
        return `<div aria-label="${day}: ${count} turnos"><strong>${i+1}</strong>${count ? `<small>${count} turno${count===1?'':'s'}</small>` : ''}</div>`;
      }).join('')}</div><div class="list" id="agenda-list">${result.appointments.map(a=>`<article class="card"><p>${dateOf(a.startsAt)} · ${timeOf(a.startsAt)}–${timeOf(a.endsAt)} · ${escapeHtml(a.status)}</p>${professional && a.status!=='cancelado' ? `<button class="secondary-button" data-cancel-appointment="${escapeHtml(a.id)}">Cancelar turno</button>` : ''}</article>`).join('') || '<p>No hay turnos este mes.</p>'}</div>
      ${professional ? `<form id="agenda-create"><h3>Crear turno</h3><label>Fecha<input type="date" name="date" min="${today}" required /></label><label>Hora (Buenos Aires)<input type="time" name="time" step="300" required /></label><label>Duración en minutos<input type="number" name="duration" min="15" max="180" step="5" value="30" required /></label><button class="primary-button">Crear turno</button></form>` : ''}<p id="agenda-message" role="status" aria-live="polite"></p>`;
    document.getElementById('agenda-month').onchange = event => { if (!event.target.checkValidity() || !event.target.value) return; state.agendaMonth = event.target.value; render(); };
    if (state.agendaConfirmation) {
      const confirmation = state.agendaConfirmation;
      delete state.agendaConfirmation;
      if (confirmation.patient === patient.id) {
        const message = document.getElementById('agenda-message');
        message.className = 'demo-save-confirmation';
        message.textContent = 'Turno creado.';
        document.querySelector('#agenda-create button')?.focus({ preventScroll: true });
      }
    }
    const errorMessage = error => {
      if (!current()) return;
      if (error.status === 401) return logoutSession('Tu sesión venció.');
      if (error.status === 404 || error.status === 403) { content.replaceChildren(); state.selected = ''; render(); return; }
      document.getElementById('agenda-message').textContent = error.status === 409 ? 'El paciente o profesional ya tiene un turno en ese horario.' : 'No se pudo guardar. Revisá fecha futura, hora y duración; actualizá para comprobar el estado antes de reintentar.';
    };
    document.getElementById('agenda-create')?.addEventListener('submit', async event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.duration = Number(values.duration);
      try { if (await mutate(base + '/appointments', values) && current()) { state.agendaMonth = values.date.slice(0,7); state.agendaConfirmation = { patient: patient.id }; render(); } } catch (error) { errorMessage(error); }
    });
    content.querySelectorAll('[data-cancel-appointment]').forEach(button => { button.onclick = async () => {
      if (!window.confirm('¿Cancelar este turno? Se conservará el historial.')) return;
      try { if (await mutate(base + '/appointments/' + button.dataset.cancelAppointment + '/cancel', {}) && current()) render(); } catch (error) { errorMessage(error); }
    }; });
  }
  function storageHint() {
    if (familyContext.mode === 'enabled') return 'Los tableros, las actividades y su progreso se guardan en PostgreSQL. Las notificaciones pertenecen a tu cuenta.';
    if (familyContext.mode === 'disabled') return 'Los tableros y actividades se guardan en este dispositivo. Las notificaciones pertenecen a tu cuenta.';
    return 'Los tableros se guardan en este dispositivo. Las notificaciones pertenecen a tu cuenta.';
  }
  function mountFamilyDemo() {
    if (!session) return;
    const state = familyContext, token = session.token;
    const controller = new AbortController(); state.controller = controller;
    const current = () => familyContext === state && state.controller === controller && session?.token === token && !controller.signal.aborted;
    const request = (path, options = {}) => apiRequest('/api/family-demo' + path, { ...options, signal: controller.signal, cache: 'no-store' });
    if (state.mode === 'loading') {
      const timer = setTimeout(() => controller.abort(), 5000);
      request('/capabilities').then(result => {
        if (!current()) return;
        state.mode = result.enabled === false ? 'disabled' : result.allowed ? 'enabled' : 'denied';
        const hint = document.getElementById('storage-hint'); if (hint) hint.textContent = storageHint();
        // Capability completion must not reset an assistant form or steal header/nav focus.
        if (['inicio', 'pacientes', 'actividades', 'progreso', 'agenda', 'tableros', 'comunicador'].includes(view)) {
          const focusedId = document.activeElement?.id, focusedView = document.activeElement?.dataset?.view;
          render();
          if (focusedId) document.getElementById(focusedId)?.focus();
          else if (focusedView) document.querySelector(`[data-view="${focusedView}"]`)?.focus();
        }
      }).catch(error => {
        if (familyContext !== state || state.controller !== controller || session?.token !== token) return;
        if (error.status === 401) return logoutSession('Tu sesión venció.');
        state.mode = 'error'; render();
      }).finally(() => clearTimeout(timer));
      return;
    }
    document.getElementById('family-retry')?.addEventListener('click', () => { state.mode = 'loading'; render(); });
    if (state.mode !== 'enabled' || !document.getElementById('family-content')) return;
    const status = document.getElementById('family-status'), content = document.getElementById('family-content');
    const professional = session.user.role === 'profesional', family = session.user.role === 'familiar';
    const fail = error => {
      if (!current()) return;
      if (error.status === 401) return logoutSession('Tu sesión venció.');
      content.replaceChildren(); state.selected = ''; activePatientId = '';
      document.getElementById('family-selector').replaceChildren();
      status.textContent = error.status === 404 ? 'El vínculo o recurso ya no está disponible. Actualizá los vínculos.' : 'No pudimos completar la solicitud. No se muestran datos anteriores.';
      const retry = document.createElement('button'); retry.className = 'secondary-button'; retry.textContent = 'Actualizar vínculos';
      retry.onclick = () => render(); content.append(retry);
    };
    let busy = false;
    const mutate = async (path, body, method = 'POST') => {
      if (busy) return null;
      busy = true; content.setAttribute('aria-busy', 'true');
      try { return await request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
      finally { busy = false; if (current()) content.removeAttribute('aria-busy'); }
    };
    document.getElementById('family-accept')?.addEventListener('submit', async event => {
      event.preventDefault();
      const code = document.getElementById('family-code').value.trim(); document.getElementById('family-code').value = '';
      try { const result = await mutate('/invitations/accept', { code }); if (result && current()) { state.selected = ''; render(); } } catch (error) { fail(error); }
    });
    (async () => {
      const result = await request('/patients'); if (!current()) return;
      const patients = result.patients;
      if (!patients.some(p => p.id === state.selected)) state.selected = patients.length === 1 ? patients[0].id : '';
      activePatientId = state.selected;
      const selector = document.getElementById('family-selector');
      if (patients.length > 1) {
        selector.innerHTML = `<label for="family-patient">Paciente activo<select id="family-patient"><option value="">Elegí un paciente</option>${patients.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === state.selected ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>`;
        document.getElementById('family-patient').addEventListener('change', event => {
          state.selected = event.target.value; state.focusSelector = true; controller.abort(); render();
        });
        if (state.focusSelector) { document.getElementById('family-patient').focus(); state.focusSelector = false; }
      }
      const patient = patients.find(p => p.id === state.selected);
      status.textContent = !patients.length ? 'No tenés pacientes vinculados. Aceptá una invitación para comenzar.' : !patient ? 'Elegí el paciente que querés acompañar.' : `Paciente activo: ${patient.name}`;
      if (!patient) return;
      const base = '/patients/' + encodeURIComponent(patient.id);
      if (view === 'agenda') { await mountAgenda({ state, patient, base, request, mutate, current, content, professional }); return; }
      const overview = view === 'inicio', activities = view === 'actividades', progressView = view === 'progreso';
      const manage = view === 'pacientes' && professional;
      const [list, progress, comments, links, profileResult] = await Promise.all([
        activities ? request(base + '/activities') : null,
        overview || progressView ? request(base + '/progress') : null,
        progressView ? request(base + '/comments') : null,
        manage ? request(base + '/family-links') : null,
        manage ? request(base + '/profile') : null
      ]);
      if (!current() || state.selected !== patient.id) return;
      content.innerHTML = `<h2>${escapeHtml(patient.name)}</h2>
        ${overview ? `<section class="stats-grid" aria-label="Resumen del paciente">${[
          ['Asignadas activas', progress.activeAssigned], ['Completadas activas', progress.activeCompleted],
          ['Pendientes', progress.activeAssigned - progress.activeCompleted], ['Puntos históricos', progress.points]
        ].map(([label, value]) => `<article class="card"><span>${label}</span><strong class="stat-value">${value}</strong></article>`).join('')}</section>
        ${progress.activeAssigned ? '' : '<p>Sin actividades activas.</p>'}
        <nav aria-label="Accesos rápidos"><button class="primary-button" data-family-target="actividades">Ver actividades</button>
        <button class="secondary-button" data-family-target="progreso">Ver progreso</button>
        ${professional ? '<button class="secondary-button" data-family-target="pacientes">Gestionar vínculos</button>' : ''}</nav>` : ''}
        ${progressView ? `<section aria-label="Progreso del paciente"><p>${progress.assigned ? `${progress.completed} de ${progress.assigned} actividades completadas · ${progress.points} puntos · ${progress.completionPercent}%` : 'Sin actividades: todavía no hay avance para calcular.'}</p>
        ${progress.completionPercent === null ? '' : `<div class="progress-bar" role="progressbar" aria-label="Actividades completadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.completionPercent}"><span style="width:${progress.completionPercent}%"></span></div>`}
        ${progress.badges.map(b => `<p>${escapeHtml(b.label)}</p>`).join('')}</section>
        <p class="hint">El progreso conserva también las actividades retiradas y sus puntos.</p>
        <h3>Comentarios compartidos</h3><div id="family-comments" class="list"></div><button id="family-more-comments" class="secondary-button" ${comments.nextCursor ? '' : 'hidden'}>Más comentarios</button>
        ${family ? '<form id="family-comment"><label for="family-comment-text">Comentario de Hogar<textarea id="family-comment-text" required minlength="3" maxlength="1000"></textarea></label><button class="primary-button">Guardar comentario</button></form><button id="family-leave" class="danger-button">Dejar de acompañar a este paciente</button>' : ''}` : ''}
        ${activities ? `<div id="family-activities" class="list"></div><button id="family-more" class="secondary-button" ${list.nextCursor ? '' : 'hidden'}>Más actividades</button>
        ${professional ? '<form id="family-assign"><h3>Asignar actividad</h3><label>Título<input name="title" maxlength="120" required /></label><label>Instrucción<textarea name="instruction" maxlength="1000" required></textarea></label><label>Disponibilidad<select name="availability"><option>Hogar</option><option>Consulta</option></select></label><label>Puntos<input name="points" type="number" min="0" max="100" value="15" required /></label><button class="primary-button">Asignar actividad</button></form>' : ''}` : ''}
        ${manage ? `<form id="family-invite"><label for="family-email">Correo del familiar ficticio<input id="family-email" type="email" required maxlength="254" placeholder="family@family-demo.test" /></label><button class="primary-button">Crear código de invitación</button></form><p id="family-invitation" role="status"></p>
        <div id="family-links">${links.families.map(f => `<p>${escapeHtml(f.name)} <button class="danger-button" data-family-revoke="${escapeHtml(f.id)}">Revocar vínculo</button></p>`).join('')}</div>` : ''}`;
      if (manage) {
        const form = document.createElement('form'); form.id = 'demo-profile';
        form.innerHTML = `<h3>${profileResult.profile ? 'Editar' : 'Agregar'} ficha ficticia</h3><p>Solo pacientes ficticios ya vinculados. No crea cuentas ni consentimiento para uso real. Usá únicamente datos ficticios.</p><label>Nombre<input name="firstName" maxlength="80" required value="${escapeHtml(profileResult.profile?.firstName || '')}" /></label><label>Apellido<input name="lastName" maxlength="80" required value="${escapeHtml(profileResult.profile?.lastName || '')}" /></label><label>Contacto opcional (ficticio)<input name="contact" maxlength="160" value="${escapeHtml(profileResult.profile?.contact || '')}" /></label><button class="primary-button">Guardar ficha</button><p id="profile-status" role="status"></p>`;
        content.prepend(form);
        form.addEventListener('submit', async event => {
          event.preventDefault();
          try { if (await mutate(base + '/profile', Object.fromEntries(new FormData(form))) && current()) {
            const message = document.getElementById('profile-status');
            message.className = 'demo-save-confirmation';
            message.textContent = 'Ficha guardada.';
          } }
          catch (error) { fail(error); }
        });
      }
      content.querySelectorAll('[data-family-target]').forEach(button => button.addEventListener('click', () => {
        if (!navItems().some(item => item.id === button.dataset.familyTarget)) return;
        view = button.dataset.familyTarget; render(); document.getElementById('family-title')?.focus();
      }));
      const appendActivities = rows => {
        const box = document.getElementById('family-activities');
        for (const a of rows) {
          const item = document.createElement('article'); item.className = 'card';
          item.innerHTML = `<h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.instruction)}</p><p>${a.completedAt ? 'Completada' : 'Pendiente'} · ${a.points} puntos</p>`;
          if (professional) {
            const remove = document.createElement('button'); remove.className = 'danger-button'; remove.textContent = 'Quitar actividad';
            remove.onclick = async () => {
              if (!window.confirm('¿Quitar esta actividad? Se ocultará de las actividades activas, conservando su historial y progreso.')) return;
              try { await mutate(base + '/activities/' + a.id, undefined, 'DELETE'); if (current()) render(); } catch (error) { fail(error); }
            };
            item.append(remove);
          }
          if (!professional && !a.completedAt) {
            const button = document.createElement('button'); button.className = 'primary-button'; button.textContent = 'Completar actividad';
            button.onclick = async () => { try { if (await mutate(base + '/activities/' + a.id + '/complete', {}) && current()) render(); } catch (error) { fail(error); } };
            item.append(button);
          }
          box.append(item);
        }
        if (!rows.length && !box.children.length) box.textContent = 'No hay actividades disponibles.';
      };
      const appendComments = rows => { for (const c of rows) { const p = document.createElement('p'); p.textContent = `${c.authorName}: ${c.text}`; document.getElementById('family-comments').append(p); } };
      if (list) appendActivities(list.activities); if (comments) appendComments(comments.comments);
      let cursor = list?.nextCursor, commentCursor = comments?.nextCursor;
      document.getElementById('family-more')?.addEventListener('click', async event => { try {
        event.target.disabled = true; const next = await request(base + '/activities?before=' + cursor);
        if (current()) { appendActivities(next.activities); cursor = next.nextCursor; event.target.hidden = !cursor; event.target.disabled = false; }
      } catch (error) { fail(error); } });
      document.getElementById('family-more-comments')?.addEventListener('click', async event => { try {
        event.target.disabled = true; const next = await request(base + '/comments?before=' + commentCursor);
        if (current()) { appendComments(next.comments); commentCursor = next.nextCursor; event.target.hidden = !commentCursor; event.target.disabled = false; }
      } catch (error) { fail(error); } });
      document.getElementById('family-invite')?.addEventListener('submit', async event => { event.preventDefault(); try {
        document.getElementById('family-invitation').textContent = '';
        const invitation = await mutate(base + '/family-invitations', { email: document.getElementById('family-email').value });
        if (invitation && current()) document.getElementById('family-invitation').textContent = `Código: ${invitation.code}. Entregalo manualmente. Vence: ${new Date(invitation.expiresAt).toLocaleString()}. Se muestra solo aquí; no se guarda en el navegador.`;
      } catch (error) { fail(error); } });
      const revoke = async familyId => {
        if (!window.confirm(`¿Revocar el vínculo con ${patient.name}? Se cortará el acceso.`)) return;
        try { await mutate(base + '/family-links/' + familyId, undefined, 'DELETE'); if (current()) { state.selected = ''; render(); } } catch (error) { fail(error); }
      };
      document.querySelectorAll('[data-family-revoke]').forEach(b => { b.onclick = () => revoke(b.dataset.familyRevoke); });
      document.getElementById('family-leave')?.addEventListener('click', () => revoke(session.userId));
      document.getElementById('family-comment')?.addEventListener('submit', async event => { event.preventDefault(); try {
        if (await mutate(base + '/comments', { text: document.getElementById('family-comment-text').value }) && current()) render();
      } catch (error) { fail(error); } });
      document.getElementById('family-assign')?.addEventListener('submit', async event => { event.preventDefault(); try {
        const values = Object.fromEntries(new FormData(event.currentTarget)); values.points = Number(values.points);
        if (await mutate(base + '/activities', values) && current()) render();
      } catch (error) { fail(error); } });
    })().catch(fail);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session && familyContext.mode === 'enabled' && view !== 'ayudante' && document.getElementById('family-content')) render();
  });
  function remoteBoardsView() {
    if (familyContext.mode === 'loading') return '<section class="panel"><p role="status">Comprobando acceso a tableros…</p></section>';
    if (familyContext.mode !== 'enabled') return '<section class="panel"><p role="alert">No se pudo autorizar el acceso a tableros.</p><button id="family-retry">Reintentar acceso</button></section>';
    const state = boardContext;
    if (state.status === 'error') return '<section class="panel"><p role="alert">No se pudieron cargar los tableros autorizados. No se muestran datos locales.</p><button id="boards-retry" class="secondary-button">Reintentar tableros</button></section>';
    if (state.status !== 'ready') return '<section class="panel"><p role="status">Cargando tableros autorizados…</p></section>';
    if (session.user.role === 'paciente') return `${state.boards.length > 1 ? `<label>Tablero activo<select id="remote-board-select">${state.boards.map(board => `<option value="${board.id}" ${board.id === state.selected ? 'selected' : ''}>${escapeHtml(board.name)}</option>`).join('')}</select></label>` : ''}${renderCommunicator()}`;
    return `${heading('Comunicación', 'Tableros personalizados', 'Tableros del paciente seleccionado, guardados en PostgreSQL.', `<button class="primary-button" data-action="new-board" ${state.patients.length ? '' : 'disabled'}>+ Nuevo tablero</button>`)}
      ${state.patients.length ? `<label>Paciente activo<select id="remote-board-patient">${state.patients.map(patient => `<option value="${patient.id}" ${patient.id === familyContext.selected ? 'selected' : ''}>${escapeHtml(patient.name)}</option>`).join('')}</select></label>` : '<p role="status">No tenés pacientes vinculados. No se puede crear un tablero.</p>'}
      <section class="card-grid">${state.boards.map(board => `<article class="card"><h2>${escapeHtml(board.name)}</h2><p>${board.pictogramIds.length} pictogramas · Compartido con el paciente</p>${board.professionalId === session.userId ? `<button class="secondary-button" data-action="edit-board" data-board="${board.id}">Editar tablero</button>` : ''}</article>`).join('') || '<p>No hay tableros asignados a este paciente.</p>'}</section>`;
  }
  function refreshRemoteBoards() {
    boardContext.controller?.abort(); boardContext.status = 'idle'; boardContext.boards = []; boardContext.selected = ''; phrase = []; render();
  }
  function mountRemoteBoards() {
    if (!session || familyContext.mode !== 'enabled' || !['tableros', 'comunicador'].includes(view)) return;
    document.getElementById('boards-retry')?.addEventListener('click', refreshRemoteBoards);
    document.getElementById('remote-board-patient')?.addEventListener('change', event => { familyContext.selected = event.target.value; refreshRemoteBoards(); });
    document.getElementById('remote-board-select')?.addEventListener('change', event => { boardContext.selected = event.target.value; phrase = []; render(); });
    const state = boardContext;
    if (state.status !== 'idle') return;
    const controller = new AbortController(); state.controller = controller; state.status = 'loading';
    const token = session.token;
    const current = () => boardContext === state && state.controller === controller && session?.token === token && !controller.signal.aborted;
    const request = path => apiRequest('/api/family-demo' + path, { signal: controller.signal, cache: 'no-store' });
    (async () => {
      const { patients } = await request('/patients'); if (!current()) return;
      state.patients = patients;
      const patient = session.user.role === 'paciente' ? patients.find(item => item.id === session.userId)
        : patients.find(item => item.id === familyContext.selected) || patients[0];
      if (patient) {
        const result = await request('/patients/' + patient.id + '/boards'); if (!current()) return;
        state.boards = result.boards; familyContext.selected = patient.id;
        state.selected = state.boards[0]?.id || '';
      }
      state.status = 'ready'; render();
    })().catch(error => {
      if (!current()) return;
      if (error.status === 401) return logoutSession('Tu sesión venció.');
      state.status = 'error'; state.boards = []; phrase = []; render();
    });
  }
  async function openRemoteBoardModal(boardId) {
    if (session?.user?.role !== 'profesional' || familyContext.mode !== 'enabled' || boardContext.status !== 'ready') return;
    const state = boardContext, token = session.token, existing = state.boards.find(board => board.id === boardId);
    if (boardId && (!existing || existing.professionalId !== session.userId)) return;
    const dialog = modal(existing ? 'Editar tablero' : 'Nuevo tablero', '<div id="remote-board-editor"><p role="status">Cargando pacientes autorizados…</p></div>');
    state.dialog = dialog; const controller = new AbortController(); state.editorController = controller;
    const current = () => boardContext === state && session?.token === token && dialog.isConnected && !controller.signal.aborted;
    const close = () => { controller.abort(); dialog.remove(); document.querySelector('[data-action="new-board"]')?.focus(); };
    dialog.querySelector('[data-close-modal]').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
      }
    });
    const request = (path, options = {}) => apiRequest('/api/family-demo' + path, { ...options, signal: controller.signal, cache: 'no-store' });
    try {
      const { patients } = await request('/patients'); if (!current()) return;
      const allowed = existing ? patients.filter(patient => patient.id === existing.patientId) : patients;
      const orderedPictograms = [...(existing?.pictogramIds || [])];
      let editorCategory = 'todas', editorSearch = '';
      dialog.querySelector('#remote-board-editor').innerHTML = `<form id="board-form" class="form-grid"><label>Paciente<select name="patientId" required ${allowed.length ? '' : 'disabled'}><option value="">Elegí un paciente</option>${allowed.map(patient => `<option value="${patient.id}" ${patient.id === (existing?.patientId || familyContext.selected) ? 'selected' : ''}>${escapeHtml(patient.name)}</option>`).join('')}</select></label>
        <label class="full">Nombre del tablero<input name="name" maxlength="120" value="${escapeHtml(existing?.name || 'Tablero cotidiano')}" required /></label>
        <fieldset class="full"><legend>Agregar pictogramas</legend><label>Buscar pictogramas<input id="board-pictogram-search" type="search" autocomplete="off" /></label><div id="board-pictogram-categories" class="category-tabs" role="group" aria-label="Filtrar pictogramas por categoría">${categories.map(category => `<button type="button" class="category-tab" data-editor-category="${category}" aria-pressed="${category === editorCategory}">${categoryLabels[category]}</button>`).join('')}</div><div id="board-pictogram-catalog" class="picto-grid editor-picto-grid"></div></fieldset>
        <fieldset class="full"><legend>Orden del tablero</legend><ol id="selected-pictograms" class="ordered-pictogram-list"></ol></fieldset>
        <p id="board-speech-message" class="full message" role="status"></p><p id="board-message" class="full" role="alert" tabindex="-1">${allowed.length ? '' : 'No tenés pacientes autorizados para este tablero.'}</p><button class="primary-button full" type="submit" ${allowed.length ? '' : 'disabled'}>Guardar tablero</button></form>`;
      const catalog = dialog.querySelector('#board-pictogram-catalog');
      const selectedList = dialog.querySelector('#selected-pictograms');
      const renderEditorCatalog = () => {
        const query = editorSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const matches = pictograms.filter(item => (editorCategory === 'todas' || item.category === editorCategory) &&
          `${item.word} ${item.alt}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
        catalog.innerHTML = matches.length ? matches.map(item => `<div class="picto-entry"><label class="picto-tile editor-picto-tile"><input type="checkbox" name="pictograms" value="${item.id}" ${orderedPictograms.includes(item.id) ? 'checked' : ''} /><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${escapeHtml(item.word)}</span><span class="picto-meta">${categoryLabels[item.category]}</span></label><button type="button" class="icon-button picto-speak" data-speak-picto="${item.id}" aria-label="Escuchar ${escapeHtml(item.word)}">🔊</button></div>`).join('') : '<p class="empty full">No hay pictogramas en esta búsqueda.</p>';
      };
      const renderSelectedPictograms = () => {
        selectedList.innerHTML = orderedPictograms.length ? orderedPictograms.map((pictogramId, index) => {
          const item = pictograms.find(pictogram => pictogram.id === pictogramId);
          return `<li data-selected-id="${item.id}"><span><span aria-hidden="true">${item.symbol}</span> ${escapeHtml(item.word)}</span><span class="ordered-pictogram-actions"><button type="button" class="icon-button" data-selected-action="up" data-pictogram-id="${item.id}" aria-label="Subir ${escapeHtml(item.word)}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-button" data-selected-action="down" data-pictogram-id="${item.id}" aria-label="Bajar ${escapeHtml(item.word)}" ${index === orderedPictograms.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="secondary-button" data-selected-action="remove" data-pictogram-id="${item.id}">Quitar</button></span></li>`;
        }).join('') : '<li class="muted">Todavía no agregaste pictogramas.</li>';
      };
      renderEditorCatalog(); renderSelectedPictograms();
      dialog.querySelector('#board-pictogram-search').addEventListener('input', event => { editorSearch = event.target.value; renderEditorCatalog(); });
      dialog.querySelector('#board-pictogram-categories').addEventListener('click', event => {
        const button = event.target.closest('[data-editor-category]'); if (!button) return;
        editorCategory = button.dataset.editorCategory;
        dialog.querySelectorAll('[data-editor-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        renderEditorCatalog();
      });
      catalog.addEventListener('change', event => {
        const checkbox = event.target.closest('input[name="pictograms"]'); if (!checkbox) return;
        if (checkbox.checked && !orderedPictograms.includes(checkbox.value)) orderedPictograms.push(checkbox.value);
        else if (!checkbox.checked) orderedPictograms.splice(orderedPictograms.indexOf(checkbox.value), 1);
        renderEditorCatalog(); renderSelectedPictograms();
      });
      selectedList.addEventListener('click', event => {
        const button = event.target.closest('[data-selected-action]'); if (!button) return;
        const index = orderedPictograms.indexOf(button.dataset.pictogramId);
        if (button.dataset.selectedAction === 'remove') orderedPictograms.splice(index, 1);
        else {
          const target = index + (button.dataset.selectedAction === 'up' ? -1 : 1);
          if (index < 0 || target < 0 || target >= orderedPictograms.length) return;
          [orderedPictograms[index], orderedPictograms[target]] = [orderedPictograms[target], orderedPictograms[index]];
        }
        renderEditorCatalog(); renderSelectedPictograms();
      });
      (dialog.querySelector('select:not(:disabled)') || dialog.querySelector('[data-close-modal]')).focus();
      let saving = false;
      dialog.querySelector('#board-form').addEventListener('submit', async event => {
        event.preventDefault(); if (saving || !current()) return;
        const form = new FormData(event.currentTarget), patient = form.get('patientId');
        const message = dialog.querySelector('#board-message'), button = event.currentTarget.querySelector('[type="submit"]');
        if (!allowed.some(item => item.id === patient) || !orderedPictograms.length) { message.textContent = 'Elegí un paciente autorizado y al menos un pictograma.'; return; }
        saving = true; button.disabled = true; message.textContent = 'Guardando tablero…'; message.focus();
        try {
          await request('/patients/' + encodeURIComponent(patient) + '/boards' + (existing ? '/' + existing.id : ''), {
            method: existing ? 'PUT' : 'POST', body: JSON.stringify({ name: String(form.get('name')).trim(), pictogramIds: orderedPictograms })
          });
          if (!current()) return;
          familyContext.selected = patient; close(); refreshRemoteBoards(); showToast('Tablero guardado y compartido con el paciente');
        } catch (error) {
          if (!current()) return;
          if (error.status === 401) return logoutSession('Tu sesión venció.');
          message.textContent = 'No se pudo guardar el tablero. Revisá los datos y el vínculo del paciente.';
        } finally { saving = false; if (current()) { button.disabled = false; button.focus(); } }
      });
    } catch (error) {
      if (!current()) return;
      if (error.status === 401) return logoutSession('Tu sesión venció.');
      dialog.querySelector('#remote-board-editor').innerHTML = '<p role="alert">No se pudieron cargar los pacientes autorizados. Cerrá y reintentá.</p>';
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session && familyContext.mode === 'enabled' && ['tableros','comunicador'].includes(view) && !boardContext.dialog?.isConnected) refreshRemoteBoards();
  });
  function mountAssistant() {
    if (!['paciente', 'familiar'].includes(session?.user?.role)) return;
    const nav = document.querySelector('.sidebar nav');
    const entry = document.createElement('button');
    entry.className = 'nav-button'; entry.textContent = 'Ayudante';
    entry.setAttribute('aria-current', view === 'ayudante' ? 'page' : 'false');
    entry.addEventListener('click', () => { view = 'ayudante'; render(); document.getElementById('assistant-title')?.focus(); });
    nav.append(entry);
    if (view !== 'ayudante') return;
    nav.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-current', 'false'));
    document.querySelector('.content').innerHTML = `<section class="assistant panel" aria-labelledby="assistant-title">
      <h1 id="assistant-title" tabindex="-1">Ayudante</h1>
      <p class="assistant-subtitle">¿En qué te puedo ayudar?</p>
      <p><strong id="assistant-mode-label">Demostración: respuestas simuladas</strong></p>
      <label class="assistant-mode-control" for="assistant-mode">Modo<select id="assistant-mode"><option value="simulated">Simulado</option><option value="gemini" disabled>Gemini</option></select></label>
      <details class="assistant-privacy-details"><summary>Privacidad y uso</summary>
        <p>Ayuda para usar DECILO y expresar necesidades. No ofrece orientación clínica ni cambia tus datos.</p>
        <p id="assistant-privacy">Usá solo cuentas y preguntas ficticias. No escribas nombres, contactos, claves ni información clínica. DECILO no guarda conversaciones. En modo simulado no se envía contenido a un proveedor externo.</p>
        <p>En Gemini, Google recibe tu pregunta y una guía pública de DECILO según el rol. No enviamos tu cuenta, JWT, historial ni datos de pacientes. En el nivel gratuito puede usar preguntas y respuestas para mejorar sus productos y someterlas a revisión humana. Gemini puede equivocarse. La demo externa es solo para personas de 18 años o más.</p>
        <p id="assistant-limit" class="hint">Hasta 800 caracteres. 5 consultas por minuto y 30 por día en esta demostración.</p>
        <p id="assistant-availability" class="hint">Comprobando disponibilidad de Gemini…</p>
        <p>Ayuda local sin enviar preguntas: usá la navegación para abrir tus actividades.${session.user.role === 'paciente' ? ' Podés elegir pictogramas en Mi comunicador para expresar una necesidad.' : ''}</p>
      </details>
      <div id="assistant-demo-access" hidden>
        <label class="assistant-consent"><input id="assistant-age" type="checkbox" />Confirmo que tengo 18 años o más para acceder a la demo Gemini.</label>
      </div>
      <div class="button-row" aria-label="Preguntas sugeridas">
        <button type="button" class="secondary-button" data-assistant-question>Cómo usar DECILO</button>
        <button type="button" class="secondary-button" data-assistant-question>Ayudarme a expresar una necesidad</button>
      </div>
      <form id="assistant-form">
        <div id="assistant-google-notice" hidden>
          <p id="assistant-google-summary">Google recibe tu pregunta. En el nivel gratuito puede usarla para mejorar sus productos y someterla a revisión humana. Usá solo datos ficticios.</p>
          <label class="assistant-consent"><input id="assistant-consent" type="checkbox" aria-describedby="assistant-google-summary" disabled />Acepto enviar mi pregunta a Google</label>
        </div>
        <label for="assistant-message">Tu pregunta<textarea id="assistant-message" rows="3" aria-describedby="assistant-privacy assistant-limit" required></textarea></label>
        <div class="button-row"><button class="primary-button" id="assistant-send" type="submit">Enviar</button><button class="secondary-button" id="assistant-cancel" type="button">Cancelar y borrar</button></div>
      </form>
      <p id="assistant-status" role="status" aria-live="polite"></p>
      <p id="assistant-reply" aria-live="polite"></p>
    </section>`;
    const form = document.getElementById('assistant-form'), input = document.getElementById('assistant-message');
    const status = document.getElementById('assistant-status'), reply = document.getElementById('assistant-reply'), send = document.getElementById('assistant-send');
    const mode = document.getElementById('assistant-mode'), consent = document.getElementById('assistant-consent');
    const age = document.getElementById('assistant-age');
    const modeLabel = document.getElementById('assistant-mode-label');
    let consentVersion = null;
    const capabilityController = new AbortController(); assistantCapabilitiesRequest = capabilityController;
    const capabilityToken = session.token;
    const capabilityTimer = setTimeout(() => capabilityController.abort(), 5000);
    apiRequest('/api/assistant/capabilities', { signal: capabilityController.signal, cache: 'no-store' }).then(result => {
      if (!form.isConnected || session?.token !== capabilityToken || assistantCapabilitiesRequest !== capabilityController) return;
      const available = result.geminiAvailable === true && result.consentVersion === 'google-demo-v1';
      mode.querySelector('[value="gemini"]').disabled = !available;
      consentVersion = available ? result.consentVersion : null;
      document.getElementById('assistant-availability').textContent = available ? 'Gemini disponible para esta cuenta ficticia. Elegí el modo y aceptá el aviso antes de enviar.' : 'Gemini no está habilitado para esta cuenta. Usá el modo simulado; la demo externa requiere una cuenta ficticia autorizada.';
    }).catch(() => {
      if (form.isConnected && session?.token === capabilityToken) document.getElementById('assistant-availability').textContent = 'No pudimos comprobar Gemini. El modo simulado sigue disponible.';
    }).finally(() => { clearTimeout(capabilityTimer); if (assistantCapabilitiesRequest === capabilityController) assistantCapabilitiesRequest = null; });
    mode.addEventListener('change', () => {
      assistantRequest?.abort(); assistantRequest = null; consent.checked = false;
      age.checked = false; consent.disabled = true;
      const external = mode.value === 'gemini'; consent.required = external;
      document.getElementById('assistant-demo-access').hidden = !external;
      document.getElementById('assistant-google-notice').hidden = !external;
      modeLabel.textContent = external ? 'Demostración local: Gemini (Google)' : 'Demostración: respuestas simuladas';
      reply.textContent = ''; status.textContent = ''; send.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy');
    });
    age.addEventListener('change', () => {
      consent.checked = false; consent.disabled = !age.checked;
      if (!age.checked) {
        assistantRequest?.abort(); assistantRequest = null;
        reply.textContent = ''; status.textContent = '';
        send.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy');
      }
    });
    form.querySelectorAll('textarea').forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
    document.querySelectorAll('[data-assistant-question]').forEach(button => button.addEventListener('click', () => {
      input.value = button.textContent; input.setCustomValidity(''); input.focus();
    }));
    document.getElementById('assistant-cancel').addEventListener('click', () => {
      assistantRequest?.abort(); assistantRequest = null;
      consent.checked = false;
      input.value = ''; reply.textContent = ''; status.textContent = 'Solicitud cancelada. Podés escribir otra pregunta.';
      send.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy'); input.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (assistantRequest) return;
      const external = mode.value === 'gemini';
      if (external && !age.checked) { status.textContent = 'Confirmá el requisito de edad para acceder a la demo Gemini o usá Simulado.'; age.focus(); return; }
      if (external && (!consentVersion || !consent.checked)) { status.textContent = 'Aceptá el aviso antes de enviar a Google.'; consent.focus(); return; }
      const message = input.value.trim();
      if (!message || [...input.value].length > 800 || /@|\b(?:bearer|eyJ)[\w.-]*|(?:\d[\s()+-]*){7,}/i.test(message)) {
        input.setCustomValidity('Escribí hasta 800 caracteres, sin datos personales ni credenciales.'); input.reportValidity(); return;
      }
      const controller = new AbortController(); assistantRequest = controller;
      const token = session?.token;
      const current = () => assistantRequest === controller && form.isConnected && session?.token === token;
      send.setAttribute('aria-disabled', 'true'); form.setAttribute('aria-busy', 'true'); reply.textContent = ''; status.textContent = external ? 'Consultando a Gemini…' : 'Preparando respuesta simulada…';
      const payload = external ? { message, mode: 'gemini', consent: consentVersion, demoAdultConfirmed: age.checked } : { message };
      consent.checked = false;
      const timer = setTimeout(() => controller.abort(), 16000);
      try {
        const result = await apiRequest('/api/assistant/messages', { method: 'POST', body: JSON.stringify(payload), signal: controller.signal, cache: 'no-store' });
        if (!current()) return;
        if (typeof result.reply !== 'string' || [...result.reply].length > (session.user.role === 'paciente' ? 400 : 700)) throw new Error('INVALID_REPLY');
        reply.textContent = result.reply; status.textContent = external ? 'Respuesta de la demo lista. Puede incluir un mensaje local de límite; no se realizaron acciones.' : 'Respuesta simulada lista.';
      } catch (error) {
        if (!current()) return;
        if (error.status === 401) { logoutSession('Tu sesión venció. Iniciá sesión nuevamente.'); return; }
        status.textContent = error.status === 429 ? 'Alcanzaste un límite de uso. Esperá antes de volver a enviar.' : 'No pudimos responder. Podés usar la ayuda local e intentar más tarde.';
      } finally {
        clearTimeout(timer);
        if (current()) { assistantRequest = null; send.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy'); }
      }
    });
  }
  function renderLogin() { return `<main class="login-shell"><section class="login-card" aria-labelledby="login-title"><div class="brand-mark"><b aria-hidden="true">D</b><span>DECILO</span></div><p class="eyebrow" style="margin-top:28px">Comunicación que acompaña</p><h1 id="login-title">Un espacio para decir, practicar y compartir.</h1><p class="lead">Un MVP accesible para conectar la comunicación aumentativa con la práctica fonoaudiológica y el acompañamiento familiar.</p><form class="login-form" id="login-form"><fieldset style="border:0;padding:0;margin:0"><legend class="eyebrow">Elegí tu espacio</legend><div class="role-grid">${Object.entries(roleLabels).map(([role, label]) => `<button type="button" class="role-button" data-role="${role}" aria-pressed="${selectedRole === role}"><span class="role-icon" aria-hidden="true">${role === "profesional" ? "✦" : role === "paciente" ? "◉" : "⌂"}</span><strong>${label}</strong><span>${role === "profesional" ? "Configurar y acompañar" : role === "paciente" ? "Comunicar y practicar" : "Acompañar desde casa"}</span></button>`).join("")}</div></fieldset><label for="login-email">Correo de demostración<input id="login-email" name="email" type="email" value="${selectedRole === "profesional" ? "sofia@decilo.test" : selectedRole === "paciente" ? "mateo@decilo.test" : "carla@decilo.test"}" required /></label><label for="login-password">Clave<input id="login-password" name="password" type="password" value="decilo" required /></label><p class="hint">Demo local: la clave de los tres perfiles es <strong>decilo</strong>.</p><p id="login-message" class="message" role="alert"></p><button class="primary-button" type="submit">Entrar a DECILO</button></form></section></main>`; }
  function renderApp() { const current = user(); return `<header class="topbar"><div class="brand-mark"><b aria-hidden="true">D</b><span>DECILO</span></div><div class="topbar-actions"><span id="notifications-slot"></span><div class="account-zone" role="group" aria-label="Cuenta de usuario"><div class="account-info"><span class="session-label" title="${escapeHtml(current.name)}">${escapeHtml(current.name)}</span></div><button class="icon-button logout-button" id="logout-button" title="Cerrar sesión" aria-label="Cerrar sesión"><span class="logout-icon" aria-hidden="true">↪</span><span class="logout-text">Cerrar sesión</span></button></div></div></header><div class="layout"><aside class="sidebar"><p class="eyebrow">Tu espacio</p><strong>${escapeHtml(current.name)}</strong><nav aria-label="Navegación principal">${navItems().map((item) => `<button class="nav-button" data-view="${item.id}" aria-current="${view === item.id ? "page" : "false"}">${item.label}</button>`).join("")}</nav><div class="section"><p id="storage-hint" class="hint">${storageHint()}</p></div></aside><main class="content">${renderView()}</main></div>`; }
  function navItems() { const agenda = ["profesional", "familiar"].includes(session.role) ? [{ id: "agenda", label: "Agenda" }] : []; if (session.role === "profesional") return [...agenda, { id: "inicio", label: "Resumen" }, { id: "pacientes", label: "Pacientes" }, { id: "tableros", label: "Tableros" }, { id: "actividades", label: "Actividades" }, { id: "progreso", label: "Progreso" }]; if (session.role === "paciente") return [...agenda, { id: "comunicador", label: "Mi comunicador" }, { id: "actividades", label: "Mis actividades" }, { id: "progreso", label: "Mis logros" }]; return [...agenda, { id: "inicio", label: familyContext.mode === "enabled" ? "Resumen" : "Seguimiento" }, { id: "actividades", label: "Actividades de hogar" }, { id: "progreso", label: familyContext.mode === "enabled" ? "Progreso" : "Comentarios" }]; }
  function heading(eyebrow, title, description, action = "") { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`; }
  function renderView() { if (familyContext.mode !== 'disabled' && ['tableros','comunicador'].includes(view)) return remoteBoardsView(); if (familyContext.mode !== 'disabled' && ['inicio','pacientes','actividades','progreso','agenda'].includes(view)) { if (familyContext.mode === 'denied') return '<section class="panel"><p>Esta cuenta no pertenece a la demo familiar.</p></section>'; return familyPanel(); } if (view === "comunicador") return renderCommunicator(); if (view === "pacientes") return renderPatients(); if (view === "tableros") return renderBoards(); if (view === "actividades") return renderActivities(); if (view === "progreso") return renderProgress(); return renderHome(); }
  function patientSelect() { const patients = patientsForCurrentUser(); return patients.length > 1 ? `<label>Paciente<select id="patient-select">${patients.map((item) => `<option value="${item.id}" ${activePatientId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>` : ""; }
  function renderHome() { const patients = patientsForCurrentUser(); const activities = patients.flatMap((item) => activitiesFor(item.id)); const pending = activities.filter((item) => !deliveryFor(item.id)); return `${heading(session.role === "familiar" ? "Acompañamiento familiar" : "Sesión activa", session.role === "familiar" ? "Seguimiento que se puede compartir" : "Panel de acompañamiento", session.role === "familiar" ? "Consultá las actividades de hogar y mantené informado al equipo." : "Una vista clara para decidir qué necesita atención hoy.", session.role === "profesional" ? `<button class="primary-button" data-action="new-patient">Registrar paciente</button>` : "")}<section class="stats-grid"><article class="card"><span class="muted">Pacientes vinculados</span><strong class="stat-value">${patients.length}</strong><span class="status success">✓ Relación autorizada</span></article><article class="card"><span class="muted">Actividades pendientes</span><strong class="stat-value">${pending.length}</strong><span class="status pending">! Para revisar</span></article><article class="card"><span class="muted">Puntos acumulados</span><strong class="stat-value">${patients.reduce((sum, item) => sum + pointsFor(item.id), 0)}</strong><span class="status success">★ Recompensas idempotentes</span></article><article class="card"><span class="muted">Comentarios</span><strong class="stat-value">${data.comments.filter((item) => patients.some((patient) => patient.id === item.patientId)).length}</strong><span class="status pending">✎ Registro familiar</span></article></section><section class="section panel"><div class="section-heading"><div><h2>Personas y actividad reciente</h2><p class="muted">Solo aparecen relaciones que tu sesión puede consultar.</p></div></div>${patients.length ? `<div class="list">${patients.map((patient) => `<div class="list-item"><div><h3>${escapeHtml(patient.name)}</h3><p class="muted">${activitiesFor(patient.id).length} actividades · ${pointsFor(patient.id)} puntos · ${badgesFor(patient.id).length} insignias</p></div><button class="secondary-button" data-patient="${patient.id}" data-view="${session.role === "profesional" ? "progreso" : "actividades"}">Abrir seguimiento</button></div>`).join("")}</div>` : `<div class="empty">Todavía no hay pacientes vinculados a esta cuenta.</div>`}</section>`; }
  function renderPatients() { const patients = patientsForCurrentUser(); return `${heading("Gestión de relaciones", "Pacientes", "Registrá datos mínimos y mantené explícita cada vinculación.", `<button class="primary-button" data-action="new-patient">+ Nuevo paciente</button>`)}<section class="panel">${patients.length ? `<div class="list">${patients.map((patient) => `<div class="list-item"><div><h3>${escapeHtml(patient.name)}</h3><p class="muted">${escapeHtml(patient.email)} · ${activitiesFor(patient.id).length} actividades asignadas</p><span class="status success">✓ Vinculado a tu sesión</span></div><button class="secondary-button" data-patient="${patient.id}" data-view="progreso">Ver progreso</button></div>`).join("")}</div>` : `<div class="empty">No hay registros todavía.</div>`}</section>`; }
  function renderBoards() { const patients = patientsForCurrentUser(); const boards = data.boards.filter((board) => patients.some((patient) => patient.id === board.patientId)); return `${heading("Comunicación", "Tableros personalizados", "Ordená pictogramas para que cada paciente encuentre su voz.", `<button class="primary-button" data-action="new-board">+ Nuevo tablero</button>`)}<section class="card-grid">${boards.length ? boards.map((board) => `<article class="card"><p class="eyebrow">${escapeHtml(patientName(board.patientId))}</p><h3>${escapeHtml(board.name)}</h3><p class="muted">${board.pictogramIds.length} pictogramas en orden personalizado.</p><div class="button-row"><button class="secondary-button" data-board="${board.id}" data-action="edit-board">Editar tablero</button><span class="status success">✓ Compartido con el paciente</span></div></article>`).join("") : `<div class="empty full">Creá el primer tablero para comenzar.</div>`}</section>`; }
  function renderCommunicator() { const board = familyContext.mode === 'enabled' ? boardContext.boards.find(item => item.id === boardContext.selected) : data.boards.find((item) => item.patientId === session.userId); const available = (board?.pictogramIds || []).map((id) => pictograms.find((item) => item.id === id)).filter(Boolean).filter((item) => activeCategory === "todas" || item.category === activeCategory); return `${heading("Comunicación aumentativa", "Mi frase, mi voz", "Tocá los pictogramas para construir una frase y reproducirla en tiempo real.", (familyContext.mode === 'enabled' ? '' : patientSelect()))}<section class="board-strip" aria-labelledby="phrase-title"><div class="section-heading"><h2 id="phrase-title">Frase en construcción <span class="status pending">${phrase.length} palabras</span></h2></div><div class="phrase" aria-live="polite">${phrase.length ? phrase.map((item, index) => `<button class="phrase-token" data-phrase-index="${index}" title="Quitar ${escapeHtml(item.word)}"><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${escapeHtml(item.word)}</span></button>`).join("") : `<p class="phrase-empty">Elegí un pictograma del tablero para comenzar.</p>`}</div><div class="board-actions"><button class="primary-button" data-action="speak">▶ Reproducir frase</button><button class="secondary-button" data-action="undo" ${phrase.length ? "" : "disabled"}>↶ Deshacer</button><button class="danger-button" data-action="clear-phrase" ${phrase.length ? "" : "disabled"}>× Borrar frase</button></div><p id="speech-message" class="message" role="status"></p></section><section class="section"><div class="section-heading"><div><h2>Tablero de ${escapeHtml(board?.name || "comunicación")}</h2><p class="muted">Cada pictograma incluye texto asociado, descripción alternativa y metadato de licencia.</p></div></div><div class="category-tabs" role="tablist" aria-label="Categorías de pictogramas">${categories.map((category) => `<button class="category-tab" data-category="${category}" aria-selected="${activeCategory === category}">${categoryLabels[category]}</button>`).join("")}</div><div class="picto-grid" style="margin-top:18px">${available.length ? available.map((item) => `<button class="picto-tile" data-picto="${item.id}" aria-label="Agregar ${escapeHtml(item.word)}. ${escapeHtml(item.alt)}"><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${escapeHtml(item.word)}</span><span class="picto-meta">${categoryLabels[item.category]}</span></button>`).join("") : `<div class="empty full">${board ? "Este tablero no tiene pictogramas en esta categoría." : "Todavía no tenés un tablero asignado."}</div>`}</div></section>`; }
  function renderActivities() { const patients = patientsForCurrentUser(); const list = patients.flatMap((patient) => activitiesFor(patient.id).map((activity) => ({ ...activity, patientName: patient.name, delivery: deliveryFor(activity.id) }))); return `${heading(session.role === "paciente" ? "Práctica" : session.role === "familiar" ? "Rutinas en casa" : "Plan de trabajo", session.role === "paciente" ? "Mis actividades" : "Actividades asignadas", "Las entregas se conservan como historial y cada actividad suma puntos una sola vez.", session.role === "profesional" ? `<button class="primary-button" data-action="new-activity">+ Asignar actividad</button>` : "")}<section class="list panel">${list.length ? list.map((item) => `<article class="list-item"><div><p class="eyebrow">${escapeHtml(item.patientName)} · ${escapeHtml(item.availability)}</p><h3>${escapeHtml(item.title)}</h3><p class="muted">${escapeHtml(item.instruction)}</p><span class="status ${item.delivery ? "success" : "pending"}">${item.delivery ? `✓ Completada por ${item.delivery.origin === "familiar" ? "familiar" : "paciente"}` : `! Pendiente · ${item.points} puntos`}</span></div>${item.delivery ? `<span class="muted">${new Date(item.delivery.completedAt).toLocaleDateString("es-AR")}</span>` : session.role === "profesional" ? "" : `<button class="primary-button" data-complete="${item.id}">${session.role === "familiar" ? "Completar en casa" : "Marcar completada"}</button>`}</article>`).join("") : `<div class="empty">No hay actividades disponibles para esta sesión.</div>`}</section>`; }
  function renderProgress() { const patients = patientsForCurrentUser(); const patient = patients.find((item) => item.id === activePatientId) || patients[0]; if (!patient) return `${heading("Seguimiento", "Sin datos todavía", "Cuando exista una relación autorizada, el resumen aparecerá aquí.")}<div class="empty">No hay un paciente autorizado para mostrar.</div>`; const assigned = activitiesFor(patient.id); const completed = assigned.filter((item) => deliveryFor(item.id)); const comments = data.comments.filter((item) => item.patientId === patient.id); return `${heading("Seguimiento verificable", `Progreso de ${escapeHtml(patient.name)}`, "Totales derivados del historial de entregas, sin gráficos avanzados ni interpretaciones clínicas.", patientSelect())}<section class="stats-grid"><article class="card"><span class="muted">Asignadas</span><strong class="stat-value">${assigned.length}</strong><span class="status pending">! Plan actual</span></article><article class="card"><span class="muted">Completadas</span><strong class="stat-value">${completed.length}</strong><span class="status success">✓ Historial conservado</span></article><article class="card"><span class="muted">Puntos</span><strong class="stat-value">${pointsFor(patient.id)}</strong><span class="status success">★ Una vez por entrega</span></article><article class="card"><span class="muted">Insignias</span><strong class="stat-value">${badgesFor(patient.id).length}</strong><span class="status success">✓ Sin duplicados</span></article></section><section class="section card"><div class="section-heading"><h2>Avance básico</h2><span>${assigned.length ? Math.round(completed.length / assigned.length * 100) : 0}%</span></div><div class="progress-bar" aria-label="${completed.length} de ${assigned.length} actividades completadas"><span style="width:${assigned.length ? completed.length / assigned.length * 100 : 0}%"></span></div></section>${session.role === "familiar" ? `<section class="section panel"><h2>Enviar comentario al profesional</h2><form id="comment-form" class="form-grid"><label class="full" for="comment-text">Comentario<textarea id="comment-text" required minlength="3" placeholder="Contá cómo fue la práctica en casa."></textarea></label><button class="primary-button" type="submit">Guardar comentario</button></form></section>` : ""}<section class="section panel"><div class="section-heading"><h2>Comentarios compartidos</h2><span class="status pending">${comments.length} registrados</span></div>${comments.length ? `<div class="list">${comments.map((comment) => `<div class="list-item"><div><h3>${escapeHtml(comment.authorName)}</h3><p>${escapeHtml(comment.text)}</p></div><time class="muted" datetime="${comment.createdAt}">${new Date(comment.createdAt).toLocaleDateString("es-AR")}</time></div>`).join("")}</div>` : `<div class="empty">Todavía no hay comentarios para este paciente.</div>`}</section>`; }

  function bindEvents() { document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => { selectedRole = button.dataset.role; render(); })); document.getElementById("login-form")?.addEventListener("submit", login); document.getElementById("logout-button")?.addEventListener("click", () => { session = null; sessionStorage.removeItem(SESSION_KEY); phrase = []; view = "login"; render(); }); document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { if (button.dataset.patient) activePatientId = button.dataset.patient; view = button.dataset.view; render(); })); document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { activeCategory = button.dataset.category; render(); })); document.querySelectorAll("[data-picto]").forEach((button) => button.addEventListener("click", () => { const item = pictograms.find((picto) => picto.id === button.dataset.picto); if (item) { phrase.push(item); announce(`${item.word} agregado a la frase`); render(); } })); document.querySelectorAll("[data-phrase-index]").forEach((button) => button.addEventListener("click", () => { phrase.splice(Number(button.dataset.phraseIndex), 1); render(); })); document.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => completeActivity(button.dataset.complete))); document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.board))); document.getElementById("patient-select")?.addEventListener("change", (event) => { activePatientId = event.target.value; render(); }); document.getElementById("comment-form")?.addEventListener("submit", saveComment); }
  function login(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const found = data.users.find((item) => item.email === form.get("email") && item.password === form.get("password") && item.role === selectedRole); if (!found) { document.getElementById("login-message").textContent = "No pudimos validar ese perfil. Revisá el rol, correo y clave."; return; } session = { userId: found.id, role: found.role, startedAt: new Date().toISOString() }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); view = found.role === "paciente" ? "comunicador" : "inicio"; activePatientId = found.role === "paciente" ? found.id : "pac-1"; render(); }
  function completeActivity(activityId) { const activity = data.activities.find((item) => item.id === activityId); if (!activity || !canAccessPatient(activity.patientId) || deliveryFor(activityId)) return; const origin = session.role === "familiar" ? "familiar" : "paciente"; data.deliveries.push({ id: `delivery-${Date.now()}`, activityId, patientId: activity.patientId, origin, completedAt: new Date().toISOString(), points: activity.points }); if (pointsFor(activity.patientId) >= 25 && !badgesFor(activity.patientId).some((badge) => badge.key === "primeros-pasos")) data.badges.push({ id: `badge-${Date.now()}`, patientId: activity.patientId, key: "primeros-pasos", label: "Primeros pasos" }); persist(); showToast(`Actividad completada: +${activity.points} puntos`); render(); }
  function saveComment(event) { event.preventDefault(); const text = document.getElementById("comment-text").value.trim(); if (!text || !canAccessPatient(activePatientId)) return; data.comments.push({ id: `comment-${Date.now()}`, patientId: activePatientId, authorId: session.userId, authorName: user().name, text, createdAt: new Date().toISOString() }); persist(); showToast("Comentario compartido con el profesional"); render(); }
  function handleAction(action, boardId) { if (action === "speak") speakPhrase(); if (action === "undo") { phrase.pop(); render(); } if (action === "clear-phrase") { phrase = []; render(); } if (action === "new-patient") openPatientModal(); if (action === "new-activity") openActivityModal(); if (action === "new-board") openBoardModal(); if (action === "edit-board") openBoardModal(boardId); }
  function speakPhrase() { const message = document.getElementById("speech-message"); if (!phrase.length) { message.textContent = "Primero elegí al menos un pictograma."; return; } const text = phrase.map((item) => item.word).join(" "); if (!("speechSynthesis" in window)) { message.textContent = "La reproducción no está disponible en este dispositivo. La frase sigue visible."; return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "es-AR"; utterance.onstart = () => { message.textContent = "Reproduciendo la frase en voz alta."; announce(message.textContent); }; utterance.onerror = () => { message.textContent = "No se pudo reproducir ahora. La frase sigue visible."; }; window.speechSynthesis.speak(utterance); }
  function modal(title, body) { const wrapper = document.createElement("div"); wrapper.className = "modal-backdrop"; wrapper.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${title}</h2><button class="icon-button" data-close-modal aria-label="Cerrar">×</button></header>${body}</section>`; document.body.appendChild(wrapper); wrapper.querySelector("[data-close-modal]").addEventListener("click", () => wrapper.remove()); wrapper.addEventListener("click", (event) => { if (event.target === wrapper) wrapper.remove(); }); return wrapper; }
  function openPatientModal() { if (session.role !== "profesional") return; const dialog = modal("Registrar paciente", `<form id="patient-form" class="form-grid"><label>Nombre completo<input name="name" required minlength="2" /></label><label>Correo del paciente<input name="email" type="email" required /></label><label class="full">Correo del familiar vinculado<input name="familyEmail" type="email" placeholder="carla@decilo.test" /></label><p id="modal-message" class="message full" role="alert"></p><button class="primary-button full" type="submit">Crear y vincular paciente</button></form>`); dialog.querySelector("#patient-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get("name")).trim(); const email = String(form.get("email")).trim(); const familyEmail = String(form.get("familyEmail")).trim(); if (data.users.some((item) => item.email === email)) { dialog.querySelector("#modal-message").textContent = "Ese correo ya está registrado."; return; } const patient = { id: `pac-${Date.now()}`, name, email, role: "paciente", password: "decilo" }; const family = data.users.find((item) => item.email === familyEmail && item.role === "familiar"); data.users.push(patient); data.relationships.push({ professionalId: session.userId, patientId: patient.id, familyIds: family ? [family.id] : [] }); persist(); dialog.remove(); showToast("Paciente registrado y relación guardada"); render(); }); }
  function openActivityModal() {
    if (session?.role !== "profesional") return;
    const patients = patientsForCurrentUser().filter((item) => item.role === "paciente");
    const opener = document.activeElement;
    const dialog = modal("Asignar actividad", `<form id="activity-form" class="form-grid">
      ${patients.length ? "" : `<p id="activity-empty" class="full">No tenés pacientes vinculados. Registrá y vinculá un paciente antes de asignar una actividad.</p>`}
      <label for="activity-patient">Paciente<select id="activity-patient" name="patientId" required aria-describedby="activity-message${patients.length ? "" : " activity-empty"}" ${patients.length ? "" : "disabled"}>
        <option value="">Seleccioná un paciente</option>${patients.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}
      </select></label>
      <label>Puntos<input name="points" type="number" min="0" max="100" value="10" required /></label>
      <label class="full">Título<input name="title" required minlength="3" /></label>
      <label class="full">Instrucción<textarea name="instruction" required minlength="5"></textarea></label>
      <label>Disponibilidad<select name="availability"><option>Hogar</option><option>Consulta</option></select></label>
      <p id="activity-message" class="message full" role="alert"></p>
      <button class="primary-button full" type="submit" ${patients.length ? "" : "disabled"}>Confirmar asignación</button>
    </form>`);
    dialog.classList.add("activity-modal");
    const selector = dialog.querySelector("#activity-patient");
    const message = dialog.querySelector("#activity-message");
    const close = () => { dialog.remove(); opener?.focus(); };
    dialog.querySelector("[data-close-modal]").addEventListener("click", close);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const controls = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    (patients.length ? selector : dialog.querySelector("[data-close-modal]")).focus();
    selector.addEventListener("change", () => { selector.removeAttribute("aria-invalid"); message.textContent = ""; });
    dialog.querySelector("#activity-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const rawPatientId = form.get("patientId");
      const patientId = typeof rawPatientId === "string" ? rawPatientId.trim() : "";
      let error = "";
      if (session?.role !== "profesional") error = "Necesitás una sesión profesional para asignar actividades.";
      else if (!patientId) error = "Seleccioná un paciente para asignar la actividad.";
      else if (!data.users.some((item) => item.id === patientId && item.role === "paciente") ||
        !data.relationships.some((item) => item.patientId === patientId && item.professionalId === session.userId)) {
        error = "El paciente no está disponible para esta asignación. Revisá la selección y su vinculación.";
      }
      if (error) {
        message.textContent = error;
        selector.setAttribute("aria-invalid", "true");
        selector.focus();
        return;
      }
      data.activities.push({ id: `activity-${Date.now()}`, patientId, professionalId: session.userId, title: String(form.get("title")).trim(), instruction: String(form.get("instruction")).trim(), availability: form.get("availability"), points: Number(form.get("points")), status: "available" });
      persist(); close(); showToast("Actividad asignada"); render();
      document.querySelector('[data-action="new-activity"]')?.focus();
    });
  }
  function openBoardModal(boardId) { if (familyContext.mode !== 'disabled') return openRemoteBoardModal(boardId); if (session.role !== "profesional") return; const existing = data.boards.find((item) => item.id === boardId); const patients = patientsForCurrentUser(); const dialog = modal(existing ? "Editar tablero" : "Nuevo tablero", `<form id="board-form" class="form-grid"><label>Paciente<select name="patientId">${patients.map((item) => `<option value="${item.id}" ${existing?.patientId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label class="full">Nombre del tablero<input name="name" value="${escapeHtml(existing?.name || "Tablero cotidiano")}" required /></label><fieldset class="full" style="border:0;padding:0"><legend class="eyebrow">Pictogramas disponibles</legend><div class="picto-grid">${pictograms.map((item) => `<label class="picto-tile"><input type="checkbox" name="pictograms" value="${item.id}" ${existing?.pictogramIds.includes(item.id) ? "checked" : ""} /><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${item.word}</span></label>`).join("")}</div></fieldset><button class="primary-button full" type="submit">Guardar tablero</button></form>`); dialog.querySelector("#board-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const pictogramIds = form.getAll("pictograms"); if (!pictogramIds.length) return; if (existing) Object.assign(existing, { patientId: form.get("patientId"), name: String(form.get("name")).trim(), pictogramIds }); else data.boards.push({ id: `board-${Date.now()}`, patientId: form.get("patientId"), professionalId: session.userId, name: String(form.get("name")).trim(), pictogramIds }); persist(); dialog.remove(); showToast("Tablero guardado en el orden seleccionado"); render(); }); }
  function normalizeUser(apiUser) { return { id: String(apiUser.id), name: apiUser.nombre, email: apiUser.email, role: apiUser.rol }; }
  async function apiRequest(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    const response = await fetch(`${API_PUBLIC_URL}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(body.message || "No pudimos completar la solicitud."); error.body = body; error.status = response.status; throw error; }
    return body;
  }
  function authErrorMessage(error) { return error.body?.fields ? Object.values(error.body.fields).join(" ") : error.message; }
  function authRoleButtons() { return Object.entries(roleLabels).map(([role, label]) => `<button type="button" class="role-button" data-role="${role}" aria-pressed="${selectedRole === role}"><span class="role-icon" aria-hidden="true">${role === "profesional" ? "✦" : role === "paciente" ? "◉" : "⌂"}</span><strong>${label}</strong><span>${role === "profesional" ? "Configurar y acompañar" : role === "paciente" ? "Comunicar y practicar" : "Acompañar desde casa"}</span></button>`).join(""); }
  function renderLogin() { return `<main class="login-shell"><section class="login-card" aria-labelledby="login-title"><div class="brand-mark"><b aria-hidden="true">D</b><span>DECILO</span></div><p class="eyebrow" style="margin-top:28px">Comunicación que acompaña</p><h1 id="login-title">Un espacio para decir, practicar y compartir.</h1><p class="lead">Ingresá para continuar con tu espacio de comunicación y acompañamiento.</p><form class="login-form" id="login-form"><fieldset style="border:0;padding:0;margin:0"><legend class="eyebrow">Elegí tu espacio</legend><div class="role-grid">${authRoleButtons()}</div></fieldset><label for="login-email">Correo electrónico<input id="login-email" name="email" type="email" autocomplete="email" required /></label><label for="login-password">Contraseña<input id="login-password" name="password" type="password" autocomplete="current-password" required /></label><p id="login-message" class="message" role="alert">${escapeHtml(authMessage)}</p><button class="primary-button" type="submit">Entrar a DECILO</button><button class="secondary-button" id="show-register" type="button">Crear una cuenta</button></form></section></main>`; }
  function renderRegister() { return `<main class="login-shell"><section class="login-card" aria-labelledby="register-title"><div class="brand-mark"><b aria-hidden="true">D</b><span>DECILO</span></div><p class="eyebrow" style="margin-top:28px">Comenzá tu recorrido</p><h1 id="register-title">Creá tu cuenta DECILO.</h1><p class="lead">Elegí el espacio que mejor representa tu forma de acompañar la comunicación.</p><form class="login-form" id="register-form"><label for="register-name">Nombre<input id="register-name" name="nombre" autocomplete="name" required minlength="2" /></label><label for="register-email">Correo electrónico<input id="register-email" name="email" type="email" autocomplete="email" required /></label><label for="register-password">Contraseña<input id="register-password" name="password" type="password" autocomplete="new-password" minlength="8" required /><span class="hint">Usá al menos 8 caracteres.</span></label><label for="register-confirm">Confirmá tu contraseña<input id="register-confirm" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label><fieldset style="border:0;padding:0;margin:0"><legend class="eyebrow">Tu rol</legend><div class="role-grid">${authRoleButtons()}</div></fieldset><p id="register-message" class="message" role="alert">${escapeHtml(authMessage)}</p><button class="primary-button" type="submit">Crear cuenta</button><button class="secondary-button" id="show-login" type="button">Ya tengo una cuenta</button></form></section></main>`; }
  function bindEvents() { document.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => { selectedRole = button.dataset.role; render(); })); document.getElementById("login-form")?.addEventListener("submit", login); document.getElementById("register-form")?.addEventListener("submit", register); document.getElementById("show-register")?.addEventListener("click", () => { authMode = "register"; authMessage = ""; render(); }); document.getElementById("show-login")?.addEventListener("click", () => { authMode = "login"; authMessage = ""; render(); }); document.getElementById("logout-button")?.addEventListener("click", () => logoutSession()); document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { if (!navItems().some((item) => item.id === button.dataset.view)) return; if (button.dataset.patient) activePatientId = button.dataset.patient; view = button.dataset.view; render(); })); document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { activeCategory = button.dataset.category; render(); })); document.querySelectorAll("[data-picto]").forEach((button) => button.addEventListener("click", () => { const item = pictograms.find((picto) => picto.id === button.dataset.picto); if (item) { phrase.push(item); announce(`${item.word} agregado a la frase`); render(); } })); document.querySelectorAll("[data-phrase-index]").forEach((button) => button.addEventListener("click", () => { phrase.splice(Number(button.dataset.phraseIndex), 1); render(); })); document.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => completeActivity(button.dataset.complete))); document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.board))); document.getElementById("patient-select")?.addEventListener("change", (event) => { activePatientId = event.target.value; render(); }); document.getElementById("comment-form")?.addEventListener("submit", saveComment); }
  function setSession(auth) { const publicUser = normalizeUser(auth.user); session = { token: auth.token, userId: publicUser.id, role: publicUser.role, user: publicUser, startedAt: new Date().toISOString() }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); view = publicUser.role === "paciente" ? "comunicador" : "inicio"; activePatientId = publicUser.role === "paciente" ? publicUser.id : "pac-1"; authMessage = ""; notifications.start(session); render(); }
  async function login(event) {
    event.preventDefault();
    if (loginRequest) return;
    const element = event.currentTarget, form = new FormData(element), role = selectedRole;
    const controller = new AbortController(); loginRequest = controller;
    const current = () => loginRequest === controller && element.isConnected;
    const message = document.getElementById('login-message');
    element.setAttribute('aria-busy', 'true');
    element.querySelectorAll('button').forEach(button => button.setAttribute('aria-disabled', 'true'));
    message.setAttribute('role', 'status'); message.textContent = 'Ingresando…';
    const slow = setTimeout(() => { if (current()) message.textContent = 'El servicio está tardando en responder. Si estaba inactivo, puede estar iniciando. No hace falta volver a enviar.'; }, 4000);
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const result = await apiRequest('/api/auth/login', { method: 'POST', signal: controller.signal,
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      if (!current()) return;
      if (result.user.rol !== role) { authMessage = `Esta cuenta pertenece al espacio ${roleLabels[result.user.rol].toLowerCase()}.`; render(); return; }
      authMessage = ''; setSession(result);
    } catch (error) {
      if (!current()) return;
      authMessage = error.name === 'AbortError' ? 'El servicio no respondió a tiempo. Reintentá cuando esté disponible.' : authErrorMessage(error);
      message.setAttribute('role', 'alert'); message.textContent = authMessage;
    } finally {
      clearTimeout(slow); clearTimeout(timeout);
      if (loginRequest === controller) loginRequest = null;
      if (element.isConnected) { element.removeAttribute('aria-busy'); element.querySelectorAll('button').forEach(button => button.removeAttribute('aria-disabled')); }
    }
  }
  async function register(event) { event.preventDefault(); authMessage = ""; const form = new FormData(event.currentTarget); try { const result = await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ nombre: form.get("nombre"), email: form.get("email"), password: form.get("password"), confirmPassword: form.get("confirmPassword"), rol: selectedRole }) }); setSession(result); } catch (error) { authMessage = authErrorMessage(error); render(); } }
  function openPatientModal() { if (session.role !== "profesional") return; const dialog = modal("Registrar paciente", `<form id="patient-form" class="form-grid"><label>Nombre completo<input name="name" required minlength="2" /></label><label>Correo del paciente<input name="email" type="email" required /></label><label class="full">Correo del familiar vinculado<input name="familyEmail" type="email" placeholder="familiar@decilo.test" /></label><p id="modal-message" class="message full" role="alert"></p><button class="primary-button full" type="submit">Crear y vincular paciente</button></form>`); dialog.querySelector("#patient-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get("name")).trim(); const email = String(form.get("email")).trim().toLowerCase(); const familyEmail = String(form.get("familyEmail")).trim().toLowerCase(); if (data.users.some((item) => item.email === email)) { dialog.querySelector("#modal-message").textContent = "Ese correo ya está registrado."; return; } const patient = { id: `pac-${Date.now()}`, name, email, role: "paciente" }; const family = data.users.find((item) => item.email === familyEmail && item.role === "familiar"); data.users.push(patient); data.relationships.push({ professionalId: session.userId, patientId: patient.id, familyIds: family ? [family.id] : [] }); persist(); dialog.remove(); showToast("Paciente registrado y relación guardada"); render(); }); }
  function renderCommunicator() {
    const board = familyContext.mode === 'enabled'
      ? boardContext.boards.find(item => item.id === boardContext.selected)
      : data.boards.find(item => item.patientId === session.userId);
    const available = (board?.pictogramIds || []).map(id => pictograms.find(item => item.id === id)).filter(Boolean)
      .filter(item => activeCategory === 'todas' || item.category === activeCategory);
    const phraseItems = phrase.length ? phrase.map((item, index) => `<div class="phrase-item">
      <button class="phrase-token" data-phrase-index="${index}" aria-label="Quitar ${escapeHtml(item.word)}" title="Quitar ${escapeHtml(item.word)}"><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${escapeHtml(item.word)}</span></button>
      <div class="phrase-item-actions"><button class="icon-button" data-phrase-move="${index}" data-direction="-1" aria-label="Mover ${escapeHtml(item.word)} antes" ${index === 0 ? 'disabled' : ''}>↑</button><button class="icon-button" data-phrase-move="${index}" data-direction="1" aria-label="Mover ${escapeHtml(item.word)} después" ${index === phrase.length - 1 ? 'disabled' : ''}>↓</button><button class="icon-button" data-speak-picto="${item.id}" aria-label="Escuchar ${escapeHtml(item.word)}">🔊</button></div>
    </div>`).join('') : '<p class="phrase-empty">Elegí un pictograma del tablero para comenzar.</p>';
    return `${heading('Comunicación aumentativa', 'Mi frase, mi voz', 'Tocá los pictogramas para construir una frase y reproducirla en tiempo real.', familyContext.mode === 'enabled' ? '' : patientSelect())}
      <section class="board-strip" aria-labelledby="phrase-title"><div class="section-heading"><h2 id="phrase-title">Frase en construcción <span class="status pending">${phrase.length} palabras</span></h2></div>
        <div class="phrase" aria-live="polite">${phraseItems}</div><div class="board-actions"><button class="primary-button" data-action="speak">▶ Reproducir frase</button><button class="secondary-button" data-action="undo" ${phrase.length ? '' : 'disabled'}>↶ Deshacer</button><button class="danger-button" data-action="clear-phrase" ${phrase.length ? '' : 'disabled'}>× Borrar frase</button></div><p id="speech-message" class="message" role="status"></p>
      </section><section class="section"><div class="section-heading"><div><h2>Tablero de ${escapeHtml(board?.name || 'comunicación')}</h2><p class="muted">Elegí una categoría, agregá palabras y escuchalas en voz alta.</p></div></div>
        <div class="category-tabs" role="group" aria-label="Filtrar pictogramas por categoría">${categories.map(category => `<button class="category-tab" data-category="${category}" aria-pressed="${activeCategory === category}">${categoryLabels[category]}</button>`).join('')}</div>
        <div class="picto-grid" style="margin-top:18px">${available.length ? available.map(item => `<div class="picto-entry"><button class="picto-tile" data-picto="${item.id}" aria-label="Agregar ${escapeHtml(item.word)}. ${escapeHtml(item.alt)}"><span class="symbol" aria-hidden="true">${item.symbol}</span><span class="word">${escapeHtml(item.word)}</span><span class="picto-meta">${categoryLabels[item.category]}</span></button><button class="icon-button picto-speak" data-speak-picto="${item.id}" aria-label="Escuchar ${escapeHtml(item.word)}">🔊</button></div>`).join('') : `<div class="empty full">${board ? 'Este tablero no tiene pictogramas en esta categoría.' : 'Todavía no tenés un tablero asignado.'}</div>`}</div>
      </section>`;
  }
  function speakText(text, message) {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      if (message) message.textContent = 'La reproducción no está disponible en este dispositivo. La frase sigue visible.';
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-AR';
    utterance.onstart = () => { if (message) message.textContent = 'Reproduciendo en voz alta.'; announce('Reproduciendo en voz alta.'); };
    utterance.onerror = () => { if (message) message.textContent = 'No se pudo reproducir ahora. El texto sigue visible.'; };
    window.speechSynthesis.speak(utterance);
  }
  function speakPhrase() {
    const message = document.getElementById('speech-message');
    if (!phrase.length) { message.textContent = 'Primero elegí al menos un pictograma.'; return; }
    speakText(phrase.map(item => item.word).join(' '), message);
  }
  document.addEventListener('click', event => {
    const moveButton = event.target.closest('[data-phrase-move]');
    if (moveButton) {
      const source = Number(moveButton.dataset.phraseMove), target = source + Number(moveButton.dataset.direction);
      if (source < 0 || source >= phrase.length || target < 0 || target >= phrase.length) return;
      const [item] = phrase.splice(source, 1); phrase.splice(target, 0, item); render(); return;
    }
    const speakButton = event.target.closest('[data-speak-picto]');
    if (speakButton) {
      const item = pictograms.find(pictogram => pictogram.id === speakButton.dataset.speakPicto);
      if (item) speakText(item.word, document.getElementById('speech-message') || document.getElementById('board-speech-message'));
    }
  });
  async function restoreSession() { if (!session) { render(); return; } try { const result = await apiRequest("/api/auth/me"); session.user = normalizeUser(result.user); session.userId = session.user.id; session.role = session.user.role; notifications.start(session); render(); } catch (_error) { logoutSession("Tu sesión venció. Iniciá sesión nuevamente."); } }
  restoreSession();
})();
