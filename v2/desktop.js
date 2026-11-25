/* Desktop shell for /v2/. Copy comes from ../resume.json so it is not forked. */
(function () {
  /* Keep in sync with the mobile @media query in desktop.css. */
  var mobileQuery = window.matchMedia("(max-width: 760px), (max-height: 500px) and (pointer: coarse)");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var clock = document.getElementById("clock");
  var stage = document.getElementById("stage");
  var dragging = null;

  function isDesktop() {
    return !mobileQuery.matches;
  }

  function tick() {
    var now = new Date();
    var weekday = now.toLocaleDateString("en-US", { weekday: "short" });
    var month = now.toLocaleDateString("en-US", { month: "short" });
    var time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    clock.textContent = weekday + " " + month + " " + now.getDate() + "  " + time;
    clock.dateTime = now.toISOString();
  }

  /* The clock only shows minutes, so tick on each minute boundary. */
  function scheduleTick() {
    tick();
    window.setTimeout(scheduleTick, 60000 - (Date.now() % 60000) + 50);
  }

  scheduleTick();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick();
  });

  function windows() {
    return Array.prototype.slice.call(document.querySelectorAll(".window"));
  }

  function launchers(id) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-app="' + id + '"]'));
  }

  function frontWindow() {
    return windows()
      .filter(function (win) {
        return win.classList.contains("is-open") && !win.classList.contains("is-min");
      })
      .sort(function (a, b) {
        return (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0);
      })[0] || null;
  }

  function syncChrome() {
    var mobile = !isDesktop();
    var front = frontWindow();
    document.body.classList.toggle("has-mobile-app", mobile && !!front);
    windows().forEach(function (win) {
      var visible = mobile ? win === front : win.classList.contains("is-open") && !win.classList.contains("is-min");
      win.classList.toggle("is-mobile-front", mobile && win === front);
      win.toggleAttribute("inert", !visible);
      win.setAttribute("aria-hidden", visible ? "false" : "true");
      win.setAttribute("aria-modal", mobile && win === front ? "true" : "false");
    });
  }

  function setLauncher(id, mode) {
    launchers(id).forEach(function (item) {
      if (item.dataset.href) return;
      var running = mode === "open" || mode === "min";
      item.classList.toggle("is-open", running);
      item.classList.toggle("is-min", mode === "min");
      if (item.hasAttribute("aria-expanded")) {
        item.setAttribute("aria-expanded", mode === "open" ? "true" : "false");
      }
      var state = item.querySelector("[data-state]");
      if (state) state.textContent = mode === "min" ? " minimized" : mode === "open" ? " open" : "";
    });
  }

  function bringToFront(win) {
    var ordered = windows().sort(function (a, b) {
      return (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0);
    });
    var n = 1;
    ordered.forEach(function (item) {
      if (item !== win) item.style.zIndex = String(n++);
    });
    win.style.zIndex = String(n);
    windows().forEach(function (item) {
      item.classList.toggle("is-focused", item === win);
    });
  }

  function clamp(win, left, top) {
    var sw = stage.clientWidth;
    var sh = stage.clientHeight;
    var w = win.offsetWidth;
    var h = win.offsetHeight;
    var keep = Math.min(160, w);
    left = Math.min(Math.max(left, keep - w), Math.max(0, sw - keep));
    top = Math.min(Math.max(top, 0), Math.max(0, sh - 48));
    return { left: left, top: top };
  }

  function placeWindow(win) {
    var sw = stage.clientWidth;
    var sh = stage.clientHeight;
    var w = win.offsetWidth;
    var h = win.offsetHeight;
    var cascade = Number(win.dataset.cascade || 0);
    var left = Math.max(12, (sw - w) / 2) + cascade;
    var top = Math.max(12, (sh - 100 - h) / 2) + cascade * 0.45;
    var pos = clamp(win, left, top);
    win.style.left = pos.left + "px";
    win.style.top = pos.top + "px";
    win.dataset.placed = "1";
  }

  function focusLauncher(id) {
    var selector = (isDesktop() ? ".dock-item" : ".home-item") + '[data-app="' + id + '"]';
    var opener = document.querySelector(selector);
    if (opener) opener.focus();
  }

  function openApp(id) {
    var win = document.getElementById("window-" + id);
    if (!win) return;
    var already = win.classList.contains("is-open") && !win.classList.contains("is-min");
    win.dataset.minToken = "";
    win.classList.remove("is-min", "is-minimizing");
    if (!win.dataset.placed && isDesktop()) {
      win.classList.add("is-open");
      placeWindow(win);
    } else {
      win.classList.add("is-open");
    }
    bringToFront(win);
    setLauncher(id, "open");
    syncChrome();
    if (!already) {
      var maxBtn = win.querySelector('[data-action="maximize"]');
      if (maxBtn && !win.classList.contains("is-max")) maxBtn.setAttribute("aria-label", "Maximize " + labelFor(id));
    }
    window.requestAnimationFrame(function () {
      win.focus({ preventScroll: true });
    });
  }

  function labelFor(id) {
    var item = document.querySelector('.dock-item[data-app="' + id + '"] .dock-label');
    return item ? item.textContent : id;
  }

  function closeApp(win) {
    var id = win.dataset.app;
    win.dataset.minToken = "";
    if (win.classList.contains("is-max")) {
      win.classList.remove("is-max");
      win.style.left = win.dataset.restoreLeft || "";
      win.style.top = win.dataset.restoreTop || "";
      win.style.width = win.dataset.restoreWidth || "";
      win.style.height = win.dataset.restoreHeight || "";
    }
    win.classList.remove("is-open", "is-min", "is-minimizing");
    setLauncher(id, "closed");
    syncChrome();
    focusLauncher(id);
  }

  function finishMinimize(win, token) {
    if (win.dataset.minToken !== String(token)) return;
    win.dataset.minToken = "";
    win.classList.remove("is-minimizing");
    win.classList.add("is-min");
    setLauncher(win.dataset.app, "min");
    syncChrome();
    focusLauncher(win.dataset.app);
  }

  function minimizeApp(win) {
    if (!isDesktop()) {
      closeApp(win);
      return;
    }
    var token = String(Date.now()) + Math.random();
    win.dataset.minToken = token;
    if (motionQuery.matches) {
      finishMinimize(win, token);
      return;
    }
    win.classList.add("is-minimizing");
    function onEnd(event) {
      if (event.target !== win || event.animationName !== "window-out") return;
      win.removeEventListener("animationend", onEnd);
      finishMinimize(win, token);
    }
    win.addEventListener("animationend", onEnd);
    window.setTimeout(function () { finishMinimize(win, token); }, 260);
  }

  function storeRestore(win) {
    win.dataset.restoreLeft = win.style.left;
    win.dataset.restoreTop = win.style.top;
    win.dataset.restoreWidth = win.style.width;
    win.dataset.restoreHeight = win.style.height;
  }

  function toggleMax(win) {
    if (!isDesktop()) return;
    var button = win.querySelector('[data-action="maximize"]');
    var name = labelFor(win.dataset.app);
    if (win.classList.contains("is-max")) {
      win.classList.remove("is-max");
      win.style.left = win.dataset.restoreLeft || "";
      win.style.top = win.dataset.restoreTop || "";
      win.style.width = win.dataset.restoreWidth || "";
      win.style.height = win.dataset.restoreHeight || "";
      if (button) button.setAttribute("aria-label", "Maximize " + name);
    } else {
      storeRestore(win);
      win.style.left = "";
      win.style.top = "";
      win.style.width = "";
      win.style.height = "";
      win.classList.add("is-max");
      if (button) button.setAttribute("aria-label", "Restore " + name);
    }
    bringToFront(win);
    syncChrome();
  }

  windows().forEach(function (win) {
    win.addEventListener("pointerdown", function (event) {
      bringToFront(win);
      if (!event.target.closest("button, a, input, textarea, select")) {
        win.focus({ preventScroll: true });
      }
    });

    win.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button || !win.contains(button)) return;
      if (button.dataset.action === "close") closeApp(win);
      if (button.dataset.action === "minimize") minimizeApp(win);
      if (button.dataset.action === "maximize") toggleMax(win);
    });

    var bar = win.querySelector(".titlebar");
    bar.addEventListener("pointerdown", function (event) {
      if (!isDesktop() || event.button !== 0) return;
      if (event.target.closest("button, a")) return;
      if (win.classList.contains("is-max")) return;
      event.preventDefault();
      var rect = win.getBoundingClientRect();
      var stageRect = stage.getBoundingClientRect();
      dragging = {
        win: win,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
        stageLeft: stageRect.left,
        stageTop: stageRect.top
      };
      bar.setPointerCapture(event.pointerId);
    });

    bar.addEventListener("pointermove", function (event) {
      if (!dragging || dragging.win !== win) return;
      var left = event.clientX - dragging.stageLeft - dragging.dx;
      var top = event.clientY - dragging.stageTop - dragging.dy;
      var pos = clamp(win, left, top);
      win.style.left = pos.left + "px";
      win.style.top = pos.top + "px";
      win.dataset.placed = "1";
      win.dataset.moved = "1";
    });

    function endDrag(event) {
      if (!dragging || dragging.win !== win) return;
      dragging = null;
      if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
    }

    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);
  });

  document.querySelectorAll(".dock-item, .home-item").forEach(function (item) {
    if (item.tagName === "A") return;
    item.addEventListener("click", function () {
      openApp(item.dataset.app);
    });
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-copy]");
    if (!button) return;
    var text = button.getAttribute("data-copy");
    var mark = function (ok) {
      button.textContent = ok ? "Copied!" : "Copy";
      button.classList.toggle("is-copied", ok);
      window.setTimeout(function () {
        button.textContent = "Copy";
        button.classList.remove("is-copied");
      }, 1500);
    };
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      area.remove();
      mark(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { mark(true); }, fallback);
    } else {
      fallback();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var win = frontWindow();
    if (!win) return;
    event.preventDefault();
    closeApp(win);
  });

  document.addEventListener("click", function (event) {
    var opener = event.target.closest("[data-open-app]");
    if (!opener) return;
    openApp(opener.getAttribute("data-open-app"));
  });

  /* Keep open windows reachable after the viewport changes size. */
  function reclampWindows() {
    if (!isDesktop()) return;
    windows().forEach(function (win) {
      if (!win.classList.contains("is-open") || win.classList.contains("is-max")) return;
      if (!win.dataset.placed) {
        if (!win.classList.contains("is-min")) placeWindow(win);
        return;
      }
      /* Pull the window fully back into view when it fits, then apply the drag limits. */
      var left = Math.min(parseFloat(win.style.left) || 0, Math.max(0, stage.clientWidth - win.offsetWidth));
      var top = Math.min(parseFloat(win.style.top) || 0, Math.max(0, stage.clientHeight - win.offsetHeight));
      var pos = clamp(win, left, top);
      win.style.left = pos.left + "px";
      win.style.top = pos.top + "px";
    });
  }

  var resizeFrame = 0;
  window.addEventListener("resize", function () {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(function () {
      resizeFrame = 0;
      reclampWindows();
    });
  });

  mobileQuery.addEventListener("change", function () {
    windows().forEach(function (win) { win.classList.remove("is-minimizing"); });
    syncChrome();
    reclampWindows();
  });

  /* Hide a third-party icon that fails to load instead of showing a broken image. */
  document.addEventListener("error", function (event) {
    var img = event.target;
    if (img && img.tagName === "IMG" && img.closest(".window-body")) img.style.display = "none";
  }, true);

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function safeUrl(url) {
    var value = String(url || "").trim();
    if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
    return "";
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function formatRange(start, end) {
    var startLabel = formatDate(start);
    if (!end) return startLabel + " - Present";
    var endLabel = formatDate(end);
    return startLabel === endLabel ? startLabel : startLabel + " - " + endLabel;
  }

  function pictureSrc(picture) {
    var value = String(picture || "");
    var local = value.match(/^(?:https?:\/\/[^/]+)?\/?(images\/profile\.png)$/);
    if (local) return new URL("../" + local[1], window.location.href).href;
    if (value) return value;
    return new URL("../images/profile.png", window.location.href).href;
  }

  function highlightHtml(text) {
    var source = String(text);
    var labeled = source.match(/^(website|linebot):\s+(\S.*)$/);
    if (labeled) {
      var value = labeled[2].trim();
      if (/^https?:\/\//i.test(value)) {
        return escapeHtml(labeled[1]) + ': <a href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(value) + "</a>";
      }
      return escapeHtml(source);
    }
    var pattern = /([A-Za-z][\w.+-]*)\s*:\s*(https?:\/\/[^\s,)]+)/g;
    var html = "";
    var last = 0;
    var match;
    while ((match = pattern.exec(source))) {
      html += escapeHtml(source.slice(last, match.index));
      html += '<a href="' + escapeHtml(match[2]) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(match[1]) + "</a>";
      last = match.index + match[0].length;
    }
    if (!last) return escapeHtml(source);
    return html + escapeHtml(source.slice(last));
  }

  function bulletList(items, renderItem) {
    if (!items || !items.length) return "";
    return "<ul class=\"highlights\">" + items.map(function (item) {
      return "<li>" + renderItem(item) + "</li>";
    }).join("") + "</ul>";
  }

  var socialIcons = {
    Github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    Gitlab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.135-.423-.73-.423-.867 0L1.388 9.452.045 13.587c-.121.375.014.789.331 1.023L12 23.054l11.624-8.443c.318-.235.453-.647.331-1.024"/></svg>',
    LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    Youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
  };

  function profilesHtml(profiles) {
    if (!profiles || !profiles.length) return "";
    return '<div class="profiles">' + profiles.map(function (profile) {
      var href = safeUrl(profile.url);
      if (!href) return "";
      var icon = socialIcons[profile.network] || "<span>" + escapeHtml(String(profile.network || "?").charAt(0)) + "</span>";
      return '<a class="profile" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtml(profile.network) + '">' + icon + "</a>";
    }).join("") + "</div>";
  }

  function chipsHtml(basics) {
    var chips = "";
    if (basics.email) {
      var mail = safeUrl("mailto:" + basics.email);
      chips += '<a class="chip" href="' + escapeHtml(mail) + '">' + escapeHtml(basics.email) + "</a>";
    }
    if (basics.phone) chips += '<span class="chip">' + escapeHtml(basics.phone) + "</span>";
    if (basics.location) {
      chips += '<span class="chip">' + escapeHtml(basics.location.city) + ", " + escapeHtml(basics.location.region) + "</span>";
    }
    return chips ? '<div class="chips">' + chips + "</div>" : "";
  }

  function projectSiteHtml(project) {
    var projectSite = project.website || project.url || "";
    var internal = /internal/i.test(projectSite) || /internal/i.test(project.name || "");
    if (internal) return '<p class="entry-site">website: <strong class="internal">INTERNAL SITE</strong></p>';
    if (!projectSite) return "";
    var label = project.websiteLabel || (projectSite === "https://kcc.gg/n06h" ? "UCHOOSE APP" : projectSite);
    var href = safeUrl(projectSite);
    if (!href) return '<p class="entry-site">website: ' + escapeHtml(label) + "</p>";
    return '<p class="entry-site">website: <a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + "</a></p>";
  }

  function ageInYears(now) {
    var today = now || new Date();
    var age = today.getFullYear() - 1991;
    var month = today.getMonth();
    var day = today.getDate();
    if (month < 7 || (month === 7 && day < 7)) age -= 1;
    return age;
  }

  function currentRole(data) {
    var newest = (data.work || []).reduce(function (best, item) {
      if (!best) return item;
      return String(item.startDate || "") > String(best.startDate || "") ? item : best;
    }, null);
    return newest && newest.position ? newest.position : "";
  }

  function locationText(location) {
    if (!location) return "";
    return [location.city, location.countryCode].filter(Boolean).join(", ");
  }

  function renderAbout(data) {
    var basics = data.basics || {};
    var name = basics.name || "";
    return '' +
      '<div class="about-mac">' +
        '<img class="about-mac-photo" src="' + escapeHtml(pictureSrc(basics.picture)) + '" alt="Portrait of ' + escapeHtml(name) + '" width="168" height="168" draggable="false">' +
        '<h3 class="about-mac-name">' + escapeHtml(name) + "</h3>" +
        '<p class="about-mac-tagline">I\'m an Ordinary Man. :)</p>' +
        '<dl class="about-mac-specs">' +
          "<div><dt>Role</dt><dd>" + escapeHtml(currentRole(data)) + "</dd></div>" +
          (locationText(basics.location) ? "<div><dt>Location</dt><dd>" + escapeHtml(locationText(basics.location)) + "</dd></div>" : "") +
          "<div><dt>Age</dt><dd>" + escapeHtml(ageInYears()) + "</dd></div>" +
          "<div><dt>Gender</dt><dd>Male</dd></div>" +
          "<div><dt>MBTI</dt><dd>ISFP</dd></div>" +
        "</dl>" +
        '<button type="button" class="about-mac-more" data-open-app="resume">More Info...</button>' +
        '<p class="about-mac-footer">I WORK WITH YOU, NOT FOR YOU</p>' +
      "</div>";
  }

  function renderResume(data) {
    var basics = data.basics || {};
    var jobs = (data.work || []).filter(function (item) { return item.name !== "Freelance"; })
      .sort(function (a, b) { return String(b.startDate || "").localeCompare(String(a.startDate || "")); });
    var freelance = (data.work || []).filter(function (item) { return item.name === "Freelance"; });
    var work = jobs.concat(freelance).map(function (item) {
      var url = safeUrl(item.url);
      return '' +
        '<article class="entry">' +
          '<div class="entry-top"><div>' +
            '<h3 class="entry-title">' + escapeHtml(item.name) + "</h3>" +
            (item.position ? '<p class="entry-role">' + escapeHtml(item.position) + "</p>" : "") +
            (url ? '<a class="entry-url" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.url) + "</a>" : "") +
          "</div><p class=\"entry-date\">" + escapeHtml(formatRange(item.startDate, item.endDate)) + "</p></div>" +
          (item.summary ? '<p class="entry-summary">' + escapeHtml(item.summary) + "</p>" : "") +
          bulletList(item.highlights, highlightHtml) +
        "</article>";
    }).join("");

    var education = (data.education || []).map(function (item) {
      return '' +
        '<article class="entry"><div class="entry-top"><div>' +
          '<h3 class="entry-title">' + escapeHtml(item.institution) + "</h3>" +
          '<p class="entry-role">' + escapeHtml(item.area) + " - " + escapeHtml(item.studyType) + "</p>" +
        '</div><p class="entry-date">' + escapeHtml(formatRange(item.startDate, item.endDate)) + "</p></div>" +
        bulletList(item.courses, escapeHtml) +
        "</article>";
    }).join("");

    var skills = (data.skills || []).map(function (skill) {
      var names = (skill.keywords || []).filter(function (keyword) { return typeof keyword === "string"; });
      return '<section class="skill-card"><h4>' + escapeHtml(skill.name) + '</h4><div class="tags">' +
        names.map(function (keyword) { return '<span class="tag">' + escapeHtml(keyword) + "</span>"; }).join("") +
        "</div></section>";
    }).join("");

    var projects = (data.projects || []).map(function (project) {
      return '' +
        '<article class="entry"><div class="entry-top"><div>' +
          '<h3 class="entry-title">' + escapeHtml(project.name) + "</h3>" +
          projectSiteHtml(project) +
        '</div><p class="entry-date">' + escapeHtml(formatRange(project.startDate, project.endDate)) + "</p></div>" +
        (project.description ? '<p class="entry-summary">' + escapeHtml(project.description) + "</p>" : "") +
        bulletList(project.highlights, escapeHtml) +
        "</article>";
    }).join("");

    var volunteer = (data.volunteer || []).map(function (item) {
      var url = safeUrl(item.url);
      return '' +
        '<article class="entry"><div class="entry-top"><div>' +
          '<h3 class="entry-title">' + escapeHtml(item.organization) + "</h3>" +
          '<p class="entry-role">' + escapeHtml(item.position) + "</p>" +
          (url ? '<a class="entry-url" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.url) + "</a>" : "") +
        '</div><p class="entry-date">' + escapeHtml(formatRange(item.startDate, item.endDate)) + "</p></div>" +
        (item.summary ? '<p class="entry-summary">' + escapeHtml(item.summary) + "</p>" : "") +
        bulletList(item.highlights, function (link) {
          var href = safeUrl(link);
          return href
            ? '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(link) + "</a>"
            : escapeHtml(link);
        }) +
        "</article>";
    }).join("");

    var publications = (data.publications || []).map(function (item) {
      var href = safeUrl(item.url);
      var release = item.releaseDate ? formatDate(item.releaseDate) : "";
      return '' +
        '<article class="entry"><div class="entry-top"><div>' +
          '<h3 class="entry-title">' + escapeHtml(item.name) + "</h3>" +
          '<p class="entry-role">' + escapeHtml(item.publisher) + "</p>" +
          (href ? '<a class="entry-url" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">View document</a>' : "") +
        "</div>" + (release ? '<p class="entry-date">' + escapeHtml(release) + "</p>" : "") + "</div>" +
        (item.summary ? '<p class="entry-summary">' + escapeHtml(item.summary) + "</p>" : "") +
        "</article>";
    }).join("");

    return '' +
      '<header class="resume-head">' +
        '<img class="resume-photo" src="' + escapeHtml(pictureSrc(basics.picture)) + '" alt="" width="96" height="96">' +
        '<div><h3 class="resume-name">' + escapeHtml(basics.name) + "</h3>" +
        '<p class="resume-label">' + escapeHtml(basics.label) + "</p>" +
        chipsHtml(basics) + profilesHtml(basics.profiles) + "</div></header>" +
      '<h3 class="block-title">About Me</h3><p class="about-summary">' + escapeHtml(basics.summary) + "</p>" +
      '<h3 class="block-title">Work Experience</h3>' + work +
      '<h3 class="block-title">Education</h3>' + education +
      '<h3 class="block-title">Skills</h3><div class="skills">' + skills + "</div>" +
      '<h3 class="block-title">Projects</h3>' + projects +
      '<h3 class="block-title">Volunteer</h3>' + volunteer +
      '<h3 class="block-title">Publications</h3>' + publications;
  }

  function showLoadError() {
    var message = "The resume data could not be loaded.";
    document.getElementById("about-body").textContent = message;
    document.getElementById("resume-body").textContent = message;
  }

  if (isDesktop()) openApp("about");
  else syncChrome();

  fetch(new URL("../resume.json", window.location.href).href)
    .then(function (response) {
      if (!response.ok) throw new Error("resume");
      return response.json();
    })
    .then(function (data) {
      document.getElementById("about-body").innerHTML = renderAbout(data);
      document.getElementById("resume-body").innerHTML = renderResume(data);
      var about = document.getElementById("window-about");
      if (isDesktop() && about.classList.contains("is-open") && !about.classList.contains("is-max") && about.dataset.moved !== "1") {
        placeWindow(about);
      }
    })
    .catch(showLoadError);
})();
