/* Markiert das Dokument als "JavaScript läuft". Erst dann werden Abschnitte
   für die Einblendung versteckt. Ohne JavaScript bleibt alles sichtbar.
   Bewusst eine eigene Datei statt eines Inline-Skripts, damit die
   Content-Security-Policy ohne 'unsafe-inline' auskommt. */
document.documentElement.classList.add("js");

/* Saubere Adresse: wer /seite.html oder /index.html aufruft, sieht in der
   Adresszeile /seite bzw. / (ohne Neuladen). Auf dem Live-Server erledigt
   das zusätzlich eine 301-Umleitung in der .htaccess. */
(function () {
  var p = location.pathname;
  if (!/\.html$/.test(p) || /\/404\.html$/.test(p)) return;
  var sauber = p.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  try { history.replaceState(history.state, "", sauber + location.search + location.hash); } catch (e) {}
})();
