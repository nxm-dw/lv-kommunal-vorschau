/* =============================================================================
   LV Kommunal – Objekt-Check
   Adresse suchen (Photon/OpenStreetMap), Flächen auf dem Luftbild einzeichnen,
   Quadratmeter geodätisch berechnen, Betriebsdaten erfassen, Anfrage abschicken.
   Mehrere Objekte in einem Vorgang sind vorgesehen (Hausverwaltungen).
   ============================================================================= */
(function () {
  "use strict";

  var wurzel = document.getElementById("objekt-check");
  if (!wurzel) return;

  var $ = function (id) { return document.getElementById(id); };

  /* Leaflet wiegt 158 KB und wird erst in Schritt 2 gebraucht. Deshalb kommt es
     erst dann, wenn jemand wirklich eine Adresse gewählt hat. */
  var kartenLader = null;
  function ladeKarte() {
    if (window.L) return Promise.resolve();
    if (kartenLader) return kartenLader;

    kartenLader = new Promise(function (fertig, daneben) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "assets/vendor/leaflet/leaflet.css";
      document.head.appendChild(css);

      var js = document.createElement("script");
      js.src = "assets/vendor/leaflet/leaflet.js";
      js.onload = function () { fertig(); };
      js.onerror = function () { daneben(new Error("Kartenbibliothek nicht ladbar")); };
      document.head.appendChild(js);
    });
    return kartenLader;
  }

  var objekte = [];
  var aktuell = -1;

  var karte = null, sat = null, plan = null;
  var entwurf = [];
  var entwurfLinie = null, entwurfPunkte = [];
  /* Die Kacheln stehen als Markup in winterdienst.html – Flächenarten,
     Objektarten und Gefahrenstellen sollen auch ohne JavaScript lesbar sein.
     Auch die Zeichenfarbe je Flächenart kommt von dort. */
  $("flaechen-arten").querySelectorAll("[data-farbe]").forEach(function (b) {
    b.style.setProperty("--markefarbe", b.getAttribute("data-farbe"));
  });

  var ersteArt = $("flaechen-arten").querySelector(".wahl");
  var aktiveArt = {
    art: ersteArt.getAttribute("data-wert"),
    farbe: ersteArt.getAttribute("data-farbe")
  };


  /* ------------------------------------------------------------- Schritte */
  function zeigeSchritt(n) {
    wurzel.querySelectorAll(".check-buehne").forEach(function (b) {
      b.setAttribute("data-aktiv", String(Number(b.getAttribute("data-buehne")) === n));
    });
    wurzel.querySelectorAll(".check-schritt").forEach(function (s) {
      var i = Number(s.getAttribute("data-schritt"));
      if (i === n) s.setAttribute("aria-current", "step");
      else s.removeAttribute("aria-current");
      s.setAttribute("data-erledigt", String(i < n));
    });
    if (n === 2 && karte) setTimeout(function () { karte.invalidateSize(); }, 60);
    var kopf = wurzel.querySelector(".werkzeug-kopf");
    if (kopf && n > 1) kopf.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function zaehlerAktualisieren() {
    var z = $("check-objektzahl");
    if (!z) return;
    z.textContent = objekte.length > 1 ? "Objekt " + (aktuell + 1) + " von " + objekte.length : "";
  }

  /* ------------------------------------------------- Schritt 1: Adresse */
  var adresseForm = $("adresse-form");
  var treffer = $("adresse-treffer");

  /* Vorschlagsliste beim Tippen – inklusive Hinweis auf das Servicegebiet */
  LVK.autofill(document.getElementById("adresse"), function (f) {
    treffer.innerHTML = "";
    waehleAdresse(f);
  }, true);

  adresseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var frage = $("adresse").value.trim();
    if (frage.length < 3) return;
    treffer.innerHTML = '<p class="lade">Adresse wird gesucht</p>';

    LVK.suchen(frage, 6).then(function (liste) {
      if (!liste.length) {
        treffer.innerHTML = '<p class="fehler">Diese Adresse finden wir nicht. ' +
          'Versuchen Sie es mit Straße, Hausnummer und Ort.</p>';
        return;
      }
      treffer.innerHTML = '<p class="etikett">Welche Adresse ist es?</p><div class="objekt-liste">' +
        liste.map(function (f, i) {
          var g = LVK.gebiet(f.properties.postcode);
          var marke = g
            ? '<span class="gebiet-marke gebiet-marke--' + g.status + '">' +
              (g.status === "kern" ? "Kerngebiet" : g.status === "pruefen" ? "Randgebiet" : "außerhalb") + "</span>"
            : "";
          return '<button type="button" class="objekt-karte-mini" data-i="' + i + '">' +
            "<strong>" + LVK.sicher(LVK.beschriften(f.properties)) + "</strong>" + marke + "</button>";
        }).join("") + "</div>";

      treffer.querySelectorAll("[data-i]").forEach(function (b) {
        b.addEventListener("click", function () {
          waehleAdresse(liste[Number(b.getAttribute("data-i"))]);
        });
      });
    }).catch(function () {
      treffer.innerHTML = '<p class="fehler">Die Adresssuche ist gerade nicht erreichbar. ' +
        'Rufen Sie uns an: 0800 811 88 00.</p>';
    });
  });

  function waehleAdresse(f) {
    var p = f.properties, c = f.geometry.coordinates;
    var g = LVK.gebiet(p.postcode);

    objekte.push({
      bezeichnung: LVK.beschriften(p),
      plz: p.postcode || "",
      ort: p.city || p.county || "",
      lat: c[1], lng: c[0],
      gebiet: g,
      flaechen: [],
      objektart: "Gewerbe- oder Industriefläche",
      betriebsbeginn: "06:30",
      bereitschaft: "Saisonvertrag mit Dauerbereitschaft",
      gefahren: []
    });
    aktuell = objekte.length - 1;

    if (g) {
      treffer.innerHTML = '<p class="gebiet-satz gebiet-satz--' + g.status + '">' +
        LVK.sicher(objekte[aktuell].ort || "Ihr Standort") +
        " " + LVK.sicher(g.text) + "</p>";
    } else {
      treffer.innerHTML = "";
    }

    zaehlerAktualisieren();
    zeigeSchritt(2);

    var tipp = $("karte-tipp");
    if (tipp) tipp.textContent = "Karte wird geladen …";

    ladeKarte().then(function () {
      baueKarte(c[1], c[0]);
      zeichneEntwurf();
    }).catch(function () {
      var huelle = $("objekt-karte");
      if (huelle) {
        huelle.innerHTML = '<p class="karte-fehler">Die Karte lässt sich gerade nicht laden. ' +
          'Rufen Sie uns an: <a href="tel:08008118800">0800 811 88 00</a> – wir nehmen Ihre ' +
          "Flächen auch telefonisch auf.</p>";
      }
    });
  }

  /* -------------------------------------------- Schritt 2: Flächen zeichnen */
  function baueKarte(lat, lng) {
    if (!karte) {
      karte = L.map("objekt-karte", {
        center: [lat, lng], zoom: 19, maxZoom: 21,
        doubleClickZoom: false, scrollWheelZoom: false
      });
      karte.on("click", function () { karte.scrollWheelZoom.enable(); });
      karte.on("mouseout", function () { karte.scrollWheelZoom.disable(); });

      sat = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 21, maxNativeZoom: 19,
          attribution: "Luftbild &copy; Esri, Maxar, Earthstar Geographics"
        }
      ).addTo(karte);

      plan = L.tileLayer.wms("https://sgx.geodatenzentrum.de/wms_basemapde", {
        layers: "de_basemapde_web_raster_farbe",
        format: "image/png", transparent: false, maxZoom: 21,
        attribution: "Karte &copy; GeoBasis-DE / BKG"
      });

      karte.on("click", aufKarteGeklickt);

      $("ansicht-sat").addEventListener("click", function () { wechsleAnsicht(true); });
      $("ansicht-karte").addEventListener("click", function () { wechsleAnsicht(false); });
    } else {
      leereKarte();
      karte.setView([lat, lng], 19);
    }
    L.circleMarker([lat, lng], {
      radius: 6, color: "#fff", weight: 2, fillColor: "#009EE0", fillOpacity: 1
    }).addTo(karte);
    setTimeout(function () { karte.invalidateSize(); }, 80);
  }

  function wechsleAnsicht(satellit) {
    if (!karte) return;
    if (satellit) { karte.removeLayer(plan); sat.addTo(karte); }
    else { karte.removeLayer(sat); plan.addTo(karte); }
    $("ansicht-sat").setAttribute("aria-pressed", String(satellit));
    $("ansicht-karte").setAttribute("aria-pressed", String(!satellit));
  }

  function leereKarte() {
    karte.eachLayer(function (l) {
      if (l !== sat && l !== plan) karte.removeLayer(l);
    });
    entwurf = []; entwurfLinie = null; entwurfPunkte = [];
  }

  /* Flächeninhalt auf dem WGS84-Ellipsoid, gleiche Formel wie in GIS-Werkzeugen */
  function flaecheQm(punkte) {
    if (punkte.length < 3) return 0;
    var R = 6378137, rad = Math.PI / 180, summe = 0;
    for (var i = 0; i < punkte.length; i++) {
      var a = punkte[i], b = punkte[(i + 1) % punkte.length];
      summe += (b.lng - a.lng) * rad * (2 + Math.sin(a.lat * rad) + Math.sin(b.lat * rad));
    }
    return Math.abs(summe * R * R / 2);
  }

  function aufKarteGeklickt(e) {
    entwurf.push(e.latlng);
    zeichneEntwurf();
  }

  function zeichneEntwurf() {
    if (entwurfLinie) karte.removeLayer(entwurfLinie);
    entwurfPunkte.forEach(function (m) { karte.removeLayer(m); });
    entwurfPunkte = [];

    if (entwurf.length) {
      entwurfLinie = entwurf.length > 2
        ? L.polygon(entwurf, { color: aktiveArt.farbe, weight: 2, fillOpacity: 0.28, dashArray: "5 4" })
        : L.polyline(entwurf, { color: aktiveArt.farbe, weight: 2, dashArray: "5 4" });
      entwurfLinie.addTo(karte);

      entwurf.forEach(function (ll) {
        entwurfPunkte.push(L.circleMarker(ll, {
          radius: 4, color: "#fff", weight: 2, fillColor: aktiveArt.farbe, fillOpacity: 1
        }).addTo(karte));
      });
    }

    $("flaeche-fertig").disabled = entwurf.length < 3;
    $("flaeche-zurueck").disabled = entwurf.length === 0;

    var tipp = $("karte-tipp");
    if (entwurf.length === 0) tipp.textContent = "Ecken anklicken – ab drei Punkten wird die Fläche berechnet.";
    else if (entwurf.length < 3) tipp.textContent = "Noch " + (3 - entwurf.length) + " Punkt(e) bis zur ersten Fläche.";
    else tipp.textContent = "Aktuell " + formatQm(flaecheQm(entwurf)) + " Quadratmeter. Fläche abschließen oder weitere Ecken setzen.";
  }

  function formatQm(n) {
    return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(n));
  }

  $("flaeche-zurueck").addEventListener("click", function () {
    entwurf.pop();
    zeichneEntwurf();
  });

  $("flaeche-fertig").addEventListener("click", function () {
    if (entwurf.length < 3) return;
    var qm = flaecheQm(entwurf);
    var form = L.polygon(entwurf, {
      color: aktiveArt.farbe, weight: 2, fillOpacity: 0.32
    }).addTo(karte);
    form.bindTooltip(aktiveArt.art + ": " + formatQm(qm) + " Quadratmeter", { permanent: false });

    objekte[aktuell].flaechen.push({
      art: aktiveArt.art, farbe: aktiveArt.farbe, qm: qm, ebene: form
    });
    entwurf = [];
    zeichneEntwurf();
    listeFlaechen();
  });

  $("flaechen-arten").addEventListener("click", function (e) {
    var k = e.target.closest("[data-wert]");
    if (!k) return;
    this.querySelectorAll(".wahl").forEach(function (c) {
      var an = c === k;
      c.classList.toggle("aktiv", an);
      c.setAttribute("aria-checked", String(an));
    });
    aktiveArt = { art: k.getAttribute("data-wert"), farbe: k.getAttribute("data-farbe") };
    zeichneEntwurf();
  });

  function listeFlaechen() {
    var liste = $("flaechen-liste");
    var f = objekte[aktuell].flaechen;
    liste.innerHTML = f.map(function (x, i) {
      return '<li class="flaeche-zeile">' +
        '<span class="flaeche-farbe" data-farbe="' + LVK.sicher(x.farbe) + '"></span>' +
        '<span class="flaeche-art">' + x.art + "</span>" +
        '<span class="flaeche-qm">' + formatQm(x.qm) + " Quadratmeter</span>" +
        '<button class="flaeche-weg" type="button" data-weg="' + i + '" aria-label="' + x.art + " entfernen\">&times;</button></li>";
    }).join("");

    /* Die Flächenfarbe steht als data-Attribut im Markup und wandert erst hier
       in die CSSOM – unter strenger CSP wäre ein style-Attribut nicht erlaubt. */
    liste.querySelectorAll(".flaeche-farbe[data-farbe]").forEach(function (el) {
      el.style.setProperty("--flaechenfarbe", el.getAttribute("data-farbe"));
    });

    liste.querySelectorAll("[data-weg]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.getAttribute("data-weg"));
        karte.removeLayer(f[i].ebene);
        f.splice(i, 1);
        listeFlaechen();
      });
    });

    var summe = f.reduce(function (a, x) { return a + x.qm; }, 0);
    $("summe-qm").textContent = formatQm(summe);
    $("zu-schritt-3").disabled = f.length === 0;
  }

  $("zu-schritt-3").addEventListener("click", function () { zeigeSchritt(3); });

  /* --------------------------------------------- Schritt 3: Betriebsdaten */
  $("objektart").addEventListener("click", function (e) {
    var k = e.target.closest("[data-wert]");
    if (!k) return;
    this.querySelectorAll(".wahl").forEach(function (c) {
      var an = c === k;
      c.classList.toggle("aktiv", an);
      c.setAttribute("aria-checked", String(an));
    });
    objekte[aktuell].objektart = k.getAttribute("data-wert");
  });

  $("gefahren").addEventListener("click", function (e) {
    var k = e.target.closest("[data-wert]");
    if (!k) return;
    k.classList.toggle("aktiv");
    k.setAttribute("aria-pressed", String(k.classList.contains("aktiv")));
    var wert = k.getAttribute("data-wert");
    var g = objekte[aktuell].gefahren;
    var i = g.indexOf(wert);
    if (i > -1) g.splice(i, 1); else g.push(wert);
  });

  $("betriebsbeginn").addEventListener("change", function () {
    objekte[aktuell].betriebsbeginn = this.value;
  });
  $("bereitschaft").addEventListener("change", function () {
    objekte[aktuell].bereitschaft = this.value;
  });

  $("objekt-weiteres").addEventListener("click", function () {
    $("gefahren").querySelectorAll(".wahl").forEach(function (c) {
      c.classList.remove("aktiv");
      c.setAttribute("aria-pressed", "false");
    });
    $("adresse").value = "";
    treffer.innerHTML = "";
    $("flaechen-liste").innerHTML = "";
    $("summe-qm").textContent = "0";
    $("zu-schritt-3").disabled = true;
    zeigeSchritt(1);
    $("adresse").focus();
  });

  /* ------------------------------------------- Schritt 4: Zusammenfassung */
  $("zu-schritt-4").addEventListener("click", function () {
    var gesamt = 0;
    objekte.forEach(function (o) {
      o.flaechen.forEach(function (f) { gesamt += f.qm; });
    });
    $("bilanz-qm").textContent = formatQm(gesamt);

    $("bilanz-objekte").innerHTML = objekte.map(function (o) {
      var qm = o.flaechen.reduce(function (a, f) { return a + f.qm; }, 0);
      var arten = o.flaechen.map(function (f) { return f.art; });
      var einmalig = arten.filter(function (a, i) { return arten.indexOf(a) === i; });
      return '<li class="objekt-karte-mini">' +
        "<div><strong>" + LVK.sicher(o.bezeichnung) + "</strong>" +
        "<span>" + LVK.sicher(o.objektart) + " · sicher ab " +
        LVK.sicher(o.betriebsbeginn) + " Uhr · " +
        LVK.sicher(einmalig.join(", ") || "keine Fläche erfasst") + "</span></div>" +
        '<span class="flaeche-qm">' + formatQm(qm) + " Quadratmeter</span></li>";
    }).join("");

    /* Preisspanne erscheint nur, wenn in daten.js freigeschaltet */
    var alteSpanne = document.getElementById("bilanz-spanne");
    if (alteSpanne) alteSpanne.remove();
    var sp = LVK.spanne(objekte);
    if (sp) {
      var euro = function (n) {
        return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR",
          maximumFractionDigits: 0 }).format(n);
      };
      var box = document.createElement("div");
      box.className = "spanne";
      box.id = "bilanz-spanne";
      box.innerHTML = '<p class="summe-label">Grobe Preisspanne</p>' +
        '<p class="spanne-zahl">' + euro(sp.von) + " – " + euro(sp.bis) +
        "<small>pro Saison</small></p>" +
        '<p class="spanne-text">' + LVK.preise.hinweis + "</p>";
      document.querySelector("#objekt-check .bilanz").appendChild(box);
    }

    zeigeSchritt(4);
  });

  $("zurueck-schritt-3").addEventListener("click", function () { zeigeSchritt(3); });

  $("anfrage-form").addEventListener("submit", function (e) {
    e.preventDefault();
    LVK.sendeFormular(this, $("anfrage-status"), {
      art: "Objekt-Check",
      name: $("a-name").value,
      firma: $("a-firma").value,
      email: $("a-mail").value,
      telefon: $("a-tel").value,
      nachricht: $("a-text").value,
      objekte: objekte.map(function (o) {
        return {
          adresse: o.bezeichnung,
          objektart: o.objektart,
          betriebsbeginn: o.betriebsbeginn,
          bereitschaft: o.bereitschaft,
          gefahren: o.gefahren,
          gesamtQm: Math.round(o.flaechen.reduce(function (a, f) { return a + f.qm; }, 0)),
          flaechen: o.flaechen.map(function (f) {
            return {
              art: f.art,
              qm: Math.round(f.qm),
              punkte: f.ebene.getLatLngs()[0].map(function (p) {
                return [Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6))];
              })
            };
          })
        };
      })
    });
  });

})();
