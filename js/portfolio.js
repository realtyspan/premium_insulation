document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  var P = window.PIPortfolio;
  var emptyState = document.getElementById('portfolioEmpty');
  var countyBar = document.getElementById('countyFilters');
  var serviceBar = document.getElementById('serviceFilters');

  var state = { county: 'All', service: 'All' };
  var jobs = [];

  function buildCard(job) {
    var card = P.el('div', 'job-card reveal');
    card.dataset.county = job.county;
    card.dataset.service = job.serviceType;

    var detailUrl = 'portfolio-detail.html?job=' + encodeURIComponent(P.slugify(job.title));

    var slider = P.createBASlider(job.beforeImage, job.afterImage, job.title);
    card.appendChild(slider);

    var body = P.el('div', 'job-card__body');

    var meta = P.el('div', 'job-card__meta');
    var serviceSpan = document.createElement('span');
    serviceSpan.textContent = job.serviceType;
    var countySpan = document.createElement('span');
    countySpan.textContent = '· ' + job.county + ' County';
    meta.appendChild(serviceSpan);
    meta.appendChild(countySpan);

    var titleLink = P.el('a', 'job-card__title-link');
    titleLink.href = detailUrl;
    var title = P.el('h3', 'job-card__title');
    title.textContent = job.title;
    titleLink.appendChild(title);

    body.appendChild(meta);
    body.appendChild(titleLink);

    if (job.caption) {
      var caption = P.el('p', 'job-card__caption');
      caption.textContent = job.caption;
      body.appendChild(caption);
    }

    var viewLink = P.el('a', 'job-card__view-link');
    viewLink.href = detailUrl;
    viewLink.innerHTML = 'View Full Job <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    body.appendChild(viewLink);

    card.appendChild(body);
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

  P.fetchJobs()
    .then(function (data) {
      jobs = data;
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
