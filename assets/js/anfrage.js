/* =============================================================================
   LV Kommunal – Anfrage-Funnel
   Vier Schritte statt eines Formulars. Der erste Schritt trennt gewerblich von
   privat, danach unterscheiden sich Objektarten, Flächen und Größenklassen.
   ============================================================================= */
(function () {
  "use strict";

  var wurzel = document.getElementById("funnel");
  if (!wurzel || !window.LVK || !LVK.funnel) return;

  var F = LVK.funnel;
  var $ = function (id) { return document.getElementById(id); };

  var stand = {
    zweig: null, objektart: null, flaechen: [], groesse: null,
    bereitschaft: null, ab: "", ort: ""
  };
  var schritt = 1;
  var LETZTER = 4;
  var schrittEins = document.getElementById("funnel-schritt1");

  /* ------------------------------------------------------------- Bausteine */
  function kachel(o, gross) {
    return '<button type="button" class="wahl' + (gross ? " wahl--gross" : "") + '" data-wert="' + o.wert + '">' +
      '<span class="wahl-ikon">' + LVK.ikon(o.ikon || "flaeche") + "</span>" +
      '<span class="wahl-text"><strong>' + (o.titel || o.wert) + "</strong>" +
      (o.text ? "<small>" + o.text + "</small>" : "") + "</span></button>";
  }

  function knopf(o) {
    return '<button type="button" class="chip" data-wert="' + o.wert + '">' + o.wert + "</button>";
  }

  /* --------------------------------------------------------------- Schritte */
  function zeichne() {
    var b = $("funnel-buehne");
    var kopf = $("funnel-frage");
    var zweig = stand.zweig || "gewerblich";

    if (schritt === 1) {
      kopf.textContent = "Für wen sollen wir räumen?";
      /* Schritt 1 steht als Markup in winterdienst.html, damit der Einstieg
         auch ohne JavaScript sichtbar ist. Er wird nur wieder eingehängt. */
      b.textContent = "";
      b.appendChild(schrittEins);

    } else if (schritt === 2) {
      kopf.textContent = "Um was für ein Objekt geht es?";
      b.innerHTML = '<div class="wahl-gitter">' +
        F.objektart[zweig].map(function (o) { return kachel(o); }).join("") + "</div>";

    } else if (schritt === 3) {
      kopf.textContent = "Was soll geräumt und gestreut werden?";
      b.innerHTML =
        '<p class="funnel-hilfe">Mehrfachauswahl – tippen Sie alles an, was dazugehört.</p>' +
        '<div class="wahl-gitter wahl-gitter--klein" id="funnel-flaechen">' +
          F.flaechen[zweig].map(function (o) {
            var an = stand.flaechen.indexOf(o.wert) > -1;
            return '<button type="button" class="wahl wahl--klein' + (an ? " aktiv" : "") +
              '" data-wert="' + o.wert + '" aria-pressed="' + an + '">' +
              '<span class="wahl-ikon">' + LVK.ikon(o.ikon) + "</span>" +
              '<span class="wahl-text"><strong>' + o.wert + "</strong></span></button>";
          }).join("") +
        "</div>" +

        '<div class="funnel-block"><p class="etikett">Ungefähre Gesamtfläche</p>' +
          '<div class="chips" id="funnel-groesse">' +
            F.groesse[zweig].map(knopf).join("") + "</div></div>" +

        '<div class="funnel-block"><p class="etikett">Gewünschte Einsatzbereitschaft</p>' +
          '<div class="wahl-gitter wahl-gitter--zeile" id="funnel-bereitschaft">' +
            F.bereitschaft.map(function (o) {
              return '<button type="button" class="wahl wahl--zeile" data-wert="' + o.wert + '">' +
                '<span class="wahl-text"><strong>' + o.wert + "</strong><small>" + o.text + "</small></span></button>";
            }).join("") + "</div></div>";

      merkeAuswahl("funnel-groesse", stand.groesse);
      merkeAuswahl("funnel-bereitschaft", stand.bereitschaft);

    } else {
      kopf.textContent = "Wohin dürfen wir das Angebot schicken?";
      b.innerHTML =
        '<ul class="funnel-bilanz" id="funnel-bilanz"></ul>' +
        '<form class="formular" id="funnel-form" novalidate>' +
          '<div class="formular-paar">' +
            '<div><label class="etikett" for="f-name">Name</label>' +
              '<input type="text" id="f-name" autocomplete="name" required></div>' +
            (stand.zweig === "gewerblich"
              ? '<div><label class="etikett" for="f-firma">Firma oder Verwaltung</label>' +
                '<input type="text" id="f-firma" autocomplete="organization"></div>'
              : '<div><label class="etikett" for="f-ort">Ort des Objekts</label>' +
                '<input type="text" id="f-ort" autocomplete="address-level2"></div>') +
          "</div>" +
          '<div class="formular-paar">' +
            '<div><label class="etikett" for="f-mail">E-Mail</label>' +
              '<input type="email" id="f-mail" autocomplete="email" required></div>' +
            '<div><label class="etikett" for="f-tel">Telefon</label>' +
              '<input type="tel" id="f-tel" autocomplete="tel"></div>' +
          "</div>" +
          '<div><label class="etikett" for="f-text">Was sollten wir noch wissen?</label>' +
            '<textarea id="f-text" placeholder="Besondere Gefahrenstellen, Zufahrt, Schlüssel …"></textarea></div>' +
          '<label class="zustimmung"><input type="checkbox" id="f-ok" required>' +
            '<span>Ich habe die <a href="datenschutz.html">Datenschutzerklärung</a> gelesen und bin mit der ' +
            "Speicherung meiner Angaben zur Bearbeitung der Anfrage einverstanden.</span></label>" +
          '<div><button class="btn btn-primaer" type="submit">Angebot anfordern</button></div>' +
          '<p id="funnel-status" aria-live="polite"></p>' +
        "</form>";
      bilanzZeichnen();
      $("funnel-form").addEventListener("submit", absenden);
    }

    aktualisiereLeiste();
    b.classList.remove("funnel-ein");
    void b.offsetWidth;
    b.classList.add("funnel-ein");
  }

  function merkeAuswahl(id, wert) {
    if (!wert) return;
    var box = $(id);
    if (!box) return;
    box.querySelectorAll("[data-wert]").forEach(function (k) {
      var an = k.getAttribute("data-wert") === wert;
      k.classList.toggle("aktiv", an);
      if (k.hasAttribute("aria-pressed")) k.setAttribute("aria-pressed", String(an));
    });
  }

  function bilanzZeichnen() {
    var teile = [];
    if (stand.zweig) teile.push(["Bereich", stand.zweig === "gewerblich" ? "Gewerbe & Verwaltung" : "Privat"]);
    if (stand.objektart) teile.push(["Objekt", stand.objektart]);
    if (stand.flaechen.length) teile.push(["Flächen", stand.flaechen.join(", ")]);
    if (stand.groesse) teile.push(["Größe", stand.groesse]);
    if (stand.bereitschaft) teile.push(["Bereitschaft", stand.bereitschaft]);
    var el = $("funnel-bilanz");
    if (el) el.innerHTML = teile.map(function (t) {
      return "<li><span>" + t[0] + "</span><b>" + t[1] + "</b></li>";
    }).join("");
  }

  function aktualisiereLeiste() {
    $("funnel-fortschritt").style.width = ((schritt - 1) / (LETZTER - 1) * 100) + "%";
    $("funnel-stand").textContent = "Schritt " + schritt + " von " + LETZTER;
    $("funnel-zurueck").hidden = schritt === 1;

    var weiter = $("funnel-weiter");
    weiter.hidden = schritt >= LETZTER;
    if (schritt === 3) {
      weiter.disabled = !(stand.flaechen.length && stand.groesse && stand.bereitschaft);
      weiter.textContent = weiter.disabled ? "Bitte alles auswählen" : "Weiter zur Anfrage";
    }
    wurzel.querySelectorAll(".funnel-punkt").forEach(function (p, i) {
      p.setAttribute("data-erledigt", String(i + 1 < schritt));
      p.setAttribute("data-aktiv", String(i + 1 === schritt));
    });
  }

  function weiterZu(n, ausHistorie) {
    var vorher = schritt;
    schritt = Math.max(1, Math.min(LETZTER, n));
    zeichne();

    /* Jeder Vorwärtsschritt bekommt einen Eintrag in der Browser-Historie.
       Der Zurück-Knopf geht dadurch einen Schritt zurück statt von der Seite. */
    if (!ausHistorie && schritt > vorher) {
      try { history.pushState({ lvkFunnel: schritt }, "", "#kontakt"); } catch (e) {}
    }

    var kasten = wurzel.querySelector(".werkzeug");
    if (kasten) kasten.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  addEventListener("popstate", function (e) {
    var ziel = e.state && e.state.lvkFunnel;
    if (ziel) { weiterZu(ziel, true); return; }
    /* Kein Funnel-Eintrag mehr: zurück auf den ersten Schritt, statt die Seite zu verlassen */
    if (schritt > 1) weiterZu(1, true);
  });

  /* ------------------------------------------------------------- Bedienung */
  $("funnel-buehne").addEventListener("click", function (e) {
    var k = e.target.closest("[data-wert]");
    if (!k) return;
    var wert = k.getAttribute("data-wert");
    var box = k.parentElement;

    if (schritt === 1) {
      stand.zweig = wert; stand.objektart = null; stand.flaechen = []; stand.groesse = null;
      weiterZu(2); return;
    }
    if (schritt === 2) { stand.objektart = wert; weiterZu(3); return; }

    if (box.id === "funnel-flaechen") {
      var i = stand.flaechen.indexOf(wert);
      if (i > -1) stand.flaechen.splice(i, 1); else stand.flaechen.push(wert);
      k.classList.toggle("aktiv");
      k.setAttribute("aria-pressed", String(k.classList.contains("aktiv")));
    } else if (box.id === "funnel-groesse") {
      stand.groesse = wert; merkeAuswahl("funnel-groesse", wert);
    } else if (box.id === "funnel-bereitschaft") {
      stand.bereitschaft = wert; merkeAuswahl("funnel-bereitschaft", wert);
    }
    aktualisiereLeiste();
  });

  $("funnel-weiter").addEventListener("click", function () { weiterZu(schritt + 1); });
  $("funnel-zurueck").addEventListener("click", function () { weiterZu(schritt - 1); });

  wurzel.querySelectorAll(".funnel-punkt").forEach(function (p, i) {
    p.addEventListener("click", function () { if (i + 1 < schritt) weiterZu(i + 1); });
  });

  function absenden(e) {
    e.preventDefault();
    var form = e.target;
    var pflicht = [$("f-name"), $("f-mail"), $("f-ok")];
    var fehlt = pflicht.filter(function (f) { return f.type === "checkbox" ? !f.checked : !f.value.trim(); });
    if (fehlt.length) {
      fehlt[0].focus();
      $("funnel-status").className = "fehler";
      $("funnel-status").textContent = "Bitte Name, E-Mail und die Zustimmung ausfüllen.";
      return;
    }
    LVK.sendeFormular(form, $("funnel-status"), {
      art: "Anfrage-Funnel",
      bereich: stand.zweig,
      objektart: stand.objektart,
      flaechen: stand.flaechen,
      groesse: stand.groesse,
      bereitschaft: stand.bereitschaft,
      name: $("f-name").value,
      firma: ($("f-firma") || {}).value || "",
      ort: ($("f-ort") || {}).value || "",
      email: $("f-mail").value,
      telefon: $("f-tel").value,
      nachricht: $("f-text").value
    });
  }

  zeichne();
})();
