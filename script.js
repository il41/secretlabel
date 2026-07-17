(function () {

  /* ── noise config ── */
  var NOISE = {
    speed:     1.2,
    complexity: 3,
    intensity: 6,
    drift:     2.15,
    rippleSpeed:  0.8,   // turbulence frequency animation speed
    rippleScale:  18,    // max displacement in px
    rippleDetail: 0.015, // turbulence base frequency
  };

  /* ── elements ── */
  var splash      = document.getElementById("splash");
  var logo        = document.getElementById("splash-logo");
  var hint        = splash.querySelector(".hint");
  var nodes       = logo.querySelectorAll("[data-noise]");
  var site        = document.getElementById("site");
  var exiting     = false;

  /* turbulence + displacement per letter */
  var turbS    = document.getElementById("turb-s");
  var turbL    = document.getElementById("turb-l");
  var dispS    = document.querySelector("#ripple-s feDisplacementMap");
  var dispL    = document.querySelector("#ripple-l feDisplacementMap");
  var seedS    = 1;
  var seedL    = 7;

  /* ── layered sine noise ── */
  function noise(t, seed) {
    var v = 0;
    for (var i = 1; i <= NOISE.complexity; i++) {
      var freq = NOISE.speed * i * 0.7;
      var amp  = 1 / i;
      v += Math.sin(t * freq + seed * i * 1.7) * amp;
    }
    return v;
  }

  /* ── per-node state ── */
  var nodeState = [];
  for (var i = 0; i < nodes.length; i++) {
    nodeState.push({
      el:        nodes[i],
      origTransform: nodes[i].getAttribute("transform") || "",
      seedX:     Math.random() * 1000,
      seedY:     Math.random() * 1000,
      seedR:     Math.random() * 1000,
      seedS:     Math.random() * 1000,
      phaseOff:  Math.random() * Math.PI * 2,
      driftX:    0,
      driftY:    0,
      driftR:    0,
    });
  }

  /* ── animation loop ── */
  var startTime = performance.now();
  var raf;

  function animate(now) {
    if (exiting) return;
    var t = (now - startTime) / 1000;

    /* transform noise per node */
    for (var i = 0; i < nodeState.length; i++) {
      var s = nodeState[i];
      var pt = t + s.phaseOff;

      s.driftX += noise(t * NOISE.drift, s.seedX) * 0.02;
      s.driftY += noise(t * NOISE.drift, s.seedY) * 0.02;
      s.driftR += noise(t * NOISE.drift, s.seedR) * 0.002;

      var dx = noise(pt, s.seedX) * NOISE.intensity + s.driftX;
      var dy = noise(pt, s.seedY) * NOISE.intensity + s.driftY;
      var dr = noise(pt, s.seedR) * NOISE.intensity * 3;
      var ds = 1 + noise(pt, s.seedS) * 0.04;

      s.el.setAttribute("transform",
        "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ") " +
        "rotate(" + dr.toFixed(2) + " 100 100) " +
        "scale(" + ds.toFixed(4) + ") " +
        s.origTransform
      );
    }

    /* ripple: animate turbulence frequency per letter */
    var rippleT = t * NOISE.rippleSpeed;
    var freqS = NOISE.rippleDetail + Math.sin(rippleT * 1.1 + 0.3) * 0.008;
    var freqL = NOISE.rippleDetail + Math.sin(rippleT * 0.9 + 2.1) * 0.008;
    turbS.setAttribute("baseFrequency", freqS.toFixed(4));
    turbL.setAttribute("baseFrequency", freqL.toFixed(4));

    /* ripple: animate displacement scale per letter */
    var scaleS = (Math.sin(rippleT * 0.7 + 1.0) * 0.5 + 0.5) * NOISE.rippleScale;
    var scaleL = (Math.sin(rippleT * 0.6 + 3.2) * 0.5 + 0.5) * NOISE.rippleScale;
    dispS.setAttribute("scale", scaleS.toFixed(2));
    dispL.setAttribute("scale", scaleL.toFixed(2));

    /* ripple: slowly shift turbulence seed for organic motion */
    var newSeedS = Math.floor(t * 0.3) + 1;
    var newSeedL = Math.floor(t * 0.25) + 7;
    if (newSeedS !== seedS) {
      seedS = newSeedS;
      turbS.setAttribute("seed", seedS);
    }
    if (newSeedL !== seedL) {
      seedL = newSeedL;
      turbL.setAttribute("seed", seedL);
    }

    raf = requestAnimationFrame(animate);
  }

  raf = requestAnimationFrame(animate);

  /* ── click handler: explode outward ── */
  splash.addEventListener("click", function () {
    if (exiting) return;
    exiting = true;

    hint.classList.add("hidden");
    logo.classList.add("explode-out");

    /* ramp up turbulence during expand */
    var explodeStart = performance.now();
    function explodeAnimate(now) {
      var elapsed = (now - explodeStart) / 1000;
      if (elapsed > 2) return;
      var progress = elapsed / 2;
      var ramp = progress * 40;
      var freq = 0.015 + progress * 0.06;
      turbS.setAttribute("baseFrequency", freq.toFixed(4));
      turbL.setAttribute("baseFrequency", (freq * 1.1).toFixed(4));
      dispS.setAttribute("scale", ramp.toFixed(2));
      dispL.setAttribute("scale", (ramp * 0.8).toFixed(2));
      requestAnimationFrame(explodeAnimate);
    }
    requestAnimationFrame(explodeAnimate);

    setTimeout(function () {
      splash.classList.add("done");
      site.classList.add("visible");
    }, 1200);

    setTimeout(function () {
      var releases = document.querySelector(".releases-section");
      if (releases) releases.classList.remove("closed");
    }, 2200);
  });

  /* ── Release modal ── */
  var modal        = document.getElementById("modal");
  var modalBackdrop = modal.querySelector(".modal-backdrop");
  var modalClose   = modal.querySelector(".modal-close");
  var modalImg     = modal.querySelector(".modal-img");
  var modalCatalog = modal.querySelector(".modal-catalog");
  var modalTitle   = modal.querySelector(".modal-title");
  var modalArtist  = modal.querySelector(".modal-artist");
  var modalDate    = modal.querySelector(".modal-date");
  var modalBrief   = modal.querySelector(".modal-brief");
  var modalLink    = modal.querySelector(".modal-link");
  var modalBandcamp = modal.querySelector(".modal-bandcamp");

  function buildEmbed(id, type, linkcol) {
    if (!id) return "";
    var param = (type === "track" ? "track=" : "album=") + id;
    var height = type === "track" ? "120px" : "373px";
    return '<iframe style="border:0;width:100%;height:' + height + ';" src="https://bandcamp.com/EmbeddedPlayer/' + param + '/size=large/bgcol=ffffff/linkcol=' + (linkcol || "0687f5") + '/artwork=small/transparent=true/" seamless></iframe>';
  }

  function openModal(card) {
    var bandcampUrl = card.dataset.bandcamp;
    modalImg.src         = card.dataset.img;
    modalImg.alt         = card.dataset.alt;
    modalCatalog.textContent = card.dataset.catalog;
    modalTitle.textContent   = card.dataset.title;
    modalArtist.textContent  = card.dataset.artist;
    modalDate.textContent    = card.dataset.date;
    modalBrief.innerHTML     = card.dataset.brief;
    modalLink.href          = bandcampUrl;
    modalBandcamp.innerHTML = buildEmbed(card.dataset.embed, card.dataset.embedType, card.dataset.linkcol);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  var cards = document.querySelectorAll(".card[data-bandcamp]");
  for (var c = 0; c < cards.length; c++) {
    cards[c].addEventListener("click", function () {
      openModal(this);
    });
  }

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

})();
