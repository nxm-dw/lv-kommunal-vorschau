/* =============================================================================
   LV Kommunal – Jahreszahl im Fuss und Stand der Rechtstexte
   Ausgelagert, damit die Content-Security-Policy ohne 'unsafe-inline' auskommt.
   ============================================================================= */
(function () {
  var jahr = document.getElementById("jahr");
  if (jahr) jahr.textContent = new Date().getFullYear();

  var stand = document.getElementById("stand");
  if (stand) {
    stand.textContent = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }
})();
