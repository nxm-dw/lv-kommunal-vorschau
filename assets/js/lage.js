/* LV Kommunal – Einsatzlage (ersetzt das Glätte-Radar, 24.11.2026).
   Liest eine kleine JSON-Datei mit dem Stand aus der GPS-App und dem
   Winterdienst-Wetterdienst und zeigt daraus:
     - ob gerade ein Einsatz läuft,
     - wie viele Fahrzeuge unterwegs sind, nach Gebieten (keine Positionen),
     - die Einsatzwahrscheinlichkeit der nächsten Nächte.
   In der Vorschau kommen Beispieldaten aus assets/daten/lage.json. Live liefert
   später ein Skript auf dem Server dieselbe Struktur (z. B. lage.php), das die
   App abfragt. Der API-Schlüssel bleibt dabei auf dem Server.

   Format:
   { "stand": ISO-Zeit, "demo": true|false,
     "einsatz": "laeuft" | "bereitschaft" | "keiner", "seit": "02:40",
     "fahrzeuge": { "unterwegs": 17, "gesamt": 29 },
     "gebiete": [ { "name": "Taunusstein", "unterwegs": 5 }, ... ],
     "prognose": [ { "tag": "Heute Nacht", "prozent": 80, "text": "Reifglätte ab 3 Uhr" }, ... ] } */
(function () {
  "use strict";
  var box = document.getElementById("lage");
  var aus = document.getElementById("lage-inhalt");
  var standEl = document.getElementById("lage-stand");
  var QUELLE = (box && box.getAttribute("data-quelle")) || "assets/daten/lage.json";
  var gebiet = box ? (box.getAttribute("data-gebiet") || "") : "";

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var STUFE = {
    laeuft:       { schl: "erhoeht", wort: "Einsatz läuft", hero: "Winterdienst im Einsatz" },
    bereitschaft: { schl: "gering",  wort: "Bereitschaft",  hero: "Winterdienst in Bereitschaft" },
    keiner:       { schl: "keins",   wort: "Kein Einsatz",  hero: "Aktuell kein Einsatz" }
  };

  function uhrzeit(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "–";
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
  }

  function zeige(d) {
    var s = STUFE[d.einsatz] || STUFE.keiner;
    var f = d.fahrzeuge || { unterwegs: 0, gesamt: 0 };
    var gebiete = d.gebiete || [];
    var max = Math.max.apply(null, gebiete.map(function (g) { return g.unterwegs; }).concat([1]));
    var aktiv = gebiete.filter(function (g) { return g.unterwegs > 0; }).length;
    var html =
      '<div class="radar-stufe">' +
        '<span class="radar-punkt" data-stufe="' + s.schl + '"></span>' +
        '<span class="radar-wort">' + esc(s.wort) + "</span>" +
        (d.seit && d.einsatz === "laeuft" ? '<span class="radar-ort">seit ' + esc(d.seit) + " Uhr</span>" : "") +
      "</div>" +
      '<dl class="radar-werte">' +
        '<div class="radar-wert"><dt>Fahrzeuge unterwegs</dt><dd>' + esc(f.unterwegs) + ' <small>von ' + esc(f.gesamt) + "</small></dd></div>" +
        '<div class="radar-wert"><dt>Gebiete aktiv</dt><dd>' + aktiv + ' <small>von ' + gebiete.length + "</small></dd></div>" +
      "</dl>";
    if (gebiete.length) {
      html += '<ul class="lage-gebiete">' + gebiete.map(function (g) {
        var hier = gebiet && g.name === gebiet;
        return '<li' + (hier ? ' class="ist-hier"' : "") + '><span class="lage-name">' + esc(g.name) + (hier ? " <small>Ihr Ort</small>" : "") + "</span>" +
          '<span class="lage-balken" aria-hidden="true"><span style="width:' + Math.round(g.unterwegs / max * 100) + '%"></span></span>' +
          '<span class="lage-zahl">' + esc(g.unterwegs) + "</span></li>";
      }).join("") + "</ul>";
    }
    if (d.prognose && d.prognose.length) {
      html += '<p class="lage-kopf">Einsatzwahrscheinlichkeit</p><ol class="lage-prognose">' + d.prognose.map(function (p) {
        var stufe = p.prozent >= 70 ? "hoch" : p.prozent >= 40 ? "mittel" : "niedrig";
        return '<li data-stufe="' + stufe + '"><span class="lage-tag">' + esc(p.tag) + "</span>" +
          '<span class="lage-prozent">' + esc(p.prozent) + " %</span>" +
          '<span class="lage-balken" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, p.prozent)) + '%"></span></span>' +
          '<span class="lage-text">' + esc(p.text || "") + "</span></li>";
      }).join("") + "</ol>";
    }
    if (d.demo) html += '<p class="lage-demo">Vorschau mit Beispieldaten. Die Anbindung an unsere GPS-App&nbsp;folgt.</p>';
    if (aus) aus.innerHTML = html;
    if (standEl) standEl.textContent = uhrzeit(d.stand);

    /* Lebendzeichen im Hero der Winterdienst-Startseite */
    var kasten = document.getElementById("hero-live");
    var punkt = document.getElementById("hero-live-punkt");
    var text = document.getElementById("hero-live-text");
    if (kasten && punkt && text) {
      var zusatz = d.einsatz === "laeuft" ? f.unterwegs + " Fahrzeuge unterwegs"
        : (d.prognose && d.prognose[0] ? d.prognose[0].tag + " " + d.prognose[0].prozent + " % Einsatzwahrscheinlichkeit" : "");
      punkt.setAttribute("data-stufe", s.schl);
      text.innerHTML = esc(s.hero) + (zusatz ? '<span class="hero-live-ort"> · ' + esc(zusatz) + "</span>" : "");
      kasten.setAttribute("data-da", "true");
    }
  }

  if (!box && !document.getElementById("hero-live")) return;
  fetch(QUELLE, { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(zeige)
    .catch(function () {
      if (aus) aus.innerHTML = '<p class="fehler">Die Einsatzlage ist gerade nicht abrufbar. Rufen Sie uns gern an:&nbsp;0800&nbsp;811&nbsp;88&nbsp;00.</p>';
    });
})();
