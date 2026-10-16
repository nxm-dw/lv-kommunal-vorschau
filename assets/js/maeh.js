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

  /* ------------------------------------------------ Baukasten als Funnel
     Ohne Skript stehen alle Fragen untereinander. Mit Skript ist immer nur
     ein Schritt sichtbar, dazu Fortschritt, Zurück und Weiter. Das Markup
     bleibt unverändert, Steuerung und Abschluss entstehen hier im DOM.     */
  var sparsamF = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var schritte = Array.prototype.slice.call(form.children).filter(function (el) {
    return el.classList.contains("bk-gruppe");
  });
  var NAMEN = ["Leistung", "Schnittgut", "Zeitraum", "Strecke", "Absenden"];

  function neu(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text) el.textContent = text;
    return el;
  }
  var PFEIL = '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M9.5 1L14.5 6L9.5 11M14 6H1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* Schritt 5: Abschluss mit kompakter Zusammenfassung (mobil) und Absenden */
  var abschluss = neu("div", "bk-gruppe bk-abschluss");
  var aTitel = neu("p", "bk-legende");
  var aNr = neu("span", "bk-schritt", "5");
  aNr.setAttribute("aria-hidden", "true");
  aTitel.appendChild(aNr);
  aTitel.appendChild(document.createTextNode("Ihre Anfrage ist\u00a0fertig"));
  abschluss.appendChild(aTitel);
  abschluss.appendChild(neu("p", "bk-abschluss-text", "Prüfen Sie die Angaben und öffnen Sie die Anfrage als E-Mail. Ändern können Sie vor dem Senden noch\u00a0alles."));
  var aListe = neu("dl", "bk-abschluss-liste");
  var spiegel = {};
  ["leistung", "schnittgut", "zeitraum", "strecke"].forEach(function (k, i) {
    var zeile = neu("div");
    zeile.appendChild(neu("dt", "", NAMEN[i]));
    spiegel[k] = neu("dd");
    zeile.appendChild(spiegel[k]);
    aListe.appendChild(zeile);
  });
  abschluss.appendChild(aListe);
  var aSenden = senden.cloneNode(true);
  aSenden.removeAttribute("id");
  aSenden.classList.add("bk-abschluss-senden");
  abschluss.appendChild(aSenden);
  form.appendChild(abschluss);
  schritte.push(abschluss);

  /* Fortschritt oben */
  var leiste = neu("div", "bk-fortschritt");
  var status = neu("p", "bk-status");
  status.setAttribute("aria-live", "polite");
  var punkte = neu("ol", "bk-punkte");
  var punktKnoepfe = NAMEN.map(function (n, i) {
    var li = neu("li");
    var b = neu("button", "bk-punkt");
    b.type = "button";
    b.appendChild(neu("span", "bk-punkt-nr", String(i + 1)));
    b.appendChild(neu("span", "bk-punkt-name", n));
    b.addEventListener("click", function () { if (!b.disabled) zeigeSchritt(i); });
    li.appendChild(b);
    punkte.appendChild(li);
    return b;
  });
  leiste.appendChild(status);
  leiste.appendChild(punkte);
  form.insertBefore(leiste, form.firstChild);

  /* Zurück und Weiter unten */
  var steuer = neu("div", "bk-steuer");
  var zurueck = neu("button", "bk-zurueck", "Zurück");
  zurueck.type = "button";
  var weiter = neu("button", "bk-weiter");
  weiter.type = "button";
  weiter.innerHTML = "<span>Weiter</span>" + PFEIL;
  var hinweis = neu("p", "bk-pflicht", "Bitte wählen Sie mindestens eine\u00a0Leistung.");
  hinweis.id = "bk-pflicht";
  hinweis.hidden = true;
  hinweis.setAttribute("role", "alert");
  steuer.appendChild(zurueck);
  steuer.appendChild(hinweis);
  steuer.appendChild(weiter);
  form.appendChild(steuer);

  var schrittNr = 0, weitester = 0;
  function leistungGewaehlt() { return werte("leistung").length > 0; }
  function spiegeln() {
    Object.keys(spiegel).forEach(function (k) {
      spiegel[k].textContent = ziel[k].textContent;
      spiegel[k].classList.toggle("leer", ziel[k].classList.contains("leer"));
    });
    aSenden.href = senden.href;
    aSenden.classList.toggle("bereit", senden.classList.contains("bereit"));
    weiter.setAttribute("aria-disabled", String(schrittNr === 0 && !leistungGewaehlt()));
    if (leistungGewaehlt()) hinweis.hidden = true;
  }
  function zeigeSchritt(n, fokus) {
    var richtung = n >= schrittNr ? "vor" : "zurueck";
    schrittNr = n;
    weitester = Math.max(weitester, n);
    schritte.forEach(function (s, i) {
      var an = i === n;
      s.classList.toggle("bk-aktiv", an);
      s.classList.remove("bk-vor", "bk-zurueck");
      if (an && !sparsamF && fokus !== false) {
        void s.offsetWidth;
        s.classList.add("bk-" + richtung);
      }
    });
    punktKnoepfe.forEach(function (b, i) {
      b.classList.toggle("ist-aktiv", i === n);
      b.classList.toggle("ist-fertig", i < n || (i <= weitester && i !== n));
      b.disabled = i > weitester || (i > 0 && !leistungGewaehlt());
      if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    punkte.style.setProperty("--fortschritt", String(n / (schritte.length - 1)));
    status.textContent = "Schritt " + (n + 1) + " von " + schritte.length + ": " + NAMEN[n];
    zurueck.hidden = n === 0;
    weiter.hidden = n === schritte.length - 1;
    hinweis.hidden = true;
    form.classList.toggle("bk-am-ende", n === schritte.length - 1);
    spiegeln();
    if (fokus !== false) {
      var titel = schritte[n].querySelector("legend, .bk-legende");
      if (titel) {
        titel.setAttribute("tabindex", "-1");
        titel.focus({ preventScroll: true });
      }
      var oben = form.getBoundingClientRect().top;
      if (oben < 70 || oben > innerHeight * .6) {
        scrollTo({ top: scrollY + oben - 110, behavior: sparsamF ? "auto" : "smooth" });
      }
    }
  }
  function vor() {
    if (schrittNr === 0 && !leistungGewaehlt()) {
      hinweis.hidden = false;
      weiter.setAttribute("aria-describedby", "bk-pflicht");
      return;
    }
    if (schrittNr < schritte.length - 1) zeigeSchritt(schrittNr + 1);
  }
  weiter.addEventListener("click", vor);
  zurueck.addEventListener("click", function () { if (schrittNr > 0) zeigeSchritt(schrittNr - 1); });
  form.addEventListener("input", spiegeln);
  form.addEventListener("change", spiegeln);

  /* Einfachauswahl beim Schnittgut: nach kurzer Pause weiter */
  var auto;
  form.querySelectorAll('input[name="schnittgut"]').forEach(function (r) {
    r.addEventListener("click", function () {
      clearTimeout(auto);
      auto = setTimeout(function () { if (schrittNr === 1) zeigeSchritt(2); }, sparsamF ? 150 : 420);
    });
  });
  /* Enter im einzeiligen Feld geht weiter statt abzusenden */
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type === "text") {
      e.preventDefault();
      vor();
    }
  });

  form.classList.add("bk-funnel");
  form.closest(".bk").classList.add("bk--funnel");
  /* Auf Leistungsseiten ist die Leistung schon gewählt: Start bei Schritt 2 */
  zeigeSchritt(form.getAttribute("data-vorwahl") && leistungGewaehlt() ? 1 : 0, false);

  /* Aus dem Leistungsfinder in die Anfrage übernehmen */
  document.querySelectorAll(".finder-merken").forEach(function (k) {
    k.addEventListener("click", function () {
      var box = form.querySelector('input[name="leistung"][value="' + k.getAttribute("data-leistung") + '"]');
      if (box) { box.checked = true; aktualisieren(); }
      document.getElementById("kontakt").scrollIntoView({ behavior: sparsamF ? "auto" : "smooth" });
      zeigeSchritt(1, false);
      setTimeout(function () {
        var t = schritte[1].querySelector("legend");
        t.setAttribute("tabindex", "-1");
        t.focus({ preventScroll: true });
      }, sparsamF ? 0 : 600);
    });
  });
})();
