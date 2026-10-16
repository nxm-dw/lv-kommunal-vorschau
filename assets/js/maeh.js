/* =============================================================================
   LV Kommunal – Mäharbeiten
   Leistungsfinder (Tabs), Markierung "heute" im Grünjahr und der
   Anfrage-Baukasten, der eine fertige E-Mail vorbereitet. Es wird nichts
   übertragen oder gespeichert: Die Angaben bleiben im Browser.
   ============================================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------- Leistungsfinder */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".finder-tab"));
  function zeige(tab, fokus) {
    tabs.forEach(function (t) {
      var an = t === tab;
      t.setAttribute("aria-selected", String(an));
      t.tabIndex = an ? 0 : -1;
      var feld = document.getElementById(t.getAttribute("aria-controls"));
      if (feld) feld.classList.toggle("aktiv", an);
    });
    if (fokus) tab.focus();
  }
  if (tabs.length) {
    document.documentElement.classList.add("finder-an");
    zeige(tabs[0], false);
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { zeige(t, false); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); zeige(n, true); }
      });
    });
  }

  /* --------------------------------------------------------------- Grünjahr */
  var jahr = document.getElementById("jahr-plan");
  if (jahr) {
    var jetzt = new Date();
    var m = jetzt.getMonth() + 1;
    var tageImMonat = new Date(jetzt.getFullYear(), m, 0).getDate();
    var anteil = (m - 1 + (jetzt.getDate() - .5) / tageImMonat) / 12;
    jahr.querySelectorAll(".jahr-spur, .jahr-monate").forEach(function (spur) {
      var strich = document.createElement("span");
      strich.className = "jahr-strich";
      strich.setAttribute("aria-hidden", "true");
      strich.style.setProperty("--anteil", anteil.toFixed(4));
      spur.appendChild(strich);
    });
    var monat = jahr.querySelector('.jahr-monat[data-monat="' + m + '"]');
    if (monat) monat.classList.add("jahr-monat--jetzt");

    var namen = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    var aktiv = [];
    jahr.querySelectorAll(".jahr-zeile").forEach(function (z) {
      var drin = z.getAttribute("data-spannen").split(";").some(function (sp) {
        var t = sp.split("-"); return m >= +t[0] && m <= +t[1];
      });
      z.classList.toggle("jahr-zeile--jetzt", drin);
      if (drin) aktiv.push(z.querySelector(".jahr-name strong").textContent);
    });
    var satz = document.getElementById("jahr-jetzt");
    if (satz) {
      satz.textContent = "";
      var b = document.createElement("strong");
      b.textContent = "Jetzt im " + namen[m - 1] + ": ";
      satz.appendChild(b);
      satz.appendChild(document.createTextNode(aktiv.length ? aktiv.join(" · ") : "Keine Mäh- oder Schnittarbeiten, im Winter räumen und streuen wir."));
      satz.hidden = false;
    }
  }

  /* ----------------------------------------------------- Anfrage-Baukasten */
  var form = document.getElementById("bk-formular");
  if (!form) return;
  var senden = document.getElementById("bk-senden");
  var ziel = {
    leistung: document.getElementById("bk-z-leistung"),
    schnittgut: document.getElementById("bk-z-schnittgut"),
    zeitraum: document.getElementById("bk-z-zeitraum"),
    strecke: document.getElementById("bk-z-strecke")
  };
  function werte(name, attr) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (i) { return attr ? i.getAttribute(attr) : i.value; });
  }
  function setze(el, text, leer) {
    el.textContent = text || leer;
    el.classList.toggle("leer", !text);
  }
  function aktualisieren() {
    var leistungen = werte("leistung", "data-name");
    var schnitt = werte("schnittgut")[0] || "";
    var zeit = werte("zeitraum");
    var strecke = form.elements.strecke.value.trim();
    var auftraggeber = form.elements.auftraggeber.value.trim();
    setze(ziel.leistung, leistungen.join(", "), "Noch nichts gewählt");
    setze(ziel.schnittgut, schnitt === "Noch offen" ? "" : schnitt, "Noch offen");
    setze(ziel.zeitraum, zeit.join(", "), "Nach Absprache");
    setze(ziel.strecke, strecke.length > 90 ? strecke.slice(0, 88) + " …" : strecke, "Noch nicht angegeben");

    var zeilen = [
      "Guten Tag,", "",
      "wir möchten ein Angebot für Mäharbeiten anfragen.", "",
      "Leistung: " + (leistungen.join(", ") || "noch offen"),
      "Schnittgut: " + (schnitt || "noch offen"),
      "Zeitraum: " + (zeit.join(", ") || "nach Absprache"),
      "Strecke, Los oder Lage: " + (strecke || "folgt"),
      "Auftraggeber: " + (auftraggeber || "folgt"), "",
      "Bitte melden Sie sich mit einer Einschätzung und einem Angebot.", "",
      "Mit freundlichen Grüßen"
    ];
    var betreff = "Anfrage Mäharbeiten" + (leistungen.length ? ": " + leistungen.join(", ") : "");
    senden.href = "mailto:service@lvk-winterdienst.de?subject=" + encodeURIComponent(betreff) +
      "&body=" + encodeURIComponent(zeilen.join("\n"));
    senden.classList.toggle("bereit", leistungen.length > 0);
  }
  form.addEventListener("input", aktualisieren);
  form.addEventListener("change", aktualisieren);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  aktualisieren();

  /* Aus dem Leistungsfinder in die Anfrage übernehmen */
  document.querySelectorAll(".finder-merken").forEach(function (k) {
    k.addEventListener("click", function () {
      var box = form.querySelector('input[name="leistung"][value="' + k.getAttribute("data-leistung") + '"]');
      if (box) { box.checked = true; aktualisieren(); }
      var sparsam = matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("kontakt").scrollIntoView({ behavior: sparsam ? "auto" : "smooth" });
      if (box) setTimeout(function () { box.focus({ preventScroll: true }); }, sparsam ? 0 : 600);
    });
  });
})();
