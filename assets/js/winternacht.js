/* =============================================================================
   LV Kommunal – Winternacht als gepinnte Scroll-Sequenz
   Die Sektion ist hoch, ihr Inhalt klebt oben und bleibt komplett sichtbar.
   Der Scrollstand steuert die Uhrzeit von 21:00 bis 07:00. Was bereits
   vergangen ist, zeigt die Kurve hell – der Rest bleibt Prognose.
   ============================================================================= */
(function () {
  "use strict";

  var sek = document.getElementById("nacht");
  if (!sek || !window.LVK || !LVK.winternacht) return;

  var D = LVK.winternacht;
  var sparsam = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var svgNS = "http://www.w3.org/2000/svg";
  var FARBE = { luft: "#8FA9BC", boden: "#5CC8F2", taupunkt: "#FFB01F" };

  var wert = D.von;
  var aktiverSchritt = -1;
  var schrittBoxen = [].slice.call(document.querySelectorAll(".leitstand-schritt"));
  var teile = null;
  var laeuft = false;

  /* ------------------------------------------------------------ Rechenkram
     Monotone kubische Interpolation nach Fritsch–Carlson. Die Kurve läuft
     weich, überschwingt aber nie über die Messwerte hinaus – wichtig, weil
     sonst ein Schnittpunkt entstünde, den die Daten gar nicht hergeben.      */
  var steigung = {};
  (function () {
    var x = D.stunden;
    ["luft", "boden", "taupunkt"].forEach(function (name) {
      var y = D[name], n = y.length;
      var d = [], m = [];
      for (var i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
      m.push(d[0]);
      for (var j = 1; j < n - 1; j++) {
        m.push(d[j - 1] * d[j] <= 0 ? 0 : (d[j - 1] + d[j]) / 2);
      }
      m.push(d[n - 2]);
      for (var q = 0; q < n - 1; q++) {
        if (d[q] === 0) { m[q] = 0; m[q + 1] = 0; continue; }
        var a = m[q] / d[q], bb = m[q + 1] / d[q];
        var h = Math.hypot(a, bb);
        if (h > 3) { m[q] = 3 / h * a * d[q]; m[q + 1] = 3 / h * bb * d[q]; }
      }
      steigung[name] = m;
    });
  })();

  function zwischen(reihe, min) {
    var x = D.stunden;
    var name = reihe === D.luft ? "luft" : reihe === D.boden ? "boden" : "taupunkt";
    if (min <= x[0]) return reihe[0];
    if (min >= x[x.length - 1]) return reihe[reihe.length - 1];
    for (var i = 1; i < x.length; i++) {
      if (min <= x[i]) {
        var h = x[i] - x[i - 1];
        var t = (min - x[i - 1]) / h;
        var t2 = t * t, t3 = t2 * t;
        var m = steigung[name];
        return (2 * t3 - 3 * t2 + 1) * reihe[i - 1] +
               (t3 - 2 * t2 + t) * h * m[i - 1] +
               (-2 * t3 + 3 * t2) * reihe[i] +
               (t3 - t2) * h * m[i];
      }
    }
    return reihe[reihe.length - 1];
  }

  /* Exakter Zeitpunkt, ab dem der Taupunkt über der Bodentemperatur liegt.
     Erst grob suchen, dann per Intervallhalbierung auf die Minute genau. */
  function reifStart() {
    var vorher = zwischen(D.taupunkt, 0) - zwischen(D.boden, 0);
    for (var m = 2; m <= D.bis; m += 2) {
      var jetzt = zwischen(D.taupunkt, m) - zwischen(D.boden, m);
      if (vorher < 0 && jetzt >= 0) {
        var a = m - 2, b = m;
        for (var k = 0; k < 30; k++) {
          var mid = (a + b) / 2;
          if (zwischen(D.taupunkt, mid) - zwischen(D.boden, mid) < 0) a = mid; else b = mid;
        }
        return b;
      }
      vorher = jetzt;
    }
    return null;
  }

  function alsUhr(min) {
    var g = Math.floor((21 * 60 + min) / 60) % 24;
    var m = Math.round(21 * 60 + min) % 60;
    return String(g).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  var nk = function (v, k) {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: k === undefined ? 0 : k,
      maximumFractionDigits: k === undefined ? 0 : k
    }).format(v);
  };

  function mischen(a, b, t) {
    var h = function (c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; };
    var x = h(a), y = h(b);
    return "rgb(" + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(",") + ")";
  }

  /* ---------------------------------------------------------------- Kurve */
  var huelle = $("nacht-kurve");

  function baueKurve() {
    var B = huelle.clientWidth;
    var H = huelle.clientHeight;
    if (!B || H < 60) return;

    var padL = 36, padR = 14, padO = 12, padU = 24;
    var alle = D.luft.concat(D.boden, D.taupunkt);
    var min = Math.min.apply(null, alle) - 0.7;
    var max = Math.max.apply(null, alle) + 0.7;

    var sx = function (m) { return padL + (m / D.bis) * (B - padL - padR); };
    var sy = function (v) { return padO + (1 - (v - min) / (max - min)) * (H - padO - padU); };

    huelle.innerHTML = "";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + B + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "Temperaturverlauf der Nacht. Sobald der Taupunkt über die Bodentemperatur steigt, bildet sich Reif.");

    var el = function (typ, attrs, eltern) {
      var e = document.createElementNS(svgNS, typ);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (eltern || svg).appendChild(e);
      return e;
    };

    /* Alles links vom Abspielkopf wird über diese Maske hell gezeigt */
    var defs = el("defs", {});
    var clip = el("clipPath", { id: "lvk-vergangen" }, defs);
    var clipRechteck = el("rect", { x: 0, y: 0, width: 0, height: H }, clip);

    /* Nullgradlinie und Stundenraster */
    if (min < 0 && max > 0) {
      el("line", { x1: padL, y1: sy(0), x2: B - padR, y2: sy(0),
                   stroke: "rgba(255,255,255,.22)", "stroke-width": 1, "stroke-dasharray": "4 4" });
      el("text", { x: 4, y: sy(0) + 3.5, fill: "#6E8A9C",
                   "font-size": 10, "font-family": "Chivo Mono, monospace" }).textContent = "0 °C";
    }
    for (var h = 0; h <= D.bis; h += 120) {
      el("line", { x1: sx(h), y1: padO, x2: sx(h), y2: H - padU,
                   stroke: "rgba(255,255,255,.06)", "stroke-width": 1 });
      var t = el("text", { x: sx(h), y: H - 7, fill: "#6E8A9C", "text-anchor": "middle",
                           "font-size": 10, "font-family": "Chivo Mono, monospace" });
      t.textContent = alsUhr(h);
    }

    /* Kurvenpfade aus dichten Stützstellen – dadurch laufen sie weich */
    var schritt = Math.max(1, D.bis / Math.max(60, (B - padL - padR)));
    function pfad(name) {
      var d = "";
      for (var m = 0; m <= D.bis + 0.001; m = Math.min(m + schritt, D.bis)) {
        d += (d ? "L" : "M") + sx(m).toFixed(2) + " " + sy(zwischen(D[name], m)).toFixed(2);
        if (m >= D.bis) break;
      }
      return d;
    }

    /* Reif-Zone: beginnt exakt am rechnerischen Schnittpunkt, nicht am Raster */
    var start = reifStart();
    var reifPfad = null;
    if (start !== null) {
      var oben = [], unten = [];
      for (var m = start; m <= D.bis + 0.001; m = Math.min(m + schritt, D.bis)) {
        oben.push(sx(m).toFixed(2) + "," + sy(zwischen(D.taupunkt, m)).toFixed(2));
        unten.unshift(sx(m).toFixed(2) + "," + sy(zwischen(D.boden, m)).toFixed(2));
        if (m >= D.bis) break;
      }
      reifPfad = "M" + oben.join(" L") + " L" + unten.join(" L") + " Z";
    }

    /* Prognose: blass, über die ganze Breite */
    var blass = el("g", { opacity: ".22" });
    if (reifPfad) el("path", { d: reifPfad, fill: "rgba(255,176,31,.5)" }, blass);
    ["luft", "boden", "taupunkt"].forEach(function (name) {
      el("path", {
        d: pfad(name), fill: "none", stroke: FARBE[name], "stroke-width": 2,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }, blass);
    });

    /* Vergangenes: voll, über die Maske freigegeben */
    var hell = el("g", { "clip-path": "url(#lvk-vergangen)" });
    if (reifPfad) el("path", { d: reifPfad, fill: "rgba(255,176,31,.3)" }, hell);
    ["luft", "boden", "taupunkt"].forEach(function (name) {
      el("path", {
        d: pfad(name), fill: "none", stroke: FARBE[name],
        "stroke-width": name === "luft" ? 1.8 : 2.6,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }, hell);
    });

    /* Abspielkopf */
    var kopf = el("line", { y1: padO, y2: H - padU, stroke: "rgba(255,255,255,.45)", "stroke-width": 1 });
    var punkte = {};
    ["luft", "boden", "taupunkt"].forEach(function (name) {
      punkte[name] = el("circle", { r: 4.5, fill: FARBE[name], stroke: "#060F17", "stroke-width": 2 });
    });

    /* Reif-Markierung liegt bewusst außerhalb der Maske und wird per Deckkraft
       eingeblendet, sobald der Abspielkopf den Schnittpunkt erreicht hat. */
    var reifGruppe = null;
    if (start !== null) {
      reifGruppe = el("g", { opacity: 0 });
      reifGruppe.style.transition = "opacity .45s ease";
      el("line", { x1: sx(start).toFixed(2), y1: padO, x2: sx(start).toFixed(2), y2: H - padU,
                   stroke: "rgba(255,176,31,.85)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, reifGruppe);
      el("circle", { cx: sx(start).toFixed(2), cy: sy(zwischen(D.boden, start)).toFixed(2),
                     r: 3.6, fill: "#FFB01F", stroke: "#060F17", "stroke-width": 1.6 }, reifGruppe);
      /* Nach links beschriften, wenn rechts kein Platz mehr ist */
      var breite = 108;
      var rechts = sx(start) + 10 + breite < B - padR;
      var t2 = el("text", {
        x: (sx(start) + (rechts ? 9 : -9)).toFixed(2), y: padO + 10,
        "text-anchor": rechts ? "start" : "end",
        fill: "#FFB01F", "font-size": 9.5, "font-family": "Chivo Mono, monospace",
        "letter-spacing": ".08em"
      }, reifGruppe);
      t2.textContent = "AB HIER REIF · " + alsUhr(start);
    }

    huelle.appendChild(svg);
    teile = { sx: sx, sy: sy, clipRechteck: clipRechteck, kopf: kopf, punkte: punkte,
              reifGruppe: reifGruppe, reifAb: start };
  }

  function kurveKopf(min) {
    if (!teile) return;
    var x = teile.sx(min);
    teile.clipRechteck.setAttribute("width", x);
    if (teile.reifGruppe) {
      teile.reifGruppe.setAttribute("opacity", min >= teile.reifAb ? 1 : 0);
    }
    teile.kopf.setAttribute("x1", x);
    teile.kopf.setAttribute("x2", x);
    ["luft", "boden", "taupunkt"].forEach(function (name) {
      teile.punkte[name].setAttribute("cx", x);
      teile.punkte[name].setAttribute("cy", teile.sy(zwischen(D[name], min)));
    });
  }

  /* --------------------------------------------------------------- Marken */
  /* Die Marken stehen im Markup, hier bekommen sie nur ihre Position und
     ihren Klick. Die Position als CSS-Variable statt als style-Attribut,
     damit eine strenge Content-Security-Policy möglich bleibt. */
  function baueMarken() {
    $("achse-marken").querySelectorAll("[data-i]").forEach(function (b) {
      b.style.setProperty("--links", b.getAttribute("data-links") + "%");
      b.addEventListener("click", function () {
        springeZu(D.schritte[Number(b.getAttribute("data-i"))].min);
      });
    });
  }

  /* -------------------------------------------------------------- Anzeige */
  function zeichne(min) {
    wert = min;
    var luft = zwischen(D.luft, min), boden = zwischen(D.boden, min), taup = zwischen(D.taupunkt, min);

    $("wert-luft").textContent = nk(luft, 1) + " °C";
    $("wert-boden").textContent = nk(boden, 1) + " °C";
    $("wert-taupunkt").textContent = nk(taup, 1) + " °C";
    $("wert-boden").classList.toggle("minus", boden < 0);
    $("wert-taupunkt").classList.toggle("minus", taup >= boden);

    var idx = 0;
    for (var i = 0; i < D.schritte.length; i++) if (min + 0.5 >= D.schritte[i].min) idx = i;
    var s = D.schritte[idx];

    $("uhr-zahl").textContent = alsUhr(min);
    $("wert-fahrzeuge").innerHTML = s.fahrzeuge + "<small>im Einsatz</small>";
    $("wert-flaeche").innerHTML = nk(s.flaeche) + "<small>Quadratmeter</small>";
    $("wert-zustand").textContent = s.zustand;

    if (idx !== aktiverSchritt) {
      aktiverSchritt = idx;
      /* Alle sieben Schritte stehen im Markup – sichtbar ist immer genau einer. */
      schrittBoxen.forEach(function (box, i) { box.hidden = i !== idx; });
      var zu = $("uhr-zustand");
      zu.setAttribute("data-stufe", s.stufe);
      zu.textContent = s.zustand;
      if (!sparsam) {
        var kasten = $("leitstand-inhalt");
        kasten.classList.remove("leitstand-wechsel");
        void kasten.offsetWidth;
        kasten.classList.add("leitstand-wechsel");
      }
    }

    var p = min / D.bis;
    $("achse-fortschritt").style.width = (p * 100) + "%";
    $("nacht-schieber").value = Math.round(min);
    $("achse-marken").querySelectorAll(".achse-marke").forEach(function (b, i) {
      b.setAttribute("data-erreicht", String(D.schritte[i].min <= min + 0.5));
      b.setAttribute("data-aktiv", String(i === aktiverSchritt));
    });

    var hinweis = $("leitstand-scrollhinweis");
    if (hinweis) hinweis.style.opacity = min > 12 ? "0" : "1";

    /* Tiefe Nacht bis etwa drei Uhr, danach wird es langsam hell */
    var d = Math.max(0, Math.min(1, (min - 330) / (D.bis - 330)));
    sek.style.setProperty("--nachtfarbe", mischen("#060F17", "#123048", d * d));

    kurveKopf(min);
  }

  /* ------------------------------------------------- Scroll steuert die Uhr */
  function strecke() { return Math.max(1, sek.offsetHeight - innerHeight); }

  function ausScroll() {
    var oben = sek.getBoundingClientRect().top;
    var p = Math.min(1, Math.max(0, -oben / strecke()));
    return D.von + p * (D.bis - D.von);
  }

  function springeZu(min) {
    var p = (min - D.von) / (D.bis - D.von);
    var ziel = sek.offsetTop + p * strecke();
    scrollTo({ top: ziel, behavior: sparsam ? "auto" : "smooth" });
  }

  function anstossen() {
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(function () {
      laeuft = false;
      zeichne(ausScroll());
    });
  }

  baueKurve();
  baueMarken();

  var schieber = $("nacht-schieber");
  schieber.min = D.von; schieber.max = D.bis; schieber.step = 1;
  /* Der Regler bewegt die Seite – so bleiben Scrollstand und Uhr immer synchron */
  schieber.addEventListener("input", function () { springeZu(Number(this.value)); });

  addEventListener("scroll", anstossen, { passive: true });

  var neuBauen;
  addEventListener("resize", function () {
    clearTimeout(neuBauen);
    neuBauen = setTimeout(function () { baueKurve(); zeichne(ausScroll()); }, 160);
  }, { passive: true });

  /* Die Kurve braucht die endgültige Höhe des klebenden Kastens */
  requestAnimationFrame(function () {
    baueKurve();
    zeichne(ausScroll());
  });
  addEventListener("load", function () { baueKurve(); zeichne(ausScroll()); });
})();
