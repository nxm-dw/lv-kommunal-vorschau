/* =============================================================================
   LV Kommunal – Hero
   Über dem Foto liegt leichter Schneefall, sonst nichts. Die Flockengröße
   steuert alles Weitere: größere Flocken gelten als näher, sind heller und
   fallen schneller. Das ergibt Tiefe, ohne nach Bildschirmschoner auszusehen.
   Dazu eine leichte Parallaxe – das Foto wandert langsamer als die Seite.
   ============================================================================= */
(function () {
  "use strict";

  var hero = document.getElementById("hero");
  var leinwand = document.getElementById("raeum-canvas");
  if (!hero) return;

  /* --------------------------------------------------------------- Schneefall */
  if (leinwand && leinwand.getContext) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      leinwand.remove();
      leinwand = null;
    } else {
      schneefall(leinwand);
    }
  }

  function schneefall(leinwand) {
    var ctx = leinwand.getContext("2d");
    var B = 0, H = 0, dpr = 1;
    var flocken = [];
    var laeuft = false, vorher = 0;

    function masse() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      B = Math.round(r.width);
      H = Math.round(r.height);
      leinwand.width = B * dpr;
      leinwand.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baueFlocken();
    }

    function baueFlocken() {
      var n = Math.round(Math.min(150, (B * H) / 13000));
      flocken = [];
      for (var i = 0; i < n; i++) {
        /* Hoch 1,7 verschiebt die Verteilung: viele kleine, wenige große */
        var g = Math.pow(Math.random(), 1.7);
        flocken.push({
          x: Math.random() * B,
          y: Math.random() * H,
          r: 0.55 + g * 1.95,
          v: 0.14 + g * 0.5,
          seit: Math.random() * 6.28,
          weite: 0.12 + g * 0.42,
          a: 0.26 + g * 0.44
        });
      }
    }

    function zeichne(dt) {
      ctx.clearRect(0, 0, B, H);
      ctx.fillStyle = "#FFFFFF";
      for (var i = 0; i < flocken.length; i++) {
        var f = flocken[i];
        f.y += f.v * dt;
        f.seit += 0.011 * dt;
        f.x += Math.sin(f.seit) * f.weite;
        if (f.y > H + 6) { f.y = -6; f.x = Math.random() * B; }
        if (f.x < -6) f.x = B + 6;
        if (f.x > B + 6) f.x = -6;

        ctx.globalAlpha = f.a;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.284);
        ctx.fill();

        /* Nur die vorderen Flocken bekommen einen weichen Hof */
        if (f.r > 1.7) {
          ctx.globalAlpha = f.a * 0.2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 2.1, 0, 6.284);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function schleife(jetzt) {
      if (!laeuft) return;
      var dt = vorher ? Math.min(3, (jetzt - vorher) / 16.7) : 1;
      vorher = jetzt;
      zeichne(dt);
      requestAnimationFrame(schleife);
    }

    function an() { if (!laeuft) { laeuft = true; vorher = 0; requestAnimationFrame(schleife); } }
    function aus() { laeuft = false; }

    masse();
    an();

    var neuMessen;
    addEventListener("resize", function () {
      clearTimeout(neuMessen);
      neuMessen = setTimeout(masse, 180);
    }, { passive: true });

    /* Außerhalb des Bildes wird nicht gerechnet */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) an(); else aus();
      }, { threshold: 0 }).observe(hero);
    }
  }

  /* ---------------------------------------------------------------- Parallaxe */
  var parallaxeLaeuft = false;
  addEventListener("scroll", function () {
    if (parallaxeLaeuft) return;
    parallaxeLaeuft = true;
    requestAnimationFrame(function () {
      parallaxeLaeuft = false;
      var oben = hero.getBoundingClientRect().top;
      if (oben > 0 || oben < -hero.offsetHeight) return;
      var foto = hero.querySelector(".hero-bild");
      if (foto) foto.style.setProperty("--py", (-oben * 0.14).toFixed(1) + "px");
    });
  }, { passive: true });
})();
