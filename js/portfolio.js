document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  var emptyState = document.getElementById('portfolioEmpty');
  var countyBar = document.getElementById('countyFilters');
  var serviceBar = document.getElementById('serviceFilters');

  var state = { county: 'All', service: 'All' };
  var jobs = [];

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function initSlider(slider) {
    var beforeWrap = slider.querySelector('.ba-slider__before-wrap');
    var handle = slider.querySelector('.ba-slider__handle');
    var dragging = false;

    function setPos(percent) {
      percent = Math.max(0, Math.min(100, percent));
      beforeWrap.style.clipPath = 'inset(0 ' + (100 - percent) + '% 0 0)';
      handle.style.left = percent + '%';
      handle.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    function posFromEvent(e) {
      var rect = slider.getBoundingClientRect();
      var clientX = e.clientX;
      return ((clientX - rect.left) / rect.width) * 100;
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

  function buildCard(job) {
    var card = el('div', 'job-card reveal');
    card.dataset.county = job.county;
    card.dataset.service = job.serviceType;

    var slider = el('div', 'ba-slider');

    var afterImg = el('img', 'ba-slider__img ba-slider__after');
    afterImg.src = job.afterImage;
    afterImg.alt = job.title + ' — after';
    afterImg.loading = 'lazy';
    slider.appendChild(afterImg);

    var beforeWrap = el('div', 'ba-slider__before-wrap');
    var beforeImg = el('img', 'ba-slider__img ba-slider__before');
    beforeImg.src = job.beforeImage;
    beforeImg.alt = job.title + ' — before';
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
    handle.setAttribute('aria-label', 'Drag to compare before and after photos for ' + job.title);
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-valuenow', '50');
    slider.appendChild(handle);

    var body = el('div', 'job-card__body');

    var meta = el('div', 'job-card__meta');
    var serviceSpan = document.createElement('span');
    serviceSpan.textContent = job.serviceType;
    var countySpan = document.createElement('span');
    countySpan.textContent = '· ' + job.county + ' County';
    meta.appendChild(serviceSpan);
    meta.appendChild(countySpan);

    var title = el('h3', 'job-card__title');
    title.textContent = job.title;

    body.appendChild(meta);
    body.appendChild(title);

    if (job.caption) {
      var caption = el('p', 'job-card__caption');
      caption.textContent = job.caption;
      body.appendChild(caption);
    }

    card.appendChild(slider);
    card.appendChild(body);
    initSlider(slider);
    return card;
  }

  function render() {
    grid.innerHTML = '';
    var filtered = jobs.filter(function (job) {
      var countyMatch = state.county === 'All' || job.county === state.county;
      var serviceMatch = state.service === 'All' || job.serviceType === state.service;
      return countyMatch && serviceMatch;
    });

    if (!filtered.length) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(function (job) {
      grid.appendChild(buildCard(job));
    });

    requestAnimationFrame(function () {
      grid.querySelectorAll('.reveal').forEach(function (card) {
        card.classList.add('is-visible');
      });
    });
  }

  function wireFilterBar(barEl, key) {
    if (!barEl) return;
    barEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-chip');
      if (!btn) return;
      barEl.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state[key] = btn.dataset.value;
      render();
    });
  }

  wireFilterBar(countyBar, 'county');
  wireFilterBar(serviceBar, 'service');

  fetch('content/jobs.json')
    .then(function (res) {
      if (!res.ok) throw new Error('jobs.json not found');
      return res.json();
    })
    .then(function (data) {
      jobs = data.jobs || [];
      render();
    })
    .catch(function () {
      jobs = [];
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.textContent = 'Our portfolio is being updated — check back soon.';
      }
    });
});
