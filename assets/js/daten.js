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
   Abgrenzung laut Betrieb (Stand 06.10.2026):
   Kerngebiet  Idstein Kernstadt ohne Ortsteile, Taunusstein-Neuhof, -Wehen,
               -Hahn, -Bleidenstadt, -Seitzenhahn, Bad Schwalbach
   Gewerbe     zusätzlich Niedernhausen, Eschenhahn, Hünstetten, Wiesbaden,
               Bad Camberg sowie die übrigen Ortsteile von Taunusstein
   Der Geocoder (Photon) liefert bei Taunusstein und Idstein den Ortsteil im
   Feld "city" (zum Beispiel "Wehen", "Wörsdorf"). Die Postleitzahl allein
   reicht nicht: ganz Taunusstein hat 65232, Hünstetten teilt sich 65510 mit
   Idstein. Übergeben wird deshalb das komplette properties-Objekt; ein
   reiner PLZ-String funktioniert weiter, liefert dann aber nur grobe Werte. */
(function () {
  var norm = function (s) {
    return String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe")
      .replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]+/g, " ").trim();
  };
  var TAUNUSSTEIN_KERN = ["neuhof", "wehen", "hahn", "bleidenstadt", "seitzenhahn"];
  var IDSTEIN_ORTSTEILE = ["dasbach", "ehrenbach", "heftrich", "kroeftel", "lenzhahn",
    "nieder oberrod", "oberauroff", "walsdorf", "woersdorf"];
  var TEXT = {
    kern: "liegt in unserem Kerngebiet. Dort räumen wir Gehwege, Höfe und Gewerbeflächen.",
    gewerbe: "liegt in unserem Randgebiet. Dort fahren wir für Gewerbekunden.",
    pruefen: "liegt außerhalb unseres Kerngebiets. Wir prüfen die Anfahrt und melden uns dazu.",
    aussen: "liegt außerhalb unseres regulären Einsatzgebiets. Schreiben Sie uns trotzdem – bei größeren Objekten schauen wir es uns an."
  };
  var MARKE = { kern: "Kerngebiet", gewerbe: "Gewerbegebiet", pruefen: "auf Anfrage", aussen: "außerhalb" };
  var erg = function (status) { return { status: status, text: TEXT[status], marke: MARKE[status] }; };

  LVK.gebietMarke = function (status) { return MARKE[status] || ""; };

  LVK.gebiet = function (eingabe) {
    var p = typeof eingabe === "object" && eingabe ? eingabe : { postcode: eingabe };
    var plz = String(p.postcode || "").replace(/\D/g, "");
    if (!plz && /^\d{5}$/.test(p.name || "")) plz = p.name;
    var ort = norm(p.city), teil = norm(p.district || p.locality), name = norm(p.name);
    var orte = [ort, teil, name];
    var hat = function (liste) { return orte.some(function (o) { return liste.indexOf(o) > -1; }); };
    if (plz.length < 2 && !ort) return null;

    /* Taunusstein */
    if (plz === "65232") return erg(hat(TAUNUSSTEIN_KERN) ? "kern" : "gewerbe");
    /* Bad Schwalbach mit Ortsteilen */
    if (plz === "65307" || ort === "bad schwalbach") return erg("kern");
    /* Idstein und Hünstetten teilen sich 65510 */
    if (plz === "65510" || ort === "idstein" || ort === "huenstetten") {
      if (hat(["eschenhahn"])) return erg("gewerbe");
      if (hat(IDSTEIN_ORTSTEILE)) return erg("pruefen");
      if (ort === "idstein") return erg("kern");
      return erg("gewerbe");                       /* Hünstetten und seine Ortsteile */
    }
    if (hat(["eschenhahn"])) return erg("gewerbe");
    /* Niedernhausen, Bad Camberg, Wiesbaden */
    if (plz === "65527" || plz === "65520" || ort === "niedernhausen" || ort === "bad camberg" || ort === "wiesbaden") return erg("gewerbe");
    var drei = plz.slice(0, 3), zwei = plz.slice(0, 2);
    if (["651", "652"].indexOf(drei) > -1) return erg("gewerbe");   /* Wiesbaden 65183–65207 */
    /* übriges Rhein-Main-Gebiet: Straßen und Autobahnen, Objekte auf Anfrage */
    if (["55", "60", "61", "63", "64", "65", "35"].indexOf(zwei) > -1) return erg("pruefen");
    return erg("aussen");
  };
})();

/* ------------------------------------------------------------- Winternacht
   Zwei Simulationen, umschaltbar: ein Glätteeinsatz in einer Reifglätte-Nacht
   und ein Räumeinsatz bei Schneefall. Zahlen der Einsatzbilanz laut Betrieb
   (Stand 06.10.2026), Summen nachgerechnet:
     Glätteeinsatz  8 x 320.000 + 2 x 50.000 + 5 x 5.600       = 2.688.000 m²
     Räumeinsatz    14 Straßenräumer 2.560.000 + 4 x 25.000
                    + 8 x 3.500 + 3 x 3.000                     = 2.697.000 m²
   Die Zeitachse läuft von 21:00 bis 07:00, gerechnet in Minuten ab 21:00.
   Die Zwischenstände der Fläche sind Simulationswerte, das Ende entspricht der
   Bilanz. Bei Reifglätte ist der Schnittpunkt entscheidend: Steigt der
   Taupunkt über die Bodentemperatur, schlägt sich Luftfeuchte als Reif nieder.
   Die Schritte stehen zusätzlich als Markup in winterdienst.html, Abschnitt
   #nacht, mit data-szenario. Wer hier Texte ändert, ändert sie dort auch.     */
LVK.winternacht = {
  reif: {
    name: "Glätteeinsatz", flaecheWort: "Gestreut", einheitWort: "Fahrzeuge",
    von: 0, bis: 600,
    stunden: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600],
    luft:      [ 3.4,  2.8,  2.1,  1.5,  0.9,  0.3, -0.4, -1.0, -1.4, -1.2, -0.7],
    boden:     [ 2.6,  1.9,  1.2,  0.5, -0.1, -0.6, -1.3, -1.9, -2.2, -1.9, -1.3],
    taupunkt:  [ 0.4,  0.3,  0.1, -0.1, -0.4, -0.7, -0.9, -1.2, -1.5, -1.5, -1.2],
    schritte: [
      { min: 40,  zeit: "21:40", titel: "Die Prognose kippt", marke: "Prognose", stufe: "ruhig", zustand: "trocken", fahrzeuge: 0, flaeche: 0 },
      { min: 250, zeit: "01:10", titel: "Kontrollfahrt", marke: null, stufe: "ruhig", zustand: "abkühlend", fahrzeuge: 1, flaeche: 0 },
      { min: 347, zeit: "02:47", titel: "Glättewarnung", marke: "Auslöser", stufe: "alarm", zustand: "Reifglätte", fahrzeuge: 1, flaeche: 0 },
      { min: 360, zeit: "03:00", titel: "Die Höfe fahren an", marke: null, stufe: "einsatz", zustand: "Reifglätte", fahrzeuge: 15, flaeche: 0 },
      { min: 384, zeit: "03:24", titel: "Die Touren laufen", marke: null, stufe: "einsatz", zustand: "Reifglätte", fahrzeuge: 15, flaeche: 240000 },
      { min: 470, zeit: "04:50", titel: "Nachstreuen", marke: null, stufe: "einsatz", zustand: "Reifglätte", fahrzeuge: 15, flaeche: 1820000 },
      { min: 570, zeit: "06:30", titel: "Sie schließen auf", marke: "Nachweis", stufe: "fertig", zustand: "gesichert", fahrzeuge: 15, flaeche: 2688000 }
    ]
  },
  schnee: {
    name: "Räumeinsatz", flaecheWort: "Geräumt", einheitWort: "Einheiten",
    von: 0, bis: 600,
    stunden: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600],
    luft:      [ 0.8,  0.4,  0.0, -0.4, -0.9, -1.3, -1.6, -1.9, -2.1, -1.9, -1.6],
    boden:     [ 1.2,  0.8,  0.4,  0.0, -0.4, -0.8, -1.1, -1.4, -1.6, -1.5, -1.3],
    taupunkt:  [-0.6, -0.8, -1.1, -1.4, -1.8, -2.2, -2.5, -2.8, -3.0, -2.9, -2.7],
    schritte: [
      { min: 30,  zeit: "21:30", titel: "Schnee ist angesagt", marke: "Prognose", stufe: "ruhig", zustand: "trocken", fahrzeuge: 0, flaeche: 0 },
      { min: 170, zeit: "23:50", titel: "Erste Flocken", marke: null, stufe: "ruhig", zustand: "Schneefall", fahrzeuge: 1, flaeche: 0 },
      { min: 255, zeit: "01:15", titel: "Räumalarm", marke: "Auslöser", stufe: "alarm", zustand: "Schneefall", fahrzeuge: 1, flaeche: 0 },
      { min: 285, zeit: "01:45", titel: "Alle rücken aus", marke: null, stufe: "einsatz", zustand: "Schneeglätte", fahrzeuge: 29, flaeche: 0 },
      { min: 330, zeit: "02:30", titel: "Erst räumen, dann streuen", marke: null, stufe: "einsatz", zustand: "Schneeglätte", fahrzeuge: 29, flaeche: 620000 },
      { min: 460, zeit: "04:40", titel: "Zweiter Durchgang", marke: null, stufe: "einsatz", zustand: "Schneeglätte", fahrzeuge: 29, flaeche: 1940000 },
      { min: 570, zeit: "06:30", titel: "Bereit für den Morgen", marke: "Nachweis", stufe: "fertig", zustand: "geräumt", fahrzeuge: 29, flaeche: 2697000 }
    ]
  }
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
   proQm sind Saisonpreise je Quadratmeter in Euro, von/bis als Spanne.
   Gehwege werden in Laufmetern erfasst und über proLm abgerechnet.            */
LVK.preise = {
  aktiv: false,
  hinweis: "Unverbindliche Spanne für eine komplette Saison, netto. " +
           "Das verbindliche Angebot erstellen wir nach Sichtung der Flächen.",
  grundgebuehr: { von: 0, bis: 0 },
  proQm: {
    "Parkplatz":        { von: 0, bis: 0 },
    "Zufahrt":          { von: 0, bis: 0 },
    "Hof / Ladezone":   { von: 0, bis: 0 },
    "Sonstige Fläche":  { von: 0, bis: 0 }
  },
  proLm: {
    "Gehweg":           { von: 0, bis: 0 }
  }
};

LVK.spanne = function (objekte) {
  if (!LVK.preise.aktiv) return null;
  var von = LVK.preise.grundgebuehr.von, bis = LVK.preise.grundgebuehr.bis;
  objekte.forEach(function (o) {
    o.flaechen.forEach(function (f) {
      if (f.lm) {
        var l = LVK.preise.proLm[f.art] || { von: 0, bis: 0 };
        von += f.lm * l.von; bis += f.lm * l.bis;
        return;
      }
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
  { name: "Taunusstein",    lat: 50.1430, lon: 8.1530, typ: "betrieb", seite: "winterdienst-taunusstein" },
  { name: "Idstein",        lat: 50.2189, lon: 8.2704, typ: "ort",     seite: "winterdienst-idstein" },
  { name: "Bad Schwalbach", lat: 50.1408, lon: 8.0703, typ: "ort" },
  { name: "Bad Camberg",    lat: 50.2985, lon: 8.2669, typ: "ort" },
  { name: "Wiesbaden",      lat: 50.0826, lon: 8.2400, typ: "ort",     seite: "winterdienst-wiesbaden" },
  { name: "Limburg",        lat: 50.3833, lon: 8.0667, typ: "ort",     seite: "winterdienst-limburg" },
  { name: "Mainz",          lat: 49.9929, lon: 8.2473, typ: "ort",     seite: "winterdienst-mainz" },
  { name: "Frankfurt",      lat: 50.1109, lon: 8.6821, typ: "ort" },
  { name: "Offenbach",      lat: 50.0956, lon: 8.7761, typ: "ort" }
];

/* Drei Leistungsbereiche laut Betrieb (Stand 06.10.2026). Die Karte zeichnet je
   Bereich eine weiche Hülle um die Eckpunkte, der größte Bereich zuerst.       */
LVK.gebietZonen = [
  { name: "Straßen und Autobahn", klasse: "strasse", dehnung: 22, orte: [
    [50.3833, 8.0667], [50.4836, 8.2622], [50.2268, 8.6182], [50.0956, 8.7761], [50.1109, 8.6821],
    [49.9214, 8.4818], [49.9929, 8.2473], [50.0281, 8.0500], [50.1408, 8.0703] ] },
  { name: "Gewerbe", klasse: "gewerbe", dehnung: 18, orte: [
    [50.1430, 8.1530], [50.0826, 8.2400], [50.2550, 8.2000], [50.1408, 8.0703], [50.2985, 8.2669] ] },
  { name: "Gehwege", klasse: "gehwege", dehnung: 14, orte: [
    [50.1740, 8.1580], [50.1490, 8.1760], [50.1367, 8.1490], [50.1570, 8.1170], [50.1330, 8.1110],
    [50.1408, 8.0703], [50.2189, 8.2704] ] }
];

/* Nur zur Orientierung */
LVK.gebietMarken = [];

/* Grob nachgezeichneter Rheinlauf – hilft beim Einordnen der Karte */
LVK.rheinlauf = [
  [49.9600, 7.8900], [50.0000, 7.9600], [50.0281, 8.0500],
  [50.0400, 8.1400], [50.0350, 8.2100], [50.0000, 8.2700], [49.9300, 8.3400]
];
