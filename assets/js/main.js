/* =============================================================================
   LV Kommunal – Grundverhalten der Seite
   Kopfzeile, Navigation, Einblendungen, Räumsequenz im Hero, Winternacht,
   Rollenumschalter.
   ============================================================================= */
(function () {
  "use strict";

  var sparsam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------- Kopfzeile */
  var kopf = document.getElementById("kopf");
  if (kopf) {
    var setzeKopf = function () {
      kopf.classList.toggle("kopf--fest", window.scrollY > 80);
    };
    setzeKopf();
    addEventListener("scroll", setzeKopf, { passive: true });
  }

  var schalter = document.getElementById("nav-schalter");
  var nav = document.getElementById("nav");
  if (schalter && nav) {
    schalter.addEventListener("click", function () {
      var offen = nav.getAttribute("data-offen") === "true";
      nav.setAttribute("data-offen", String(!offen));
      schalter.setAttribute("aria-expanded", String(!offen));
      schalter.textContent = offen ? "Menü" : "Schließen";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && innerWidth <= 1000) {
        nav.setAttribute("data-offen", "false");
        schalter.setAttribute("aria-expanded", "false");
        schalter.textContent = "Menü";
      }
    });
  }

  /* ----------------------------------------------------------- Einblendungen */
  var aufElemente = document.querySelectorAll(".auf");
  if (sparsam || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(aufElemente, function (el) { el.classList.add("sichtbar"); });
  } else {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("sichtbar");
          beobachter.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    Array.prototype.forEach.call(aufElemente, function (el) { beobachter.observe(el); });

    /* Sicherheitsnetz: Was beim Laden schon im Bild steht, wird sofort gezeigt. */
    addEventListener("load", function () {
      Array.prototype.forEach.call(aufElemente, function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("sichtbar");
      });
    });
  }

  /* ------------------------------------------------------------- Winternacht */
  var schiene = document.getElementById("nacht-schiene");
  if (schiene) {
    var schritte = schiene.querySelectorAll(".nacht-schritt");
    schiene.setAttribute("tabindex", "0");
    schiene.setAttribute("aria-label", "Ablauf einer Winternacht, horizontal scrollbar");

    var markiere = function () {
      var links = schiene.scrollLeft;
      var beste = 0, kleinste = Infinity;
      Array.prototype.forEach.call(schritte, function (s, i) {
        var d = Math.abs(s.offsetLeft - schiene.offsetLeft - links);
        if (d < kleinste) { kleinste = d; beste = i; }
      });
      Array.prototype.forEach.call(schritte, function (s, i) {
        s.setAttribute("data-aktiv", String(i <= beste));
      });
    };
    markiere();
    schiene.addEventListener("scroll", function () {
      cancelAnimationFrame(schiene._t);
      schiene._t = requestAnimationFrame(markiere);
    }, { passive: true });
    Array.prototype.forEach.call(schritte, function (s) {
      s.addEventListener("click", function () {
        schiene.scrollTo({ left: s.offsetLeft - schiene.offsetLeft, behavior: sparsam ? "auto" : "smooth" });
      });
    });
  }

  /* ---------------------------------------------------------- Ich verwalte … */
  var rollen = document.getElementById("rollen-schalter");
  if (rollen) {
    rollen.addEventListener("click", function (e) {
      var knopf = e.target.closest("[data-rolle]");
      if (!knopf) return;
      var rolle = knopf.getAttribute("data-rolle");
      rollen.querySelectorAll("[data-rolle]").forEach(function (b) {
        var an = b === knopf;
        b.classList.toggle("aktiv", an);
        b.setAttribute("aria-selected", String(an));
      });
      document.querySelectorAll(".rollen-inhalt").forEach(function (block) {
        block.setAttribute("data-aktiv", String(block.getAttribute("data-rolle") === rolle));
      });
    });
  }

  /* ------------------------------------------------------------------ Jahr */
  var jahr = document.getElementById("jahr");
  if (jahr) jahr.textContent = new Date().getFullYear();

  /* ------------------------------------------------------- Einsatzband im Fuss
     Im Winterhalbjahr läuft die Saison, sonst steht dort die ehrliche Ansage.
     Ohne JavaScript bleibt der Wintertext aus dem Markup stehen – falsch wäre
     das nur ein halbes Jahr lang und nur in einer Nebenzeile. */
  var lage = document.getElementById("fuss-lage");
  if (lage) {
    var monat = new Date().getMonth() + 1;              /* 1 = Januar */
    var winter = monat >= 10 || monat <= 4;
    var text = lage.querySelector(".fuss-lage-text");
    if (winter) {
      text.textContent = "Winterdienst-Saison läuft";
      lage.removeAttribute("data-ruhe");
    } else {
      text.textContent = "Außerhalb der Saison · Verträge für den Winter";
      lage.setAttribute("data-ruhe", "true");
    }
  }

})();
