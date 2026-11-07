const TOKEN_KEY = "genflights.bearer";
const VERIFIER_KEY = "genflights.handoffVerifier";

const STATES = {
  unconfigured: {
    message: "ยังไม่ได้ตั้งค่า API — การสร้างตั๋วยังไม่พร้อมใช้งาน",
    login: false,
    logout: false,
    generate: false,
  },
  loading: {
    message: "กำลังตรวจสอบสิทธิ์…",
    login: false,
    logout: false,
    generate: false,
  },
  "logged-out": {
    message: "เข้าสู่ระบบด้วย GitHub ของเจ้าของเพื่อสร้างตั๋ว",
    login: true,
    logout: false,
    generate: false,
  },
  forbidden: {
    message: "บัญชี GitHub นี้ไม่ได้รับอนุญาต",
    login: true,
    logout: false,
    generate: false,
  },
  expired: {
    message: "เซสชันหมดอายุแล้ว โปรดเข้าสู่ระบบใหม่",
    login: true,
    logout: false,
    generate: false,
  },
  error: {
    message: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
    login: true,
    logout: false,
    generate: false,
  },
  "error-retry": {
    message: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
    login: false,
    logout: true,
    generate: true,
  },
  logout: {
    message: "ออกจากระบบแล้ว โทเค็นในแท็บนี้ถูกลบ แต่โทเค็นที่ถูกคัดลอกไปจะยังใช้ได้จนกว่าจะหมดอายุ",
    login: true,
    logout: false,
    generate: false,
  },
  ready: {
    message: "เข้าสู่ระบบแล้ว สามารถสร้างตั๋วได้",
    login: false,
    logout: true,
    generate: true,
  },
  working: {
    message: "กำลังสร้างตั๋ว…",
    login: false,
    logout: true,
    generate: false,
  },
};

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

function setState(name, message) {
  const spec = STATES[name] || STATES.error;
  const status = document.getElementById("authStatus");
  if (status) status.textContent = message || spec.message;
  const login = document.getElementById("btnLogin");
  const logout = document.getElementById("btnLogout");
  const gen = document.getElementById("btnGen");
  if (login) login.hidden = !spec.login;
  if (logout) logout.hidden = !spec.logout;
  if (gen) gen.disabled = !spec.generate;
  if (name !== "ready" && name !== "working" && name !== "error-retry") renderQR("");
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
    note.textContent = "เข้าสู่ระบบเพื่อสร้าง QR";
    qrEl.appendChild(note);
    return;
  }
  if (typeof QRCode === "undefined") {
    const note = document.createElement("p");
    note.style.color = "#6b7280";
    note.style.fontSize = "0.8rem";
    note.textContent = "โหลด QR ไม่สำเร็จ — ลองรีเฟรชหน้า";
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
      if (res.status === 401 || res.status === 403) sessionStorage.removeItem(TOKEN_KEY);
      setState(classifyAuthFailure(res.status, body));
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
  const verifierValue = randomVerifier();
  const challenge = await challengeFromVerifier(verifierValue);
  sessionStorage.setItem(VERIFIER_KEY, verifierValue);
  const returnTo = location.origin + location.pathname;
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
  else if (code === "access_denied") setState("logged-out", "ยกเลิกการอนุญาต GitHub");
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
    setState("ready");
    await generate();
  } catch {
    setState(sessionStorage.getItem(TOKEN_KEY) ? "error-retry" : "error");
  }
}

function init() {
  document.getElementById("btnLogin").addEventListener("click", () => {
    login().catch(() => setState("error"));
  });
  document.getElementById("btnLogout").addEventListener("click", () => {
    logout();
  });
  document.getElementById("btnGen").addEventListener("click", () => {
    generate();
  });
  document.querySelectorAll(".panel input").forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") generate();
    });
  });
  boot();
}

if (typeof document !== "undefined") init();
