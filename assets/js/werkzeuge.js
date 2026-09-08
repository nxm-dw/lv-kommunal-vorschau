/* =============================================================================
   LV Kommunal – Werkzeuge
   Glätte-Radar, Einsatznachweis, Fuhrpark, Räumpflicht-Check, Formulare.
   Alle genutzten Dienste sind kostenfrei und benötigen keinen Schlüssel.
   ============================================================================= */
(function () {
  "use strict";

  /* Solange kein Serverskript hinterlegt ist, bestätigen die Formulare nur.
     Nach dem Hochladen von kontakt.php auf false setzen. */
  var DEMO = true;
  var ENDPUNKT = "kontakt.php";

  var PHOTON = "https://photon.komoot.io/api/";
  var METEO = "https://api.open-meteo.com/v1/forecast";
  var OPENPLZ = "https://openplzapi.org/de/Localities";

  /* Photon liefert zu einer nackten Postleitzahl gern den Ortsteil – zu 65232
     etwa "Wehen" statt "Taunusstein". Die amtliche Zuordnung holen wir uns
     deshalb bei OpenPLZ (offene Daten des Statistischen Bundesamts). */
  var plzMerker = {};

  LVK.ortZuPlz = function (plz) {
    plz = String(plz).replace(/\D/g, "");
    if (plz.length !== 5) return Promise.resolve(null);
    if (plzMerker[plz] !== undefined) return Promise.resolve(plzMerker[plz]);

    return fetch(OPENPLZ + "?postalCode=" + plz)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (liste) {
        var sauber = function (n) {
          return String(n).replace(
            /,\s*(Stadt|Gemeinde|Hochschulstadt|Landeshauptstadt|Universitätsstadt|Markt|Kreisstadt)$/i, "").trim();
        };
        var gemeinden = [];
        liste.forEach(function (x) {
          var n = sauber((x.municipality && x.municipality.name) || x.name);
          if (n && gemeinden.indexOf(n) === -1) gemeinden.push(n);
        });
        /* Nur bei einer einzigen Gemeinde ist die Zuordnung eindeutig. 65510
           etwa gehört zu Hünstetten UND Idstein – dort wäre jede Wahl geraten,
           deshalb bleibt es in solchen Fällen bei dem, was der Nutzer gewählt hat. */
        var name = gemeinden.length === 1 ? gemeinden[0] : null;
        plzMerker[plz] = name;
        return name;
      })
      .catch(function () { plzMerker[plz] = null; return null; });
  };

  var BEZUG = { lat: 50.14, lon: 8.15 };   // Taunusstein, Ortsbezug fuer die Suche

  var RANG = { kern: 0, pruefen: 1, aussen: 2 };

  /* Maskiert alles, was aus fremder Hand kommt – Antworten der Geocoder und
     alles, was der Nutzer eintippt. Ohne das landet fremdes Markup im Dokument. */
  LVK.sicher = function (wert) {
    return String(wert === null || wert === undefined ? "" : wert)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  LVK.suchen = function (frage, gewuenscht) {
    var u = PHOTON + "?q=" + encodeURIComponent(frage) +
      "&limit=20&lang=de&lat=" + BEZUG.lat + "&lon=" + BEZUG.lon +
      "&location_bias_scale=8";
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error("Geocoder nicht erreichbar");
      return r.json();
    }).then(function (j) {
      var treffer = (j.features || []).filter(function (f) {
        return f.properties.countrycode === "DE";
      });

      /* Was im Einsatzgebiet liegt, gehört nach oben. Innerhalb einer Gruppe
         bleibt die Reihenfolge des Geocoders erhalten. */
      return treffer
        .map(function (f, i) {
          var g = LVK.gebiet(f.properties.postcode);
          return { f: f, rang: g ? RANG[g.status] : 3, i: i };
        })
        .sort(function (a, b) { return a.rang - b.rang || a.i - b.i; })
        .map(function (x) { return x.f; })
        .slice(0, gewuenscht || 5);
    });
  };

  LVK.plzVon = function (p) {
    if (p.postcode) return p.postcode;
    /* Bei Treffern vom Typ Postleitzahl steht der Code im Feld "name". */
    return /^\d{5}$/.test(p.name || "") ? p.name : "";
  };

  LVK.ortVon = function (p) {
    var eigen = /^\d{5}$/.test(p.name || "") ? "" : (p.name || "");
    /* Der Landkreis steht erst ganz hinten – er ist kein Ortsname. */
    return p.city || eigen || p.county || p.state || "";
  };

  LVK.beschriften = function (p) {
    var plz = LVK.plzVon(p);
    var ort = LVK.ortVon(p);
    var t = [];
    if (p.street) {
      t.push(p.street + (p.housenumber ? " " + p.housenumber : ""));
    } else if (p.name && p.name !== ort && !/^\d{5}$/.test(p.name)) {
      t.push(p.name);
    }
    var zeile = [plz, ort].filter(Boolean).join(" ");
    if (zeile) t.push(zeile);
    if (!ort && p.state) t.push(p.state);
    return t.join(", ");
  };

  /* ================================================================ Autofill
     Vorschlagsliste unter einem Eingabefeld. Bedienbar mit Maus und Tastatur:
     Pfeiltasten wählen, Enter übernimmt, Escape schließt.                     */
  LVK.autofill = function (eingabe, beiWahl, mitGebiet) {
    var huelle = eingabe.closest(".feld-mit-liste");
    if (!huelle) {
      huelle = document.createElement("div");
      huelle.className = "feld-mit-liste";
      eingabe.parentNode.insertBefore(huelle, eingabe);
      huelle.appendChild(eingabe);
    }

    var liste = document.createElement("div");
    liste.className = "vorschlaege";
    liste.id = eingabe.id + "-vorschlaege";
    liste.setAttribute("role", "listbox");
    liste.hidden = true;
    huelle.appendChild(liste);

    eingabe.setAttribute("role", "combobox");
    eingabe.setAttribute("aria-autocomplete", "list");
    eingabe.setAttribute("aria-expanded", "false");
    eingabe.setAttribute("aria-controls", liste.id);
    eingabe.setAttribute("autocomplete", "off");

    var treffer = [], gewaehlt = -1, warten = null, letzte = "";

    function zu() {
      liste.hidden = true;
      eingabe.setAttribute("aria-expanded", "false");
      eingabe.removeAttribute("aria-activedescendant");
      gewaehlt = -1;
    }

    function markiere() {
      liste.querySelectorAll(".vorschlag").forEach(function (k, i) {
        var an = i === gewaehlt;
        k.setAttribute("aria-selected", String(an));
        if (an) {
          eingabe.setAttribute("aria-activedescendant", k.id);
          k.scrollIntoView({ block: "nearest" });
        }
      });
    }

    function zeige(liste_) {
      treffer = liste_;
      if (!treffer.length) { zu(); return; }
      liste.innerHTML = treffer.map(function (f, i) {
        var p = f.properties;
        var haupt = [p.street ? p.street + (p.housenumber ? " " + p.housenumber : "") : (p.name || "")]
          .filter(Boolean).join("");
        if (!haupt) haupt = p.city || p.county || p.state || "";
        var unten = [p.postcode, p.city || p.county, p.state].filter(Boolean).join(" · ");
        var g = mitGebiet ? LVK.gebiet(p.postcode) : null;
        var marke = g
          ? '<span class="vorschlag-gebiet" data-status="' + g.status + '">' +
            (g.status === "kern" ? "Kerngebiet" : g.status === "pruefen" ? "Randgebiet" : "außerhalb") + "</span>"
          : "";
        return '<button type="button" class="vorschlag" role="option" aria-selected="false" ' +
          'id="' + liste.id + "-" + i + '" data-i="' + i + '">' +
          '<span class="vorschlag-ikon">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
            '<path d="M8 15s5.2-4.6 5.2-8.4A5.2 5.2 0 0 0 2.8 6.6C2.8 10.4 8 15 8 15Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<circle cx="8" cy="6.5" r="1.9" stroke="currentColor" stroke-width="1.4"/></svg>' +
          "</span>" +
          '<span class="vorschlag-text"><strong>' + LVK.sicher(haupt) +
            "</strong><small>" + LVK.sicher(unten) + "</small></span>" +
          marke + "</button>";
      }).join("");
      liste.hidden = false;
      eingabe.setAttribute("aria-expanded", "true");
      gewaehlt = -1;

      /* Nach oben aufklappen, wenn unten kein Platz mehr ist */
      var r = eingabe.getBoundingClientRect();
      var platzUnten = innerHeight - r.bottom;
      var noetig = Math.min(liste.scrollHeight, 302) + 14;
      var nachOben = platzUnten < noetig && r.top > noetig;
      liste.style.inset = nachOben ? "auto 0 calc(100% + 6px) 0" : "calc(100% + 6px) 0 auto";
    }

    function suche() {
      var q = eingabe.value.trim();
      if (q.length < 3 || q === letzte) { if (q.length < 3) zu(); return; }
      letzte = q;
      LVK.suchen(q, 6).then(zeige).catch(zu);
    }

    eingabe.addEventListener("input", function () {
      clearTimeout(warten);
      warten = setTimeout(suche, 280);
    });

    eingabe.addEventListener("keydown", function (e) {
      if (liste.hidden) {
        if (e.key === "ArrowDown") { clearTimeout(warten); letzte = ""; suche(); }
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); gewaehlt = (gewaehlt + 1) % treffer.length; markiere(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); gewaehlt = (gewaehlt - 1 + treffer.length) % treffer.length; markiere(); }
      else if (e.key === "Enter" && gewaehlt > -1) { e.preventDefault(); waehle(gewaehlt); }
      else if (e.key === "Escape") { zu(); }
    });

    liste.addEventListener("mousedown", function (e) {
      var k = e.target.closest("[data-i]");
      if (!k) return;
      e.preventDefault();
      waehle(Number(k.getAttribute("data-i")));
    });

    eingabe.addEventListener("blur", function () { setTimeout(zu, 140); });

    function waehle(i) {
      var f = treffer[i];
      if (!f) return;
      eingabe.value = LVK.beschriften(f.properties);
      letzte = eingabe.value;
      zu();
      beiWahl(f);
    }

    return { schliessen: zu };
  };

  /* ========================================================== Glätte-Radar */
  var radarForm = document.getElementById("radar-form");
  var radarAus = document.getElementById("radar-ergebnis");
  var radarStand = document.getElementById("radar-stand");

  var STUFEN = [
    { wort: "Kein Glätterisiko", schl: "keins" },
    { wort: "Geringes Risiko", schl: "gering" },
    { wort: "Erhöhtes Risiko", schl: "erhoeht" },
    { wort: "Hohes Glätterisiko", schl: "hoch" }
  ];

  function bewerteStunde(w) {
    var T = w.t, Td = w.td, Ts = (w.ts === null || w.ts === undefined) ? w.t - 1 : w.ts;
    var P = w.p || 0, S = w.s || 0, RH = w.rh || 0;
    var s = 0;
    if (S > 0.05 && T <= 2) s = Math.max(s, 3);
    if (P > 0.1 && Ts <= 0.5) s = Math.max(s, 3);
    if (P > 0.1 && T <= 1.5) s = Math.max(s, 2);
    if (Ts <= 0 && Td >= Ts - 0.6 && RH >= 88 && P <= 0.05) s = Math.max(s, 2);
    if (Ts <= 0.5 && T <= 1) s = Math.max(s, 1);
    return s;
  }

  /* Eigene, für Menschen geschriebene Meldungen von Systemfehlern trennen */
  function eigenerFehler(text) {
    var e = new Error(text);
    e.eigen = true;
    return e;
  }

  function zahl(n, k) {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: k === undefined ? 0 : k,
      maximumFractionDigits: k === undefined ? 0 : k
    }).format(n);
  }

  function uhr(iso) { return iso.slice(11, 16); }

  function kurve(reihe) {
    var w = 560, h = 92, pad = 6;
    var werte = reihe.map(function (r) { return r.t; });
    var min = Math.min.apply(null, werte.concat([0]));
    var max = Math.max.apply(null, werte.concat([0]));
    if (max - min < 4) { max = min + 4; }
    var sx = function (i) { return pad + (i / (reihe.length - 1)) * (w - pad * 2); };
    var sy = function (v) { return h - pad - ((v - min) / (max - min)) * (h - pad * 2); };
    var d = reihe.map(function (r, i) { return (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(r.t).toFixed(1); }).join(" ");
    var flaeche = d + " L" + sx(reihe.length - 1).toFixed(1) + " " + (h - pad) + " L" + pad + " " + (h - pad) + " Z";
    var null_y = sy(0).toFixed(1);
    return '<svg class="radar-kurve" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Temperaturverlauf der nächsten 18 Stunden">' +
      '<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#009EE0" stop-opacity=".34"/>' +
      '<stop offset="100%" stop-color="#009EE0" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="0" y1="' + null_y + '" x2="' + w + '" y2="' + null_y + '" stroke="#5CC8F2" stroke-width="1" stroke-dasharray="4 4" opacity=".55"/>' +
      '<text x="4" y="' + (null_y - 5) + '" fill="#7E9BAD" font-size="10" font-family="monospace">0 °C</text>' +
      '<path d="' + flaeche + '" fill="url(#tg)"/>' +
      '<path d="' + d + '" fill="none" stroke="#5CC8F2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</svg>';
  }

  function zeigeRadar(ort, reihe, jetztT) {
    var punkte = reihe.map(bewerteStunde);
    var hoechst = Math.max.apply(null, punkte);
    var stufe = STUFEN[hoechst];

    var kritisch = [];
    punkte.forEach(function (p, i) { if (p >= 2) kritisch.push(i); });

    var minT = Math.min.apply(null, reihe.map(function (r) { return r.t; }));
    var minTs = Math.min.apply(null, reihe.map(function (r) {
      return (r.ts === null || r.ts === undefined) ? r.t - 1 : r.ts;
    }));
    var summeN = reihe.reduce(function (a, r) { return a + (r.p || 0); }, 0);

    var fenster;
    if (kritisch.length) {
      fenster = "Kritisch ab " + uhr(reihe[kritisch[0]].zeit) +
        " Uhr bis etwa " + uhr(reihe[kritisch[kritisch.length - 1]].zeit) + " Uhr.";
    } else if (hoechst === 1) {
      fenster = "Grenzwertig, aber kein durchgehendes Glättefenster in Sicht.";
    } else if (minT > 5) {
      fenster = 'Sommerlage. Zwischen Mai und Oktober sind unsere Maschinen am ' +
        '<a class="ton-eis" href="maeharbeiten.html">Straßenbegleitgrün</a> unterwegs.';
    } else {
      fenster = "In den nächsten 18 Stunden ist auf Ihren Flächen nichts zu erwarten.";
    }

    radarAus.innerHTML =
      '<div class="radar-stufe">' +
        '<span class="radar-punkt" data-stufe="' + stufe.schl + '"></span>' +
        '<span class="radar-wort">' + stufe.wort + '</span>' +
        '<span class="radar-ort">' + LVK.sicher(ort) + '</span>' +
      '</div>' +
      '<dl class="radar-werte">' +
        '<div class="radar-wert"><dt>Tiefste Luft</dt><dd>' + zahl(minT, 1) + ' °C</dd></div>' +
        '<div class="radar-wert"><dt>Tiefster Boden</dt><dd>' + zahl(minTs, 1) + ' °C</dd></div>' +
        '<div class="radar-wert"><dt>Niederschlag</dt><dd>' + zahl(summeN, 1) + ' Millimeter</dd></div>' +
      '</dl>' +
      '<p class="radar-fenster">' + fenster + '</p>' +
      kurve(reihe) +
      '<div class="radar-kurve-hinweis"><span>' + uhr(reihe[0].zeit) + '</span>' +
      '<span>Lufttemperatur, nächste 18 Stunden</span>' +
      '<span>' + uhr(reihe[reihe.length - 1].zeit) + '</span></div>';

    if (radarStand) {
      radarStand.textContent = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
    }

    if (hoechst >= 2 && kritisch.length) {
      zeigeWarnung(ort, stufe, uhr(reihe[kritisch[0]].zeit));
    }

    heroLebendzeichen(ort, stufe, jetztT, kritisch.length ? uhr(reihe[kritisch[0]].zeit) : null);
  }

  /* Kleines Lebendzeichen oben im Hero: derselbe Datenstand wie das Radar,
     nur auf einen Satz eingedampft. Die Gradzahl ist der Messwert der laufenden
     Stunde, nicht der Tiefstwert der Prognose – das stand vorher dort und las
     sich wie eine aktuelle Temperatur, war aber keine.
     Wird einmal gesetzt und bleibt dann stehen. */
  var heroSchonGesetzt = false;
  function heroLebendzeichen(ort, stufe, jetztT, ab) {
    if (heroSchonGesetzt) return;
    var kasten = document.getElementById("hero-live");
    var punkt = document.getElementById("hero-live-punkt");
    var text = document.getElementById("hero-live-text");
    if (!kasten || !punkt || !text) return;

    var kern, zusatz;
    if (stufe.schl === "hoch") {
      kern = "Glättewarnung"; zusatz = ort + (ab ? " ab " + ab : "");
    } else if (stufe.schl === "erhoeht") {
      kern = "Erhöhtes Glätterisiko"; zusatz = ort + (ab ? " ab " + ab : "");
    } else if (stufe.schl === "gering") {
      kern = "Geringes Glätterisiko"; zusatz = ort;
    } else {
      kern = "Aktuell kein Glätterisiko";
      zusatz = ort + (typeof jetztT === "number" ? ", jetzt " + zahl(jetztT, 0) + " °C" : "");
    }

    punkt.setAttribute("data-stufe", stufe.schl);
    /* Der Ort steht in einer eigenen Spanne – auf schmalen Geräten fällt er weg. */
    text.innerHTML = LVK.sicher(kern) +
      '<span class="hero-live-ort"> · ' + LVK.sicher(zusatz) + "</span>";
    kasten.setAttribute("data-da", "true");
    heroSchonGesetzt = true;
  }

  /* Ein Hinweisband ganz oben, sobald die Prognose kritisch wird.
     Wer es wegklickt, sieht es in dieser Sitzung nicht wieder. */
  function zeigeWarnung(ort, stufe, ab) {
    if (document.getElementById("warnband")) return;
    try { if (sessionStorage.getItem("lvk-warnung-zu") === "1") return; } catch (e) {}

    var band = document.createElement("div");
    band.className = "warnung";
    band.id = "warnband";
    band.setAttribute("role", "status");
    band.innerHTML =
      '<div class="wrap warnung-innen">' +
        '<span class="warnung-marke">' + (stufe.schl === "hoch" ? "Glättewarnung" : "Glätterisiko") + "</span>" +
        "<span>" + LVK.sicher(ort) + ": " + LVK.sicher(stufe.wort.toLowerCase()) +
          " ab etwa " + LVK.sicher(ab) + " Uhr. " +
        '<a href="#kontakt">Noch keinen Vertrag?</a></span>' +
        '<button class="warnung-zu" type="button" aria-label="Hinweis schließen">&times;</button>' +
      "</div>";
    document.body.insertBefore(band, document.body.firstChild);
    document.body.setAttribute("data-warnung", "true");

    var hoch = function () {
      document.documentElement.style.setProperty("--warnhoehe", band.offsetHeight + "px");
    };
    hoch();
    addEventListener("resize", hoch, { passive: true });

    band.querySelector(".warnung-zu").addEventListener("click", function () {
      band.remove();
      document.body.removeAttribute("data-warnung");
      document.documentElement.style.removeProperty("--warnhoehe");
      try { sessionStorage.setItem("lvk-warnung-zu", "1"); } catch (e) {}
    });
  }

  function ladeRadar(frage, vorgabe) {
    radarAus.innerHTML = '<p class="lade">Prognose wird geladen</p>';
    /* Stand des Feldes merken: Nur wenn seither niemand weitergetippt hat,
       darf der amtliche Name hineingeschrieben werden. */
    var feld = document.getElementById("radar-plz");
    var standBeimStart = feld ? feld.value : null;
    LVK.suchen(frage, 1).then(function (treffer) {
      if (!treffer.length) throw eigenerFehler("Diesen Ort finden wir nicht. Bitte Postleitzahl oder Ortsnamen prüfen.");
      var p = treffer[0].properties;
      var c = treffer[0].geometry.coordinates;
      var plz = LVK.plzVon(p) || (/^\d{5}$/.test(frage.trim()) ? frage.trim() : "");
      var name = vorgabe || [plz, LVK.ortVon(p)].filter(Boolean).join(" ");
      var u = METEO + "?latitude=" + c[1].toFixed(4) + "&longitude=" + c[0].toFixed(4) +
        "&hourly=temperature_2m,dew_point_2m,precipitation,snowfall,relative_humidity_2m,soil_temperature_0cm" +
        "&current=temperature_2m" +
        "&timezone=Europe%2FBerlin&forecast_days=2&models=icon_seamless";
      return fetch(u).then(function (r) {
        if (!r.ok) throw eigenerFehler("Wetterdaten sind gerade nicht erreichbar.");
        return r.json();
      }).then(function (j) {
        /* Ortsnamen amtlich nachschlagen, damit dort Taunusstein steht und
           nicht der Ortsteil Wehen. Klappt das nicht, bleibt es beim Photon-Namen. */
        /* Bei einer Adresse bleibt die Beschriftung so, wie sie gewählt wurde.
           Bei einem reinen Orts- oder Postleitzahltreffer setzen wir den
           amtlichen Gemeindenamen – sofern die Postleitzahl eindeutig ist. */
        if (p.street) return { name: vorgabe || name, wetter: j };

        return LVK.ortZuPlz(plz).then(function (amtlich) {
          if (!amtlich) return { name: vorgabe || name, wetter: j };
          return { name: plz + " " + amtlich, wetter: j, ersetzen: true };
        });
      });
    }).then(function (d) {
      var h = d.wetter.hourly;
      var jetzt = new Date();
      var start = 0;
      for (var i = 0; i < h.time.length; i++) {
        if (new Date(h.time[i]).getTime() >= jetzt.getTime() - 3600000) { start = i; break; }
      }
      var reihe = [];
      for (var k = start; k < Math.min(start + 18, h.time.length); k++) {
        reihe.push({
          zeit: h.time[k],
          t: h.temperature_2m[k],
          td: h.dew_point_2m[k],
          p: h.precipitation[k],
          s: h.snowfall[k],
          rh: h.relative_humidity_2m[k],
          ts: h.soil_temperature_0cm ? h.soil_temperature_0cm[k] : null
        });
      }
      if (!reihe.length) throw eigenerFehler("Für diesen Ort liegen gerade keine Stundenwerte vor.");
      if (d.ersetzen && feld && feld.value === standBeimStart) {
        feld.value = d.name;
      }
      /* Die Messung der laufenden Stunde. Fehlt sie, tut es der Stundenwert,
         mit dem die Reihe beginnt – der gilt für die aktuelle Stunde. */
      var jetztT = d.wetter.current && typeof d.wetter.current.temperature_2m === "number"
        ? d.wetter.current.temperature_2m
        : reihe[0].t;
      zeigeRadar(d.name, reihe, jetztT);
    }).catch(function (e) {
      /* Nie die rohe Browsermeldung zeigen – "Failed to fetch" hilft niemandem. */
      var text = e && e.eigen
        ? e.message
        : "Die Wetterdaten sind gerade nicht erreichbar. Versuchen Sie es später noch " +
          "einmal oder rufen Sie uns an: 0800 811 88 00.";
      radarAus.innerHTML = '<p class="fehler">' + LVK.sicher(text) + "</p>";
    });
  }

  if (radarForm) {
    radarForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ladeRadar(document.getElementById("radar-plz").value.trim());
    });
    LVK.autofill(document.getElementById("radar-plz"), function (f) {
      var beschriftung = LVK.beschriften(f.properties);
      ladeRadar(beschriftung, beschriftung);
    }, false);
    ladeRadar(radarForm.getAttribute("data-plz") || "65232");
  }

  /* ============================================ Hintergrundbilder (Stadtseiten)
     Als data-Attribut im Markup, hier in die CSSOM – so bleibt die
     Content-Security-Policy ohne 'unsafe-inline' bei style-src möglich. */
  document.querySelectorAll(".hero-bild[data-bild]").forEach(function (el) {
    var basis = el.getAttribute("data-bild");
    el.style.setProperty("background-image", "url('" + basis + ".jpg')");
    el.style.setProperty("background-image",
      "image-set(url('" + basis + ".webp') type('image/webp')," +
      "url('" + basis + ".jpg') type('image/jpeg'))");
  });

  /* ====================================================== Einsatznachweis
     Alle drei Beispielbelege stehen im Markup – so sind Protokollzeilen,
     Streumengen und Räumbreiten auch ohne JavaScript lesbar. Hier wird nur
     umgeschaltet und die GPS-Spur gezeichnet.                               */
  var belegAuswahl = document.getElementById("beleg-auswahl");
  var belegSaetze = [].slice.call(document.querySelectorAll(".beleg-satz"));

  belegSaetze.forEach(function (satz) {
    satz.querySelectorAll(".protokoll-zeile").forEach(function (z) {
      z.style.setProperty("--i", z.getAttribute("data-i") || "0");
    });
    var balken = satz.querySelector(".streu-balken[data-anteil]");
    if (balken) balken.style.setProperty("--anteil", balken.getAttribute("data-anteil") + "%");
    zeichneSpur(satz.querySelector(".beleg-spur"));
  });

  /* Der aufgezeichnete Weg über die Fläche, mit fahrendem Punkt */
  function zeichneSpur(karte) {
    if (!karte) return;
    var spur;
    try { spur = JSON.parse(karte.getAttribute("data-spur") || "[]"); } catch (e) { return; }
    if (!spur.length) return;
    var d = spur.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
    karte.innerHTML =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Aufgezeichnete GPS-Spur des Einsatzes">' +
        '<rect x="2" y="2" width="96" height="96" rx="3" fill="none" stroke="var(--raum-2)" stroke-width=".6"/>' +
        '<path d="' + d + '" fill="none" stroke="#D7E4EC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="spur-gefahren" d="' + d + '" fill="none" stroke="#009EE0" stroke-width="2.2" ' +
          'stroke-linecap="round" stroke-linejoin="round" pathLength="100"/>' +
        '<circle class="spur-punkt" r="2.6" fill="#009EE0" stroke="#fff" stroke-width="1">' +
          '<animateMotion dur="7s" repeatCount="indefinite" path="' + d + '"/></circle>' +
        '<circle cx="' + spur[0][0] + '" cy="' + spur[0][1] + '" r="2" fill="#4C8C3F"/>' +
      "</svg>";
  }

  /* Beim Umschalten springt display von none auf block – dadurch laufen die
     Protokollzeilen und der Streubalken von selbst wieder an. */
  function zeigeBeleg(schl) {
    var nummer = document.getElementById("beleg-id");
    belegSaetze.forEach(function (satz) {
      var an = satz.getAttribute("data-beleg") === schl;
      satz.hidden = !an;
      if (an && nummer) nummer.textContent = satz.getAttribute("data-id") || "";
    });
  }

  if (belegAuswahl) {
    belegAuswahl.addEventListener("click", function (e) {
      var k = e.target.closest("[data-beleg]");
      if (!k) return;
      belegAuswahl.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("aktiv", c === k); });
      zeigeBeleg(k.getAttribute("data-beleg"));
    });
  }

  /* ============================================================== Fuhrpark
     Die Karten stehen im HTML. Das Skript setzt nur noch die Balkenbreiten und
     Bilder (über die CSSOM, damit die Content-Security-Policy streng bleiben
     kann) und übernimmt das Filtern.                                          */
  var gitter = document.getElementById("fuhrpark-gitter");
  var fpFilter = document.getElementById("fuhrpark-filter");

  if (gitter) {
    gitter.querySelectorAll(".maschine").forEach(function (m) {
      var foto = m.querySelector(".maschine-foto[data-bild]");
      if (foto) {
        var basis = foto.getAttribute("data-bild");
        foto.style.setProperty("background-image", "url('assets/img/" + basis + ".jpg')");
        foto.style.setProperty("background-image",
          "image-set(url('assets/img/" + basis + ".webp') type('image/webp')," +
          "url('assets/img/" + basis + ".jpg') type('image/jpeg'))");
      }
      var balken = m.querySelector(".breite-balken[data-anteil]");
      if (balken) balken.style.setProperty("--anteil", balken.getAttribute("data-anteil") + "%");
      m.style.setProperty("--verzug", (m.getAttribute("data-verzug") || 0) + "ms");
    });
  }

  if (fpFilter && gitter) {
    fpFilter.addEventListener("click", function (e) {
      var k = e.target.closest("[data-filter]");
      if (!k) return;
      var f = k.getAttribute("data-filter");
      fpFilter.querySelectorAll(".chip").forEach(function (c) {
        var an = c === k;
        c.classList.toggle("aktiv", an);
        c.setAttribute("aria-pressed", String(an));
      });
      var sichtbar = 0;
      gitter.querySelectorAll(".maschine").forEach(function (m) {
        var passt = f === "alle" || m.getAttribute("data-tags").split(" ").indexOf(f) > -1;
        m.hidden = !passt;
        if (passt) { m.style.setProperty("--verzug", (sichtbar * 45) + "ms"); sichtbar++; }
      });
      gitter.classList.remove("neu");
      void gitter.offsetWidth;
      gitter.classList.add("neu");
      var zaehler = document.getElementById("fuhrpark-zahl");
      if (zaehler) zaehler.textContent = sichtbar + (sichtbar === 1 ? " Maschine" : " Maschinen");
    });
  }

  /* ======================================================= Räumpflicht-Check
     Sämtliche Inhalte stehen als echtes Markup in winterdienst.html – die
     Satzungszeiten sollen für Suchmaschinen und Sprachmodelle lesbar sein,
     auch ohne JavaScript. Hier wird nur noch umgeschaltet.                   */
  var pflichtWurzel = document.getElementById("raeumpflicht");
  if (pflichtWurzel) {
    var pflichtOrtBox = document.getElementById("pflicht-ort");
    var pflichtArt = document.getElementById("pflicht-art");
    var pflichtAus = document.getElementById("pflicht-ergebnis");
    var gewaehlteArt = "privat";
    var gewaehlterOrt = "taunusstein";

    /* Die Stellwerte stehen als data-Attribute im Markup und werden erst hier
       zu CSS-Variablen. So kommt die Seite ohne Inline-Styles aus und eine
       strenge Content-Security-Policy ohne 'unsafe-inline' bleibt möglich. */
    pflichtWurzel.querySelectorAll(".zf-zeile").forEach(function (zeile) {
      zeile.style.setProperty("--i", zeile.getAttribute("data-i") || "0");
      var fenster = zeile.querySelector(".zf-fenster");
      if (!fenster) return;
      fenster.style.setProperty("--von", (zeile.getAttribute("data-von") || 0) + "%");
      fenster.style.setProperty("--breite", (zeile.getAttribute("data-breite") || 100) + "%");
    });
    pflichtWurzel.querySelectorAll(".pflicht-punkt").forEach(function (punkt) {
      punkt.style.setProperty("--i", punkt.getAttribute("data-i") || "0");
    });

    function umschalten(auswahl, attribut, wert) {
      pflichtWurzel.querySelectorAll(auswahl).forEach(function (el) {
        el.hidden = el.getAttribute(attribut) !== wert;
      });
    }

    function ortEingabe() {
      var f = document.getElementById("pflicht-freitext");
      return (f && f.value.trim()) || "";
    }

    /* Ohne eingetippten Ort ergäbe die Suche Unsinn – dann wird stattdessen
       dazu aufgefordert, einen einzutragen. */
    function suchlink() {
      var ort = ortEingabe();
      pflichtWurzel.querySelectorAll("[data-suchlink]").forEach(function (ziel) {
        ziel.textContent = "";
        if (!ort) {
          ziel.textContent = "Tragen Sie Ihren Ort ein, dann verlinken wir die passende Satzungssuche.";
          return;
        }
        var a = document.createElement("a");
        a.href = "https://www.google.com/search?q=" +
          encodeURIComponent(ort + " Straßenreinigungssatzung Winterdienst");
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Satzung für " + ort + " suchen";
        ziel.appendChild(a);
        ziel.appendChild(document.createTextNode("."));
      });
    }

    function pflichtZeichnen() {
      umschalten(".zeitfenster-stadt", "data-ort", gewaehlterOrt);
      umschalten(".zeitfenster-fuss", "data-ort", gewaehlterOrt);
      umschalten(".satzung-block", "data-ort", gewaehlterOrt);
      umschalten("#pflicht-hinweis > [data-ort]", "data-ort", gewaehlterOrt);

      /* Links die Satzung, rechts die allgemeinen Pflichten. Der Basisblock
         gilt immer, dazu kommt der Block zur gewählten Objektart. */
      pflichtWurzel.querySelectorAll(".pflicht-punkt").forEach(function (punkt) {
        var art = punkt.getAttribute("data-art");
        punkt.hidden = art !== "basis" && art !== gewaehlteArt;
      });

      suchlink();

      if (pflichtAus) {
        pflichtAus.classList.remove("neu");
        void pflichtAus.offsetWidth;
        pflichtAus.classList.add("neu");
      }
      var balken = document.getElementById("zeitfenster-balken");
      if (balken) {
        balken.classList.remove("neu-zeit");
        void balken.offsetWidth;
        balken.classList.add("neu-zeit");
      }
    }

    function wahlSetzen(box, treffer, klasse) {
      box.querySelectorAll(klasse).forEach(function (c) {
        var an = c === treffer;
        c.classList.toggle("aktiv", an);
        c.setAttribute("aria-checked", String(an));
      });
    }

    if (pflichtOrtBox) {
      pflichtOrtBox.addEventListener("click", function (e) {
        var k = e.target.closest("[data-ort]");
        if (!k) return;
        wahlSetzen(this, k, ".chip");
        gewaehlterOrt = k.getAttribute("data-ort");
        var andere = document.getElementById("pflicht-andere");
        if (andere) andere.hidden = gewaehlterOrt !== "andere";
        pflichtZeichnen();
      });

      var tippen;
      var frei = document.getElementById("pflicht-freitext");
      if (frei) frei.addEventListener("input", function () {
        clearTimeout(tippen);
        tippen = setTimeout(suchlink, 400);
      });
    }

    if (pflichtArt) {
      pflichtArt.addEventListener("click", function (e) {
        var k = e.target.closest("[data-wert]");
        if (!k) return;
        wahlSetzen(this, k, ".wahl");
        gewaehlteArt = k.getAttribute("data-wert");
        pflichtZeichnen();
      });
    }

    suchlink();
  }

  /* =============================================================== Formulare */
  LVK.sendeFormular = function (form, statusEl, nutzlast) {
    statusEl.textContent = "Wird gesendet …";
    statusEl.className = "";

    var fertig = function () {
      form.querySelectorAll("input, textarea, select, button").forEach(function (f) { f.disabled = true; });
      statusEl.className = "";
      statusEl.style.color = "var(--eis-hell)";
      statusEl.textContent = "Danke. Ihre Anfrage ist eingegangen – wir melden uns innerhalb eines Werktags. " +
        "Wenn es eilt: 0800 811 88 00.";
    };

    if (DEMO) {
      console.info("[LVK] Formular (Demo, kein Versand):", nutzlast);
      setTimeout(function () {
        fertig();
        statusEl.textContent = "Vorschau zur Abstimmung \u2013 diese Anfrage wurde NICHT versendet " +
          "und ist bei LV Kommunal nicht eingegangen. In der fertigen Fassung wird sie zugestellt.";
      }, 600);
      return;
    }

    fetch(ENDPUNKT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast)
    }).then(function (r) {
      if (!r.ok) throw new Error();
      fertig();
    }).catch(function () {
      statusEl.className = "fehler";
      statusEl.textContent = "Das Absenden hat nicht geklappt. Bitte rufen Sie uns an unter 0800 811 88 00 " +
        "oder schreiben Sie an service@lvk-winterdienst.de.";
    });
  };

  var kontaktForm = document.getElementById("kontakt-form");
  if (kontaktForm) {
    kontaktForm.addEventListener("submit", function (e) {
      e.preventDefault();
      LVK.sendeFormular(kontaktForm, document.getElementById("kontakt-status"), {
        art: "Kontaktformular",
        name: document.getElementById("k-name").value,
        firma: document.getElementById("k-firma").value,
        email: document.getElementById("k-mail").value,
        telefon: document.getElementById("k-tel").value,
        nachricht: document.getElementById("k-text").value
      });
    });
  }

})();
