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

  function createBASlider(beforeSrc, afterSrc, title) {
    var slider = el('div', 'ba-slider');

    var afterImg = el('img', 'ba-slider__img ba-slider__after');
    afterImg.src = afterSrc;
    afterImg.alt = title + ' — after';
    afterImg.loading = 'lazy';
    slider.appendChild(afterImg);

    var beforeWrap = el('div', 'ba-slider__before-wrap');
    var beforeImg = el('img', 'ba-slider__img ba-slider__before');
    beforeImg.src = beforeSrc;
    beforeImg.alt = title + ' — before';
    beforeImg.loading = 'lazy';
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
    return fetch('content/jobs.json')
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
    fetchJobs: fetchJobs
  };
})();
