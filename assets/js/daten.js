/* =============================================================================
   LV Kommunal – Inhaltsdaten
   Alles, was redaktionell gepflegt wird, steht hier. Kein Layout, keine Logik.
   HINWEIS: Die technischen Angaben im Fuhrpark sind Klassenwerte und vor dem
   Livegang mit dem Betrieb abzugleichen (siehe README).
   ============================================================================= */

window.LVK = {};

/* ------------------------------------------------------------------ Fuhrpark
   Die Maschinen stehen als Markup in winterdienst.html – sonst wären ihre
   Angaben für Suchmaschinen und Sprachmodelle unsichtbar. Wer sie ändert,
   ändert sie dort. Hier steht bewusst nichts mehr.
   ========================================================================== */

/* ------------------------------------------------------- Beispielprotokolle
   Die drei Belege stehen als Markup in winterdienst.html, Abschnitt #nachweis –
   Protokollzeilen, Streumengen und GPS-Spuren. Hier steht bewusst nichts mehr.
   ========================================================================== */

/* -------------------------------------------------------- Räumpflicht-Check
   ACHTUNG: Die Satzungszeiten, Räumbreiten und Streumittelregeln stehen als
   Markup direkt in winterdienst.html, Abschnitt #raeumpflicht. Sie sollen für
   Suchmaschinen und Sprachmodelle lesbar sein, auch ohne JavaScript.
   Sie sind der einzige Teil der Website mit rechtlichem Gewicht: Wer sie
   ändert, muss die Satzung erneut nachlesen und die Quelle mitführen.
   Geprüft am 27.08.2026, jede Stadt mit Paragraf und Quelllink im Markup.

   Rechtsweg: § 823 BGB begründet die Verkehrssicherungspflicht. Die
   Landesstraßengesetze (Hessen: § 10 HStrG, Rheinland-Pfalz: LStrG) legen die
   Reinigungs- und Winterdienstpflicht bei der Gemeinde. Diese darf sie per
   Satzung auf die Anlieger übertragen – und regelt dort Zeiten, Breiten und
   Streumittel. Feste bundesweite Uhrzeiten gibt es NICHT.                     */

/* -------------------------------------------------------------- Servicegebiet
   Grobe Einordnung nach PLZ. Vor dem Livegang mit dem Betrieb abstimmen. */
LVK.gebiet = function (plz) {
  var p = String(plz || "").replace(/\D/g, "");
  if (p.length < 2) return null;
  var zwei = p.slice(0, 2);
  var drei = p.slice(0, 3);
  if (zwei === "65") return { status: "kern", text: "liegt in unserem Kerngebiet." };
  if (["551", "552", "553", "650", "612", "613"].indexOf(drei) > -1)
    return { status: "kern", text: "liegt in unserem Kerngebiet." };
  if (["55", "56", "60", "61", "63", "64", "35"].indexOf(zwei) > -1)
    return { status: "pruefen", text: "liegt am Rand unseres Gebiets – wir prüfen die Anfahrt und melden uns dazu." };
  return { status: "aussen", text: "liegt außerhalb unseres regulären Einsatzgebiets. Schreiben Sie uns trotzdem – bei größeren Objekten schauen wir es uns an." };
};

/* ------------------------------------------------------------- Winternacht
   Ein realistischer Verlauf einer Reifglätte-Nacht im Taunus.
   Die Zeitachse läuft von 21:00 bis 07:00, gerechnet wird in Minuten ab 21:00.
   Entscheidend ist der Schnittpunkt: Sobald der Taupunkt ÜBER die
   Bodentemperatur steigt, schlägt sich die Luftfeuchte als Reif nieder.
   Genau das passiert in dieser Nacht um 02:47.                              */
LVK.winternacht = {
  von: 0, bis: 600,                      // Minuten ab 21:00 Uhr
  stunden: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600],
  luft:      [ 3.4,  2.8,  2.1,  1.5,  0.9,  0.3, -0.4, -1.0, -1.4, -1.2, -0.7],
  boden:     [ 2.6,  1.9,  1.2,  0.5, -0.1, -0.6, -1.3, -1.9, -2.2, -1.9, -1.3],
  taupunkt:  [ 0.4,  0.3,  0.1, -0.1, -0.4, -0.7, -0.9, -1.2, -1.5, -1.5, -1.2],

  schritte: [
    {
      min: 40, zeit: "21:40", titel: "Die Prognose kippt",
      text: "Der Winterdienst-Wetterdienst meldet für den Taunus Bodentemperaturen unter null ab etwa drei Uhr. Die Disposition setzt die Nachtschicht auf Bereitschaft und friert die Tourenplanung ein.",
      marke: "Prognose", stufe: "ruhig",
      zustand: "trocken", fahrzeuge: 0, flaeche: 0
    },
    {
      min: 250, zeit: "01:10", titel: "Kontrollfahrt",
      text: "Ein Fahrzeug fährt die kritischen Punkte ab: Brücken, Nordhänge, die Rampe am Logistikzentrum. Dort wird es immer zuerst glatt – und dort entscheidet sich, ob die ganze Schicht rausfährt.",
      marke: null, stufe: "ruhig",
      zustand: "abkühlend", fahrzeuge: 1, flaeche: 0
    },
    {
      min: 347, zeit: "02:47", titel: "Glättewarnung",
      text: "Der Taupunkt steigt über die Bodentemperatur. Ab hier schlägt sich die Luftfeuchte als Reif nieder – ohne einen Tropfen Niederschlag. Die Alarmierung geht an alle Touren.",
      marke: "Auslöser", stufe: "alarm",
      zustand: "Reifglätte", fahrzeuge: 1, flaeche: 0
    },
    {
      min: 360, zeit: "03:00", titel: "Die Höfe fahren an",
      text: "In Taunusstein werden Streuer beladen, Solebehälter gefüllt und Pflüge aufgesattelt. Jede Tour kennt ihre Reihenfolge – die steht seit dem Herbst fest.",
      marke: null, stufe: "einsatz",
      zustand: "Reifglätte", fahrzeuge: 9, flaeche: 0
    },
    {
      min: 384, zeit: "03:24", titel: "Erste Fläche",
      text: "Räumbeginn. Erst der Schnee runter, dann streuen – umgekehrt friert die Schicht sofort wieder fest. Der Schnee wird dorthin abgelegt, wo er niemanden stört.",
      marke: null, stufe: "einsatz",
      zustand: "Reifglätte", fahrzeuge: 9, flaeche: 1200
    },
    {
      min: 470, zeit: "04:50", titel: "Nachstreuen",
      text: "Wo am Morgen Publikumsverkehr kommt, geht ein zweites Mal Streugut raus. Der Bordcomputer hält Menge und Position fest, die GPS-Spur läuft mit.",
      marke: null, stufe: "einsatz",
      zustand: "Reifglätte", fahrzeuge: 9, flaeche: 18400
    },
    {
      min: 570, zeit: "06:30", titel: "Sie schließen auf",
      text: "Parkplatz frei, Gehweg abgestumpft, Zufahrt befahrbar. Das Protokoll der Nacht liegt im System – abrufbar, falls jemand danach fragt.",
      marke: "Nachweis", stufe: "fertig",
      zustand: "gesichert", fahrzeuge: 3, flaeche: 26800
    }
  ]
};

/* ------------------------------------------------------------------- Icons
   Ein kleiner Strich-Satz, 24x24, damit die Auswahl im Funnel nicht nur
   aus Text besteht. Bewusst reduziert und einheitlich in der Strichstärke.  */
(function () {
  var pfade = {
    gewerbe:   '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 11h.01M12 11h.01M15 11h.01"/>',
    privat:    '<path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M10 21v-6h4v6"/>',
    industrie: '<path d="M2 21h20M4 21V10l5 3.5V10l5 3.5V6l6 4v11M7.5 17h.01M12.5 17h.01M17 17h.01"/>',
    handel:    '<path d="M3 8h18l-1.2 12.2a1 1 0 0 1-1 .8H5.2a1 1 0 0 1-1-.8L3 8ZM3 8l1.6-4.4A1 1 0 0 1 5.5 3h13a1 1 0 0 1 .9.6L21 8M9 12v1.5a3 3 0 0 0 6 0V12"/>',
    verwaltung:'<path d="M3 21h18M5 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17M14 9h4a1 1 0 0 1 1 1v11M8 7h3M8 11h3M8 15h3M16.5 13h.01M16.5 17h.01"/>',
    kommune:   '<path d="M2.5 21h19M4 21V10m16 11V10M3 10h18L12 3 3 10ZM8 21v-7h3v7M13 21v-7h3v7"/>',
    gehweg:    '<path d="M4 21 8.5 3M20 21 15.5 3M9.5 12h5M8.5 17h7M10.5 7h3"/>',
    einfahrt:  '<path d="M3 21V9l9-6 9 6v12M9 21v-7h6v7M12 3v3M6.5 12v9M17.5 12v9"/>',
    parkplatz: '<path d="M3 3h18v18H3zM9 17V7h3.5a3 3 0 0 1 0 6H9"/>',
    hof:       '<path d="M3 5h18v14H3zM3 12h18M12 5v14"/>',
    treppe:    '<path d="M3 21h4v-4h4v-4h4V9h4V5h3"/>',
    rampe:     '<path d="M3 20h18M4 20 20 8M20 8v12M9 20v-4"/>',
    uhr:       '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.2l3.4 2"/>',
    flaeche:   '<path d="M3 3h18v18H3zM3 8h18M8 3v18"/>',
    kalender:  '<path d="M4 6h16v15H4zM4 11h16M8 3v4M16 3v4"/>',
    person:    '<path d="M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>',
    haken:     '<path d="M4 12.5 9.5 18 20 6"/>',
    schluessel:'<path d="M14.5 3a6.5 6.5 0 1 0-4.6 11.1L8 16.5H6v2H4v2H2v-3l7.4-7.4A6.5 6.5 0 0 1 14.5 3Zm1.5 4.5h.01"/>',
    menschen:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    lkw:       '<path d="M2 17V6h11v11M13 9h4.5l3.5 3.5V17M4.5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10.5 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>'
  };
  LVK.ikon = function (name, groesse) {
    var g = groesse || 24;
    return '<svg class="ikon" width="' + g + '" height="' + g + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + (pfade[name] || "") + "</svg>";
  };
})();

/* ---------------------------------------------------------- Anfrage-Funnel */
LVK.funnel = {
  zweige: [
    { wert: "gewerblich", ikon: "gewerbe", titel: "Gewerbe & Verwaltung",
      text: "Betrieb, Filiale, Liegenschaft oder öffentliche Fläche" },
    { wert: "privat", ikon: "privat", titel: "Privat",
      text: "Eigenes Haus, Einfahrt, Gehweg vor dem Grundstück" }
  ],

  objektart: {
    gewerblich: [
      { wert: "Industrie & Logistik", ikon: "industrie", text: "Werk, Lager, Rangierfläche" },
      { wert: "Einzelhandel",         ikon: "handel",    text: "Filiale, Kundenparkplatz" },
      { wert: "Hausverwaltung",       ikon: "verwaltung",text: "Eine oder mehrere Liegenschaften" },
      { wert: "Büro & Dienstleistung",ikon: "gewerbe",   text: "Bürohaus, Praxis, Kanzlei" },
      { wert: "Kommune",              ikon: "kommune",   text: "Öffentliche Flächen, Ausschreibung" }
    ],
    privat: [
      { wert: "Einfamilienhaus",   ikon: "privat", text: "Gehweg, Einfahrt, Zuweg" },
      { wert: "Mehrfamilienhaus",  ikon: "verwaltung", text: "Mehrere Parteien, gemeinsame Wege" },
      { wert: "Eigentümergemeinschaft", ikon: "gewerbe", text: "WEG mit Stellplätzen" }
    ]
  },

  flaechen: {
    gewerblich: [
      { wert: "Parkplatz", ikon: "parkplatz" },
      { wert: "Zufahrten", ikon: "einfahrt" },
      { wert: "Gehwege", ikon: "gehweg" },
      { wert: "Hof / Ladezone", ikon: "hof" },
      { wert: "Rampen", ikon: "rampe" },
      { wert: "Treppen & Eingänge", ikon: "treppe" }
    ],
    privat: [
      { wert: "Gehweg vor dem Haus", ikon: "gehweg" },
      { wert: "Einfahrt", ikon: "einfahrt" },
      { wert: "Zuweg zur Haustür", ikon: "hof" },
      { wert: "Stellplätze", ikon: "parkplatz" },
      { wert: "Treppen", ikon: "treppe" }
    ]
  },

  groesse: {
    gewerblich: [
      { wert: "bis 500 Quadratmeter" }, { wert: "500 – 2.000 Quadratmeter" },
      { wert: "2.000 – 10.000 Quadratmeter" }, { wert: "über 10.000 Quadratmeter" }, { wert: "weiß ich nicht" }
    ],
    privat: [
      { wert: "bis 50 Quadratmeter" }, { wert: "50 – 150 Quadratmeter" },
      { wert: "150 – 400 Quadratmeter" }, { wert: "weiß ich nicht" }
    ]
  },

  bereitschaft: [
    { wert: "Saisonvertrag mit Dauerbereitschaft", text: "Der Normalfall. Wir kommen, sobald es nötig ist." },
    { wert: "Einsatz auf Abruf", text: "Sie melden sich, wir fahren raus." },
    { wert: "Nur bei größeren Schneefällen", text: "Für Flächen mit geringem Risiko." },
    { wert: "Erst einmal beraten lassen", text: "Wir schauen gemeinsam, was passt." }
  ]
};

/* ------------------------------------------------------------- Preisspanne
   Optional. Solange aktiv:false steht, zeigt der Objekt-Check keine Preise.
   Sobald LV die Kalkulation freigibt: Werte eintragen und aktiv auf true setzen.
   proQm sind Saisonpreise je Quadratmeter in Euro, von/bis als Spanne.        */
LVK.preise = {
  aktiv: false,
  hinweis: "Unverbindliche Spanne für eine komplette Saison, netto. " +
           "Das verbindliche Angebot erstellen wir nach Sichtung der Flächen.",
  grundgebuehr: { von: 0, bis: 0 },
  proQm: {
    "Parkplatz":        { von: 0, bis: 0 },
    "Gehweg":           { von: 0, bis: 0 },
    "Zufahrt":          { von: 0, bis: 0 },
    "Hof / Ladezone":   { von: 0, bis: 0 },
    "Sonstige Fläche":  { von: 0, bis: 0 }
  }
};

LVK.spanne = function (objekte) {
  if (!LVK.preise.aktiv) return null;
  var von = LVK.preise.grundgebuehr.von, bis = LVK.preise.grundgebuehr.bis;
  objekte.forEach(function (o) {
    o.flaechen.forEach(function (f) {
      var s = LVK.preise.proQm[f.art] || LVK.preise.proQm["Sonstige Fläche"];
      von += f.qm * s.von;
      bis += f.qm * s.bis;
    });
  });
  if (!(bis > 0)) return null;
  return { von: von, bis: bis };
};

/* Stadtseiten sind gebaut, aber vorerst ausgeblendet. Auf true setzen, dann
   erscheinen sie wieder in Karte, Fusszeile und Ortsliste.                   */
LVK.stadtseitenAn = false;

/* ---------------------------------------------------------- Einsatzgebiet
   Echte Koordinaten. Die Karte wird daraus gerechnet, nicht gezeichnet –
   dadurch stimmen die Lagen zueinander und neue Orte fügen sich richtig ein. */
LVK.gebietOrte = [
  { name: "Idstein",        lat: 50.2189, lon: 8.2704, typ: "ort",     seite: "winterdienst-idstein.html" },
  { name: "Taunusstein",    lat: 50.1367, lon: 8.1490, typ: "betrieb", seite: "winterdienst-taunusstein.html" },
  { name: "Limburg",        lat: 50.3833, lon: 8.0667, typ: "ort",     seite: "winterdienst-limburg.html" },
  { name: "Bad Schwalbach", lat: 50.1408, lon: 8.0703, typ: "ort" },
  { name: "Wiesbaden",      lat: 50.0826, lon: 8.2400, typ: "ort",     seite: "winterdienst-wiesbaden.html" },
  { name: "Hofheim",        lat: 50.0866, lon: 8.4470, typ: "ort" },
  { name: "Eltville",       lat: 50.0281, lon: 8.1180, typ: "ort" },
  { name: "Mainz",          lat: 49.9929, lon: 8.2473, typ: "ort",     seite: "winterdienst-mainz.html" }
];

/* Nur zur Orientierung, gehört nicht zum Kerngebiet */
LVK.gebietMarken = [
  { name: "Frankfurt", lat: 50.1109, lon: 8.6821 }
];

/* Grob nachgezeichneter Rheinlauf – hilft beim Einordnen der Karte */
LVK.rheinlauf = [
  [49.9600, 7.8900], [50.0000, 7.9600], [50.0281, 8.0500],
  [50.0400, 8.1400], [50.0350, 8.2100], [50.0000, 8.2700], [49.9300, 8.3400]
];
