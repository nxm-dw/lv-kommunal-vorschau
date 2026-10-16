/* LV Kommunal – Ausklappmenüs der Kopfzeile
   Die Gruppen sind <details>, funktionieren also auch ohne Skript. Hier kommt
   dazu: immer nur eine offen, Schließen per Escape und Klick daneben, am
   Desktop Öffnen beim Überfahren mit der Maus. */
(function () {
  "use strict";
  var nav = document.getElementById("nav");
  if (!nav) return;
  var gruppen = [].slice.call(nav.querySelectorAll(".navi-gruppe"));
  var breit = matchMedia("(min-width: 1181px) and (hover: hover)");

  function zu(ausser) { gruppen.forEach(function (g) { if (g !== ausser) g.open = false; }); }

  gruppen.forEach(function (g) {
    var t;
    g.addEventListener("toggle", function () { if (g.open) zu(g); });
    var perMaus = false;
    g.addEventListener("mouseenter", function () {
      if (!breit.matches) return;
      clearTimeout(t);
      if (!g.open) { g.open = true; perMaus = true; }
    });
    /* Wer nach dem Überfahren klickt, will das Menü sehen, nicht schließen */
    g.querySelector("summary").addEventListener("click", function (e) {
      if (perMaus && g.open) { e.preventDefault(); }
      perMaus = false;
    });
    g.addEventListener("mouseleave", function () { if (!breit.matches) return; t = setTimeout(function () { g.open = false; perMaus = false; }, 180); });
  });

  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) zu(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var offen = gruppen.filter(function (g) { return g.open; })[0];
    if (offen) { offen.open = false; offen.querySelector("summary").focus(); }
  });

  /* Schublade schließen, sobald ein Link gewählt wurde – auch Sprungmarken */
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    zu();
    var schalter = document.getElementById("nav-schalter");
    if (schalter && getComputedStyle(schalter).display !== "none") {
      nav.setAttribute("data-offen", "false");
      schalter.setAttribute("aria-expanded", "false");
      schalter.textContent = "Menü";
    }
  });
})();
