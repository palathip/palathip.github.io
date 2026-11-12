const TOKEN_KEY = "genflights.bearer";
const VERIFIER_KEY = "genflights.handoffVerifier";

const STATES = {
  unconfigured: {
    message: "The API is not configured, so ticket creation is unavailable.",
    login: false,
    logout: false,
    generate: false,
  },
  loading: {
    message: "Checking authorization…",
    login: false,
    logout: false,
    generate: false,
  },
  "logged-out": {
    message: "GitHub account required.",
    login: true,
    logout: false,
    generate: false,
  },
  forbidden: {
    message: "This GitHub account is not authorized.",
    login: true,
    logout: false,
    generate: false,
  },
  expired: {
    message: "Your session has expired. Please sign in again.",
    login: true,
    logout: false,
    generate: false,
  },
  error: {
    message: "Something went wrong. Please try again.",
    login: true,
    logout: false,
    generate: false,
  },
  "error-retry": {
    message: "Something went wrong. Please try again.",
    login: false,
    logout: true,
    generate: true,
    workspace: true,
  },
  "invalid-input": {
    message: "The ticket details did not pass validation. Adjust any field that is too long or has unusual characters, then try again.",
    login: false,
    logout: true,
    generate: true,
    workspace: true,
  },
  logout: {
    message: "Signed out. The token in this tab was removed, but a copied token remains valid until it expires.",
    login: true,
    logout: false,
    generate: false,
  },
  ready: {
    message: "Signed in. You can create a ticket.",
    login: false,
    logout: true,
    generate: true,
    workspace: true,
  },
  working: {
    message: "Creating a ticket…",
    login: false,
    logout: true,
    generate: false,
    workspace: true,
  },
};

export function showsFlightWorkspace(stateName) {
  return Boolean(STATES[stateName] && STATES[stateName].workspace);
}

export function isSafeAPIBase(base) {
  try {
    const u = new URL(base);
    if (u.username || u.password) return false;
    if (u.protocol === "https:") return true;
    if (u.protocol !== "http:") return false;
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
  } catch {
    return false;
  }
}

export function apiOrigin(base) {
  if (!isSafeAPIBase(base)) return "";
  return new URL(base).origin;
}

export function buildStartURL(base, returnTo, challenge) {
  const origin = apiOrigin(base);
  if (!origin) throw new Error("unconfigured");
  const u = new URL("/v1/auth/github/start", origin);
  u.searchParams.set("return_to", returnTo);
  u.searchParams.set("handoff_challenge", challenge);
  return u.href;
}

export function parseHandoffFragment(hash) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const q = new URLSearchParams(raw);
  return { code: q.get("gf_code") || "", error: q.get("gf_error") || "" };
}

export function classifyAuthFailure(status, body) {
  if (status === 403) return "forbidden";
  if (status === 401 && body && body.reason === "expired") return "expired";
  if (status === 401) return "logged-out";
  if (status === 503) return "error";
  return "error";
}

const FIELD_LABELS = {
  passengerName: "Passenger name",
  flightNo: "Flight",
  statusLabel: "Status",
  fromCode: "Origin code",
  fromCity: "Origin city",
  toCode: "Destination code",
  toCity: "Destination city",
  fromAirportDetail: "Origin airport",
  toAirportDetail: "Destination airport",
  gate: "Gate",
  boarding: "Boarding",
  seat: "Seat",
  flightClass: "Class",
  flightDate: "Date",
  zone: "Zone",
  bookingRef: "Booking reference",
};

const TITLES = {
  unconfigured: "Generator unavailable",
  loading: "Checking authorization",
  "logged-out": "Sign in to continue",
  forbidden: "Account not authorized",
  expired: "Session expired",
  error: "Could not continue",
  "error-retry": "Could not create the ticket",
  "invalid-input": "Check the ticket details",
  logout: "Signed out",
  ready: "Signed in",
  working: "Creating a ticket",
};

export function classifyGenerationFailure(status, body) {
  if (status === 400 || status === 413 || status === 415) return "invalid-input";
  return classifyAuthFailure(status, body);
}

export function invalidInputMessage(body) {
  const field = body && typeof body.field === "string" ? FIELD_LABELS[body.field] : "";
  if (field) return `The ${field} field is not valid. Adjust the length or special characters, then try again.`;
  return "The ticket details did not pass validation. Adjust any field that is too long or has unusual characters, then try again.";
}

export function accountFromSession(body) {
  if (!body || typeof body !== "object") return { login: "", avatarUrl: "" };
  return {
    login: cleanLogin(body.login ?? body.username ?? body.name),
    avatarUrl: cleanAvatar(body.avatarUrl ?? body.avatar_url ?? body.avatar),
  };
}

function cleanLogin(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(text)) return "";
  return text;
}

function cleanAvatar(value) {
  if (typeof value !== "string" || value.length > 512) return "";
  let url;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  const host = url.hostname.toLowerCase();
  if (host !== "avatars.githubusercontent.com" && host !== "github.com" && !host.endsWith(".githubusercontent.com")) {
    return "";
  }
  return url.href;
}

const ALLOWED_RETURNS = new Set([
  "https://palathip.github.io/gen-flights/",
  "https://palathip.github.io/gen-flights/index.html",
]);

export function canonicalReturnTo(pageURL) {
  let u;
  try {
    u = new URL(pageURL);
  } catch {
    return "";
  }
  if (u.username || u.password || u.port) return "";
  if (u.protocol !== "https:" || u.hostname !== "palathip.github.io") return "";
  let path = u.pathname;
  if (path.includes("\\") || path.includes("..") || path.includes("//")) return "";
  if (path === "/gen-flights") path = "/gen-flights/";
  const out = "https://palathip.github.io" + path;
  return ALLOWED_RETURNS.has(out) ? out : "";
}

export function viewModel(pass) {
  const text = (v) => (v === undefined || v === null || v === "" ? "\u2014" : String(v));
  return {
    outStatusSmall: text(pass.statusLabel),
    outBannerLine: text(pass.bannerLine),
    outPassenger: text(pass.passengerName),
    outFlight: text(pass.flightNo),
    outFromCityTitle: text(pass.fromCity),
    outToCityTitle: text(pass.toCity),
    outFromDetail: pass.fromAirportDetail ? String(pass.fromAirportDetail) : "",
    outToDetail: pass.toAirportDetail ? String(pass.toAirportDetail) : "",
    showRouteDetails: Boolean(pass.showRouteDetails),
    outFromCode: text(pass.fromCode),
    outToCode: text(pass.toCode),
    outGate: text(pass.gate),
    outBoarding: text(pass.boarding),
    outSeat: text(pass.seat),
    outClass: text(pass.flightClass),
    outDate: text(pass.flightDate),
    outZone: text(pass.zone),
    outBookingRef: text(pass.bookingRefLine),
    qrPayload: typeof pass.qrPayload === "string" ? pass.qrPayload : "",
  };
}

export function base64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function challengeFromVerifier(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

function readBase() {
  if (typeof window === "undefined") return "";
  return String(window.GEN_FLIGHTS_API_BASE || "").trim();
}

function closeAccountMenu() {
  const pop = document.getElementById("accountPopover");
  const trigger = document.getElementById("btnAccount");
  if (pop) pop.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function applyAccount(body) {
  const account = accountFromSession(body);
  const user = document.getElementById("authUser");
  const avatar = document.getElementById("authAvatar");
  const trigger = document.getElementById("btnAccount");
  const label = account.login || "Signed in";
  if (user) user.textContent = label;
  if (trigger) {
    trigger.setAttribute("aria-label", `Account menu, ${label}`);
  }
  if (!avatar) return;
  if (account.avatarUrl) {
    avatar.src = account.avatarUrl;
    avatar.hidden = false;
  } else {
    avatar.removeAttribute("src");
    avatar.hidden = true;
  }
}

function mountFlightWorkspace() {
  const mount = document.getElementById("flightMount");
  const template = document.getElementById("flightWorkspaceTemplate");
  if (!mount || !template || mount.childElementCount > 0) return;
  mount.append(template.content.cloneNode(true));
  const editor = document.getElementById("flightEditor");
  const preview = document.getElementById("flightPreview");
  if (editor) editor.hidden = false;
  if (preview) preview.hidden = false;
  const placeholder = document.getElementById("flightPlaceholder");
  if (placeholder) placeholder.hidden = true;
}

function unmountFlightWorkspace() {
  const mount = document.getElementById("flightMount");
  if (mount) mount.replaceChildren();
  const placeholder = document.getElementById("flightPlaceholder");
  if (placeholder) placeholder.hidden = false;
}

function setState(name, message) {
  const spec = STATES[name] || STATES.error;
  const status = document.getElementById("authStatus");
  if (status) status.textContent = message || spec.message;
  const heading = document.getElementById("authHeading");
  if (heading && TITLES[name]) heading.textContent = TITLES[name];
  const login = document.getElementById("btnLogin");
  const logout = document.getElementById("btnLogout");
  const showWorkspace = showsFlightWorkspace(name);
  if (showWorkspace) mountFlightWorkspace();
  else unmountFlightWorkspace();
  const gen = document.getElementById("btnGen");
  if (login) {
    login.hidden = !spec.login;
    login.removeAttribute("aria-busy");
  }
  if (logout) logout.hidden = !spec.logout;
  if (gen) gen.disabled = !spec.generate;
  const layout = document.getElementById("flightLayout");
  const workspace = document.getElementById("flightWorkspace");
  const account = document.getElementById("accountMenu");
  if (workspace) {
    workspace.inert = !showWorkspace;
    if (showWorkspace) workspace.removeAttribute("aria-hidden");
    else workspace.setAttribute("aria-hidden", "true");
  }
  if (layout) {
    layout.classList.toggle("is-locked", !showWorkspace);
    layout.dataset.authState = name;
    delete layout.dataset.authPhase;
  }
  if (account) account.hidden = !spec.logout;
  closeAccountMenu();
  if (!spec.logout) applyAccount(null);
  if (!showWorkspace) renderQR("");
}

function value(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function collect() {
  return {
    passengerName: value("passengerName"),
    flightNo: value("flightNo"),
    statusLabel: value("statusLabel"),
    fromCode: value("fromCode"),
    fromCity: value("fromCity"),
    toCode: value("toCode"),
    toCity: value("toCity"),
    fromAirportDetail: value("fromAirportDetail"),
    toAirportDetail: value("toAirportDetail"),
    gate: value("gate"),
    boarding: value("boarding"),
    seat: value("seat"),
    flightClass: value("flightClass"),
    flightDate: value("flightDate"),
    zone: value("zone"),
    bookingRef: value("bookingRef"),
  };
}

function applyPass(pass) {
  const view = viewModel(pass);
  for (const id of Object.keys(view)) {
    if (id === "showRouteDetails" || id === "qrPayload") continue;
    const el = document.getElementById(id);
    if (el) el.textContent = view[id];
  }
  const row = document.getElementById("outRouteDetailsRow");
  if (row) row.style.display = view.showRouteDetails ? "grid" : "none";
  renderQR(view.qrPayload);
}

function renderQR(payload) {
  const qrEl = document.getElementById("qrcode");
  if (!qrEl) return;
  qrEl.replaceChildren();
  if (!payload) {
    const note = document.createElement("p");
    note.className = "bp-hint";
    note.textContent = "Sign in to generate a QR code.";
    qrEl.appendChild(note);
    return;
  }
  if (typeof QRCode === "undefined") {
    const note = document.createElement("p");
    note.style.color = "#6b7280";
    note.style.fontSize = "0.8rem";
    note.textContent = "Could not load the QR code. Refresh the page and try again.";
    qrEl.appendChild(note);
    return;
  }
  const opts = {
    text: payload,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
  };
  if (QRCode.CorrectLevel) opts.correctLevel = QRCode.CorrectLevel.M;
  new QRCode(qrEl, opts);
}

async function apiFetch(path, options = {}) {
  const origin = apiOrigin(readBase());
  if (!origin) throw new Error("unconfigured");
  const headers = new Headers(options.headers || {});
  if (options.token) headers.set("Authorization", "Bearer " + options.token);
  if (options.json) headers.set("Content-Type", "application/json");
  return fetch(origin + path, {
    method: options.method || "GET",
    headers,
    body: options.json ? JSON.stringify(options.json) : undefined,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

async function readJSON(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function generate() {
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  if (!token) {
    setState("logged-out");
    return;
  }
  setState("working");
  try {
    const res = await apiFetch("/v1/flights/boarding-pass", {
      method: "POST",
      token,
      json: collect(),
    });
    const body = await readJSON(res);
    if (!res.ok) {
      const next = classifyGenerationFailure(res.status, body);
      if (next === "invalid-input") {
        setState(next, invalidInputMessage(body));
        return;
      }
      if (res.status === 401 || res.status === 403) sessionStorage.removeItem(TOKEN_KEY);
      setState(next);
      return;
    }
    if (!body.qrPayload) {
      setState("error-retry");
      return;
    }
    applyPass(body);
    setState("ready");
  } catch {
    setState("error-retry");
  }
}

async function login() {
  const base = readBase();
  if (!apiOrigin(base)) {
    setState("unconfigured");
    return;
  }
  const returnTo = canonicalReturnTo(location.href);
  if (!returnTo) {
    setState("error", "This page is not an allowed GitHub return address.");
    return;
  }
  const verifierValue = randomVerifier();
  const challenge = await challengeFromVerifier(verifierValue);
  sessionStorage.setItem(VERIFIER_KEY, verifierValue);
  const layout = document.getElementById("flightLayout");
  const status = document.getElementById("authStatus");
  const button = document.getElementById("btnLogin");
  if (layout) layout.dataset.authPhase = "redirecting";
  if (status) status.textContent = "Redirecting to GitHub…";
  if (button) button.setAttribute("aria-busy", "true");
  location.assign(buildStartURL(base, returnTo, challenge));
}

async function logout() {
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  setState("logout");
  if (!apiOrigin(readBase())) return;
  try {
    await apiFetch("/v1/auth/logout", { method: "POST", token });
  } catch {
    // The tab copy is already gone. The server cannot revoke a copied token.
  }
}

function applyFragmentError(code) {
  if (code === "forbidden") setState("forbidden");
  else if (code === "expired") setState("expired");
  else if (code === "access_denied") setState("logged-out", "GitHub authorization was cancelled.");
  else if (code === "not_configured") setState("unconfigured");
  else setState("error");
}

async function boot() {
  setState("loading");
  const base = readBase();
  if (!apiOrigin(base)) {
    setState("unconfigured");
    return;
  }
  const handoff = parseHandoffFragment(location.hash);
  if (handoff.code || handoff.error) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  try {
    if (handoff.error) {
      sessionStorage.removeItem(VERIFIER_KEY);
      applyFragmentError(handoff.error);
      return;
    }
    if (handoff.code) {
      const layout = document.getElementById("flightLayout");
      const status = document.getElementById("authStatus");
      if (layout) layout.dataset.authPhase = "returning";
      if (status) status.textContent = "Completing sign-in…";
      const verifierValue = sessionStorage.getItem(VERIFIER_KEY) || "";
      sessionStorage.removeItem(VERIFIER_KEY);
      if (!verifierValue) {
        setState("error");
        return;
      }
      const res = await apiFetch("/v1/auth/handoff", {
        method: "POST",
        json: { code: handoff.code, verifier: verifierValue },
      });
      const body = await readJSON(res);
      if (!res.ok || !body.token) {
        setState("error");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, body.token);
    }
    const token = sessionStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setState("logged-out");
      return;
    }
    const res = await apiFetch("/v1/auth/session", { token });
    const body = await readJSON(res);
    if (!res.ok) {
      sessionStorage.removeItem(TOKEN_KEY);
      setState(classifyAuthFailure(res.status, body));
      return;
    }
    applyAccount(body);
    setState("ready");
    await generate();
  } catch {
    setState(sessionStorage.getItem(TOKEN_KEY) ? "error-retry" : "error");
  }
}

function initAccountMenu() {
  const trigger = document.getElementById("btnAccount");
  const pop = document.getElementById("accountPopover");
  const logout = document.getElementById("btnLogout");
  const avatar = document.getElementById("authAvatar");
  if (avatar) {
    avatar.addEventListener("error", () => {
      avatar.hidden = true;
    });
  }
  if (!trigger || !pop) return;
  trigger.addEventListener("click", () => {
    if (!pop.hidden) {
      closeAccountMenu();
      return;
    }
    if (!logout || logout.hidden) return;
    pop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    logout.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || pop.hidden) return;
    event.preventDefault();
    closeAccountMenu();
    trigger.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    const menu = document.getElementById("accountMenu");
    if (pop.hidden || !menu || menu.contains(event.target)) return;
    closeAccountMenu();
  });
  pop.addEventListener("focusout", (event) => {
    const menu = document.getElementById("accountMenu");
    const next = event.relatedTarget;
    if (pop.hidden || (menu && next && menu.contains(next))) return;
    closeAccountMenu();
  });
}

function init() {
  initAccountMenu();
  document.getElementById("btnLogin").addEventListener("click", () => {
    login().catch(() => setState("error"));
  });
  document.getElementById("btnLogout").addEventListener("click", () => {
    logout();
  });
  const mount = document.getElementById("flightMount");
  if (mount) {
    mount.addEventListener("click", (event) => {
      if (event.target.closest("#btnGen")) generate();
    });
    mount.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("input")) generate();
    });
  }
  boot();
}

if (typeof document !== "undefined") init();
