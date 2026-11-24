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

  /* A job's web address (/portfolio/<slug>). .tools/build_jobs.py sets
     job.slug from the job's file name, which the editor never changes, so
     renaming a job keeps its address. The title fallback covers old data. */
  function jobSlug(job) {
    return job.slug || slugify(job.title);
  }

  /* ------------------------------------------------------------------
     Cloudflare image resizing

     Job photos are uploaded through the CMS straight from a phone, at full
     resolution. Rather than ask a non-technical client to resize anything,
     Cloudflare resizes and re-encodes them at the edge:
       /cdn-cgi/image/width=800,quality=78,format=auto/assets/img/jobs/x.jpg
     format=auto picks WebP/AVIF for browsers that support them.

     This only works on a domain whose DNS is on Cloudflare with image
     Transformations switched on (Cloudflare dashboard > the domain > Images >
     Transformations > Enable). The *.workers.dev preview address and local
     preview cannot resize, so they get the photo as uploaded. Add a host to
     RESIZE_HOSTS only after Transformations is on for it, or every portfolio
     photo there breaks.
     ------------------------------------------------------------------ */
  var RESIZE_HOSTS = ['premiuminsulationny.com', 'www.premiuminsulationny.com'];

  function cdnAvailable() {
    return RESIZE_HOSTS.indexOf(window.location.hostname) !== -1;
  }

  function transformable(src) {
    // Only this site's own files; remote or inline images pass through untouched.
    return isLocalPath(src) && cdnAvailable();
  }

  function isLocalPath(src) {
    return !!src && src.charAt(0) === '/' && src.charAt(1) !== '/';
  }

  function imageUrl(src, width) {
    if (!isLocalPath(src)) return src;
    // Encode each part of the path: client filenames routinely contain
    // spaces, parentheses, & and #, which would otherwise break the address
    // (a # cuts it short even without resizing).
    var path = src.split('/').map(function (part) {
      return encodeURIComponent(decodeURIComponentSafe(part));
    }).join('/');
    if (!transformable(src)) return path;
    return '/cdn-cgi/image/width=' + width + ',quality=78,format=auto' + path;
  }

  function decodeURIComponentSafe(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
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
    jobSlug: jobSlug,
    createBASlider: createBASlider,
    fetchJobs: fetchJobs,
    imageUrl: imageUrl,
    applyImage: applyImage
  };
})();
