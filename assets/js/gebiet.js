/* =============================================================================
   LV Kommunal – Einsatzgebiet als gerechnete Karte
   Die Orte stehen an ihrer echten Position. Das Gebiet ist die konvexe Hülle
   der betreuten Orte, nach außen gedehnt und weich gezogen.
   ============================================================================= */
(function () {
  "use strict";

  var box = document.getElementById("gebiet-karte");
  if (!box || !window.LVK || !LVK.gebietOrte) return;

  var sparsam = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var svgNS = "http://www.w3.org/2000/svg";

  function bauen() {
    var B = box.clientWidth;
    if (!B) return;
    var H = Math.round(Math.min(640, Math.max(380, B * 0.82)));

    var alle = LVK.gebietOrte.concat(LVK.gebietMarken);
    var lat0 = alle.reduce(function (a, o) { return a + o.lat; }, 0) / alle.length;
    var k = Math.cos(lat0 * Math.PI / 180);

    /* Erst roh projizieren, dann auf die Fläche skalieren */
    var roh = function (lat, lon) { return { x: lon * k, y: -lat }; };
    var punkte = alle.map(function (o) { return roh(o.lat, o.lon); });
    var rhein = LVK.rheinlauf.map(function (p) { return roh(p[0], p[1]); });
    var streu = punkte.concat(rhein);

    var minX = Math.min.apply(null, streu.map(function (p) { return p.x; }));
    var maxX = Math.max.apply(null, streu.map(function (p) { return p.x; }));
    var minY = Math.min.apply(null, streu.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, streu.map(function (p) { return p.y; }));

    var padX = Math.min(120, Math.max(74, B * 0.11)), padY = 58;
    var mass = Math.min((B - padX * 2) / (maxX - minX), (H - padY * 2) / (maxY - minY));
    var vX = (B - (maxX - minX) * mass) / 2;
    var vY = (H - (maxY - minY) * mass) / 2;
    var P = function (lat, lon) {
      var r = roh(lat, lon);
      return { x: vX + (r.x - minX) * mass, y: vY + (r.y - minY) * mass };
    };

    /* Konvexe Hülle der betreuten Orte (Andrew) */
    var pts = LVK.gebietOrte.map(function (o) { return P(o.lat, o.lon); })
      .slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var kreuz = function (o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); };
    var unten = [], oben = [];
    pts.forEach(function (p) {
      while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], p) <= 0) unten.pop();
      unten.push(p);
    });
    pts.slice().reverse().forEach(function (p) {
      while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], p) <= 0) oben.pop();
      oben.push(p);
    });
    var huelle = unten.slice(0, -1).concat(oben.slice(0, -1));

    /* Nach außen dehnen, damit die Orte im Gebiet liegen und nicht auf dem Rand */
    var mx = huelle.reduce(function (a, p) { return a + p.x; }, 0) / huelle.length;
    var my = huelle.reduce(function (a, p) { return a + p.y; }, 0) / huelle.length;
    void my;
    var weit = huelle.map(function (p) {
      var dx = p.x - mx, dy = p.y - my, l = Math.hypot(dx, dy) || 1;
      var d = 34;
      return { x: p.x + dx / l * d, y: p.y + dy / l * d };
    });

    /* Weiche geschlossene Kurve durch die gedehnten Punkte */
    function weich(ps) {
      var d = "M" + ps[0].x.toFixed(1) + " " + ps[0].y.toFixed(1);
      for (var i = 0; i < ps.length; i++) {
        var a = ps[i], b = ps[(i + 1) % ps.length];
        var v = ps[(i + 2) % ps.length];
        var c1 = { x: a.x + (b.x - ps[(i - 1 + ps.length) % ps.length].x) / 6,
                   y: a.y + (b.y - ps[(i - 1 + ps.length) % ps.length].y) / 6 };
        var c2 = { x: b.x - (v.x - a.x) / 6, y: b.y - (v.y - a.y) / 6 };
        d += " C" + c1.x.toFixed(1) + " " + c1.y.toFixed(1) + "," +
                    c2.x.toFixed(1) + " " + c2.y.toFixed(1) + "," +
                    b.x.toFixed(1) + " " + b.y.toFixed(1);
      }
      return d + " Z";
    }

    var svg = ['<svg viewBox="0 0 ' + B + " " + H + '" width="' + B + '" height="' + H +
      '" role="img" aria-label="Karte des Einsatzgebiets zwischen Limburg, Taunusstein, Wiesbaden und Mainz, mit der Betriebsstätte in Taunusstein">'];

    svg.push('<defs>' +
      '<linearGradient id="gebiet-fuell" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#009EE0" stop-opacity=".2"/>' +
        '<stop offset="100%" stop-color="#009EE0" stop-opacity=".05"/>' +
      "</linearGradient>" +
      '<filter id="gebiet-schein" x="-25%" y="-25%" width="150%" height="150%">' +
        '<feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/>' +
        '<feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      "</defs>");

    /* Rheinlauf */
    var rp = LVK.rheinlauf.map(function (p, i) {
      var q = P(p[0], p[1]);
      return (i ? "L" : "M") + q.x.toFixed(1) + " " + q.y.toFixed(1);
    }).join(" ");
    svg.push('<path d="' + rp + '" fill="none" stroke="#5CC8F2" stroke-opacity=".22" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
    var rMitte = P(LVK.rheinlauf[2][0], LVK.rheinlauf[2][1]);
    svg.push('<text x="' + (rMitte.x - 6) + '" y="' + (rMitte.y + 20) + '" fill="#5CC8F2" fill-opacity=".5" font-size="11" font-family="Chivo Mono, monospace" letter-spacing="1.6">RHEIN</text>');

    /* Einsatzgebiet */
    svg.push('<path class="gebiet-flaeche" d="' + weich(weit) + '" fill="url(#gebiet-fuell)" ' +
      'stroke="#5CC8F2" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="7 6" filter="url(#gebiet-schein)"/>');

    /* Verbindungen von den Betriebsstätten zu den Orten */
    var betriebe = LVK.gebietOrte.filter(function (o) { return o.typ === "betrieb"; });
    LVK.gebietOrte.filter(function (o) { return o.typ === "ort"; }).forEach(function (o, i) {
      var z = P(o.lat, o.lon);
      var naehe = betriebe.map(function (bb) {
        var q = P(bb.lat, bb.lon);
        return { q: q, d: Math.hypot(q.x - z.x, q.y - z.y) };
      }).sort(function (a, b) { return a.d - b.d; })[0];
      svg.push('<line class="gebiet-linie" data-i="' + i + '" x1="' + naehe.q.x.toFixed(1) + '" y1="' + naehe.q.y.toFixed(1) +
        '" x2="' + z.x.toFixed(1) + '" y2="' + z.y.toFixed(1) +
        '" stroke="#5CC8F2" stroke-opacity=".3" stroke-width="1" stroke-dasharray="3 4"/>');
    });

    /* Orientierungsmarken */
    LVK.gebietMarken.forEach(function (o) {
      var q = P(o.lat, o.lon);
      svg.push('<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="3.5" fill="#5A7488"/>');
      svg.push('<text x="' + (q.x + 10).toFixed(1) + '" y="' + (q.y + 4).toFixed(1) +
        '" fill="#6E8A9C" font-size="12">' + o.name + "</text>");
    });

    /* Beschriftungen: Seite nach der Lage zum Mittelpunkt, damit sie nach
       außen zeigen. Danach ein Durchgang gegen Überlappungen. */
    var belegt = [];
    var plaetze = LVK.gebietOrte.map(function (o) {
      var q = P(o.lat, o.lon);
      var betrieb = o.typ === "betrieb";
      var rechts = q.x >= mx;
      var breite = o.name.length * (betrieb ? 8.2 : 7.4) + 22;
      var ty = q.y + (betrieb ? 5 : 4);

      /* Nach unten ausweichen, solange ein anderes Etikett im Weg liegt */
      for (var runde = 0; runde < 8; runde++) {
        var kollision = belegt.some(function (b) {
          if (b.rechts !== rechts) return false;
          return Math.abs(b.ty - ty) < (betrieb ? 26 : 15) &&
                 Math.abs(b.x - q.x) < (b.breite + breite) / 2;
        });
        if (!kollision) break;
        ty += betrieb ? 26 : 15;
      }
      belegt.push({ x: q.x, ty: ty, breite: breite, rechts: rechts });
      if (betrieb) belegt.push({ x: q.x, ty: ty + 15, breite: breite, rechts: rechts });
      return { q: q, betrieb: betrieb, rechts: rechts, ty: ty };
    });

    LVK.gebietOrte.forEach(function (o, i) {
      var pl = plaetze[i];
      var q = pl.q, betrieb = pl.betrieb, rechts = pl.rechts;
      var tx = rechts ? q.x + (betrieb ? 16 : 12) : q.x - (betrieb ? 16 : 12);
      var anker = rechts ? "start" : "end";
      var verlinkt = o.seite && LVK.stadtseitenAn;

      /* Führungslinie, wenn das Etikett ausweichen musste */
      var fuehrung = Math.abs(pl.ty - (q.y + (betrieb ? 5 : 4))) > 3
        ? '<line x1="' + q.x.toFixed(1) + '" y1="' + q.y.toFixed(1) + '" x2="' + tx.toFixed(1) +
          '" y2="' + (pl.ty - 4).toFixed(1) + '" stroke="#5CC8F2" stroke-opacity=".35" stroke-width="1"/>'
        : "";

      var g = '<g class="gebiet-ort' + (betrieb ? " gebiet-ort--betrieb" : "") + '" data-i="' + i + '"' +
        (verlinkt ? ' data-seite="' + o.seite + '" tabindex="0" role="link"' : "") +
        ' aria-label="' + o.name + (betrieb ? ", Betriebsstätte" : "") + '">';
      if (betrieb) {
        g += '<circle class="gebiet-puls" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="9" fill="none" stroke="#5CC8F2" stroke-width="1.5"/>';
        g += '<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="6.5" fill="#009EE0" stroke="#fff" stroke-width="2"/>';
      } else {
        g += '<circle class="gebiet-punkt" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="4.5" fill="#5CC8F2" stroke="#0A1822" stroke-width="1.5"/>';
      }
      g = fuehrung + g;
      g += '<text x="' + tx.toFixed(1) + '" y="' + pl.ty.toFixed(1) +
        '" text-anchor="' + anker + '" fill="' + (betrieb ? "#FFFFFF" : "#C6D8E3") +
        '" font-size="' + (betrieb ? 14 : 13) + '" font-weight="' + (betrieb ? 600 : 400) + '">' + o.name + "</text>";
      if (betrieb) {
        g += '<text x="' + tx.toFixed(1) + '" y="' + (pl.ty + 15).toFixed(1) +
          '" text-anchor="' + anker + '" fill="#5CC8F2" font-size="9.5" font-family="Chivo Mono, monospace" letter-spacing="1.4">BETRIEBSSTÄTTE</text>';
      }
      g += "</g>";
      svg.push(g);
    });

    svg.push("</svg>");
    box.innerHTML = svg.join("");
    /* Die Einblendfolge als CSS-Variable nachreichen: im Markup wäre sie ein
       style-Attribut und damit unter strenger CSP verboten. */
    box.querySelectorAll("[data-i]").forEach(function (el) {
      el.style.setProperty("--i", el.getAttribute("data-i"));
    });

    box.querySelectorAll("[data-seite]").forEach(function (g) {
      var geh = function () { location.href = g.getAttribute("data-seite"); };
      g.addEventListener("click", geh);
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); geh(); }
      });
    });

    if (!sparsam && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e, b) {
        if (e[0].isIntersecting) { box.classList.add("laeuft"); b.disconnect(); }
      }, { threshold: .25 }).observe(box);
    } else {
      box.classList.add("laeuft");
    }
  }

  bauen();
  var neu;
  addEventListener("resize", function () {
    clearTimeout(neu);
    neu = setTimeout(bauen, 200);
  }, { passive: true });
})();
