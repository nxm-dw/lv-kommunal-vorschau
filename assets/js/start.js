/* =============================================================================
   LV Kommunal – Geteilter Einstieg
   Zeigerparallaxe und Saison-Anzeige. Ausgelagert, damit die
   Content-Security-Policy ohne 'unsafe-inline' auskommt.
   ============================================================================= */
/* Zeigerparallaxe: Das Bild folgt der Maus ein paar Pixel. Auf Geräten ohne
   feinen Zeiger und bei reduzierter Bewegung bleibt alles ruhig. */
(function () {
  var tor = document.querySelector(".tor");
  var fein = matchMedia("(pointer: fine)").matches;
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (ruhig) { tor.classList.add("tor--sparsam"); return; }
  if (!fein) return;

  var felder = [].slice.call(document.querySelectorAll(".feld"));
  var warte = false;

  addEventListener("pointermove", function (e) {
    if (warte) return;
    warte = true;
    requestAnimationFrame(function () {
      warte = false;
      felder.forEach(function (f) {
        var r = f.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        var bild = f.querySelector(".feld-bild");
        bild.style.setProperty("--px", (-dx * 14).toFixed(1) + "px");
        bild.style.setProperty("--py", (-dy * 14).toFixed(1) + "px");
      });
    });
  }, { passive: true });

  addEventListener("pointerleave", function () {
    felder.forEach(function (f) {
      var bild = f.querySelector(".feld-bild");
      bild.style.setProperty("--px", "0px");
      bild.style.setProperty("--py", "0px");
    });
  });
})();

/* Saison-Anzeige: im Winter läuft der Winterdienst, im Sommer das Grün.
   In der jeweils anderen Saison steht dort, was gerade sinnvoll ist. */
(function () {
  var m = new Date().getMonth() + 1;                 // 1 = Januar
  var winterSaison = (m >= 10 || m <= 4);
  var w = document.querySelector('[data-saison="winter"]');
  var g = document.querySelector('[data-saison="maeh"]');
  if (winterSaison) {
    w.textContent = "Saison läuft";
    g.textContent = "Pause bis Mai";
    g.setAttribute("data-ruhe", "true");
  } else {
    w.textContent = "Verträge für die neue Saison";
    w.setAttribute("data-ruhe", "true");
    g.textContent = "Saison läuft";
  }
})();
