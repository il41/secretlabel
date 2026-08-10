(function () {

  /* ── noise config ── */
  var NOISE = {
    speed:     1.2,
    complexity: 3,
    intensity: 6,
    drift:     2.15,
  };

  /* ── elements ── */
  var splash      = document.getElementById("splash");
  var logo        = document.getElementById("splash-logo");
  var hint        = splash.querySelector(".hint");
  var nodes       = logo.querySelectorAll("[data-noise]");
  var site        = document.getElementById("site");
  var exiting     = false;

  /* turbulence + displacement per letter — displacement stays at scale 0
     (no ripple) until the opening animation ramps it up. */
  var turbS    = document.getElementById("turb-s");
  var turbL    = document.getElementById("turb-l");
  var dispS    = document.querySelector("#ripple-s feDisplacementMap");
  var dispL    = document.querySelector("#ripple-l feDisplacementMap");
  dispS.setAttribute("scale", "0");
  dispL.setAttribute("scale", "0");

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
      if (releases) {
        releases.classList.remove("closed");
        setTimeout(function () {
          releases.classList.add("done");
        }, 1200);
      }
    }, 2200);
  });

  /* ── Release modal ── */
  var modal        = document.getElementById("modal");
  var modalBody    = modal.querySelector(".modal-body");
  var modalBackdrop = modal.querySelector(".modal-backdrop");
  var modalClose   = modal.querySelector(".modal-close");

  function buildEmbed(id, type, linkcol) {
    if (!id) return "";
    var param = (type === "track" ? "track=" : "album=") + id;
    var height = type === "track" ? "120px" : "373px";
    return '<iframe style="border:0;width:100%;height:' + height + ';" src="https://bandcamp.com/EmbeddedPlayer/' + param + '/size=large/bgcol=ffffff/linkcol=' + (linkcol || "0687f5") + '/artwork=small/transparent=true/" seamless></iframe>';
  }

  /* Turn any number of <img>s into a hero image + clickable thumbnail row. */
  function buildGallery(imgs) {
    if (!imgs || !imgs.length) return null;

    var wrap = document.createElement("div");
    wrap.className = "modal-gallery";

    var hero = imgs[0].cloneNode(false);
    hero.className = "modal-hero";
    wrap.appendChild(hero);

    if (imgs.length > 1) {
      var thumbs = document.createElement("div");
      thumbs.className = "modal-thumbs";
      imgs.forEach(function (img, i) {
        var t = img.cloneNode(false);
        t.className = "modal-thumb" + (i === 0 ? " active" : "");
        t.addEventListener("click", function () {
          hero.src = t.getAttribute("src");
          hero.alt = t.getAttribute("alt") || "";
          var actives = thumbs.querySelectorAll(".active");
          for (var a = 0; a < actives.length; a++) actives[a].classList.remove("active");
          t.classList.add("active");
        });
        thumbs.appendChild(t);
      });
      wrap.appendChild(thumbs);
    }
    return wrap;
  }

  /* Copy the card's catalog/title/artist/date lines into the modal header. */
  function buildInfo(card) {
    var text = card.querySelector(".card-text");
    if (!text) return null;

    var info = document.createElement("div");
    info.className = "modal-info";

    var catalog = text.querySelector(".card-catalog");
    if (catalog) {
      var c = document.createElement("span");
      c.className = "modal-catalog";
      c.textContent = catalog.textContent;
      info.appendChild(c);
    }

    var title = text.querySelector(".card-title");
    if (title) {
      var t = document.createElement("h2");
      t.className = "modal-title";
      t.innerHTML = title.innerHTML;
      info.appendChild(t);
    }

    var artist = text.querySelector(".card-artist");
    if (artist) {
      var a = document.createElement("span");
      a.className = "modal-artist";
      a.textContent = artist.textContent;
      info.appendChild(a);
    }

    var dates = text.querySelectorAll(".card-date");
    dates.forEach(function (d) {
      var dd = document.createElement("span");
      dd.className = "modal-date";
      dd.textContent = d.textContent;
      info.appendChild(dd);
    });

    return info;
  }

  /* Fill in the dynamic pieces of a cloned template. Every section is
     optional — omit any of them and that part simply doesn't render. */
  function buildModal(node, card) {
    var anchor = null;

    var imgsBox = node.querySelector(".modal-imgs");
    if (imgsBox && imgsBox.querySelector("img")) {
      var imgs = Array.prototype.slice.call(imgsBox.querySelectorAll("img"));
      var gallery = buildGallery(imgs);
      imgsBox.parentNode.replaceChild(gallery, imgsBox);
      anchor = gallery;
    }

    var info = buildInfo(card);
    if (info) {
      if (anchor) {
        anchor.parentNode.insertBefore(info, anchor.nextSibling);
      } else {
        node.insertBefore(info, node.firstChild);
      }
    }

    var embedBox = node.querySelector(".modal-bandcamp");
    if (embedBox) {
      var embedId = embedBox.getAttribute("data-embed");
      if (embedId) {
        embedBox.innerHTML = buildEmbed(
          embedId,
          embedBox.getAttribute("data-embed-type"),
          embedBox.getAttribute("data-linkcol")
        );
      } else {
        embedBox.parentNode.removeChild(embedBox);
      }
    }
  }

  function openModal(card) {
    var tpl = card.querySelector(".card-modal");
    if (!tpl) return;

    modalBody.innerHTML = "";

    try {
      var node = document.importNode(tpl.content, true);
      buildModal(node, card);
      modalBody.appendChild(node);
    } catch (e) {
      console.error("modal render failed:", e);
    }

    modal.querySelector(".modal-panel").scrollTop = 0;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  var cards = document.querySelectorAll(".card");
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
