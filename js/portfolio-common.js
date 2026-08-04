window.PIPortfolio = (function () {

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ------------------------------------------------------------------
     Netlify Image CDN

     Job photos are uploaded through the CMS straight from a phone, at full
     resolution. Rather than ask a non-technical client to resize anything,
     Netlify's image endpoint resizes and re-encodes them at the edge, and
     negotiates WebP/AVIF from the browser's Accept header on its own. It
     needs no build step and no configuration for local site assets.

     server.ps1 mirrors the endpoint (serving the original file, unresized) so
     local preview exercises these same URLs rather than a separate code path.
     ------------------------------------------------------------------ */
  var CDN_ENDPOINT = '/.netlify/images';

  function cdnAvailable() {
    // Opening the files directly from disk has no server to answer the
    // endpoint; everything else (local preview or Netlify) does.
    return window.location.protocol !== 'file:';
  }

  function transformable(src) {
    // Remote sources would need an [images] remote_images allowlist in
    // netlify.toml, so pass them through untouched rather than 404.
    return !!src && !/^https?:\/\//i.test(src) && !/^data:/i.test(src) && cdnAvailable();
  }

  function imageUrl(src, width) {
    if (!transformable(src)) return src;
    return CDN_ENDPOINT + '?url=' + encodeURIComponent(src) + '&w=' + width + '&q=78';
  }

  function imageSrcset(src, widths) {
    if (!transformable(src)) return '';
    return widths.map(function (w) {
      return imageUrl(src, w) + ' ' + w + 'w';
    }).join(', ');
  }

  /* Points an <img> at the CDN, with a srcset so a phone does not download a
     desktop-sized crop. `sizes` should describe the slot the image renders in. */
  function applyImage(img, src, opts) {
    opts = opts || {};
    var widths = opts.widths || [400, 800];
    var largest = widths[widths.length - 1];

    img.src = imageUrl(src, largest);

    var srcset = imageSrcset(src, widths);
    if (srcset) {
      img.srcset = srcset;
      if (opts.sizes) img.sizes = opts.sizes;
    }

    // The detail page's hero slider is above the fold — lazy-loading it would
    // delay the largest contentful paint.
    if (opts.eager) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    } else {
      img.loading = 'lazy';
      img.decoding = 'async';
    }
  }

  function initSlider(slider, beforeWrap, handle) {
    var dragging = false;

    function setPos(percent) {
      percent = Math.max(0, Math.min(100, percent));
      beforeWrap.style.clipPath = 'inset(0 ' + (100 - percent) + '% 0 0)';
      handle.style.left = percent + '%';
      handle.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    function posFromEvent(e) {
      var rect = slider.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    }

    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      setPos(posFromEvent(e));
    });
    slider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      setPos(posFromEvent(e));
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      slider.addEventListener(evt, function () { dragging = false; });
    });

    handle.addEventListener('keydown', function (e) {
      var current = parseFloat(handle.style.left) || 50;
      if (e.key === 'ArrowLeft') { setPos(current - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(current + 5); e.preventDefault(); }
    });

    setPos(50);
  }

  function createBASlider(beforeSrc, afterSrc, title, opts) {
    var slider = el('div', 'ba-slider');

    var afterImg = el('img', 'ba-slider__img ba-slider__after');
    afterImg.alt = title + ' — after';
    applyImage(afterImg, afterSrc, opts);
    slider.appendChild(afterImg);

    var beforeWrap = el('div', 'ba-slider__before-wrap');
    var beforeImg = el('img', 'ba-slider__img ba-slider__before');
    beforeImg.alt = title + ' — before';
    applyImage(beforeImg, beforeSrc, opts);
    beforeWrap.appendChild(beforeImg);
    slider.appendChild(beforeWrap);

    var tagBefore = el('span', 'ba-slider__tag ba-slider__tag--before');
    tagBefore.textContent = 'Before';
    var tagAfter = el('span', 'ba-slider__tag ba-slider__tag--after');
    tagAfter.textContent = 'After';
    slider.appendChild(tagBefore);
    slider.appendChild(tagAfter);

    var handle = el('div', 'ba-slider__handle');
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', 'Drag to compare before and after photos for ' + title);
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-valuenow', '50');
    slider.appendChild(handle);

    initSlider(slider, beforeWrap, handle);
    return slider;
  }

  function fetchJobs() {
    // Root-relative: the detail page is also served from /portfolio/<slug>,
    // where a relative path would resolve to /portfolio/content/jobs.json.
    return fetch('/content/jobs.json')
      .then(function (res) {
        if (!res.ok) throw new Error('jobs.json not found');
        return res.json();
      })
      .then(function (data) { return data.jobs || []; });
  }

  return {
    el: el,
    slugify: slugify,
    createBASlider: createBASlider,
    fetchJobs: fetchJobs,
    imageUrl: imageUrl,
    applyImage: applyImage
  };
})();
