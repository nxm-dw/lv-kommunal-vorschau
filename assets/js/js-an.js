/* Markiert das Dokument als "JavaScript läuft". Erst dann werden Abschnitte
   für die Einblendung versteckt. Ohne JavaScript bleibt alles sichtbar.
   Bewusst eine eigene Datei statt eines Inline-Skripts, damit die
   Content-Security-Policy ohne 'unsafe-inline' auskommt. */
document.documentElement.classList.add("js");
