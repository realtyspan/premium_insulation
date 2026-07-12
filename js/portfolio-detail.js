document.addEventListener('DOMContentLoaded', function () {
  var P = window.PIPortfolio;
  var mount = document.getElementById('jobDetailMount');
  var notFound = document.getElementById('jobNotFound');
  if (!mount || !P) return;

  var lightbox = setupLightbox();

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('job') || '';

  P.fetchJobs()
    .then(function (jobs) {
      var job = jobs.find(function (j) { return P.slugify(j.title) === slug; });
      if (!job) { showNotFound(); return; }
      renderJob(job);
    })
    .catch(showNotFound);

  function showNotFound() {
    mount.style.display = 'none';
    if (notFound) notFound.style.display = 'block';
  }

  function renderJob(job) {
    document.title = job.title + ' | Job Portfolio | Premium Insulation, Inc.';

    document.getElementById('jobTitle').textContent = job.title;
    document.getElementById('jobMetaService').textContent = job.serviceType;
    document.getElementById('jobMetaCounty').textContent = job.county + ' County';

    var captionEl = document.getElementById('jobCaption');
    if (job.caption) {
      captionEl.textContent = job.caption;
    } else {
      captionEl.style.display = 'none';
    }

    document.getElementById('jobHeroSlider').appendChild(
      P.createBASlider(job.beforeImage, job.afterImage, job.title)
    );

    var photos = [
      { src: job.beforeImage, label: 'Before' },
      { src: job.afterImage, label: 'After' }
    ].concat((job.gallery || []).map(function (src) { return { src: src, label: null }; }));

    var thumbGrid = document.getElementById('jobThumbGrid');
    photos.forEach(function (photo, index) {
      var thumb = P.el('button', 'job-thumb reveal');
      thumb.type = 'button';
      thumb.setAttribute('aria-label', 'View larger photo ' + (index + 1) + ' of ' + photos.length);

      var img = P.el('img', 'job-thumb__img');
      img.src = photo.src;
      img.alt = job.title + (photo.label ? ' — ' + photo.label : ' — additional photo ' + (index + 1));
      img.loading = 'lazy';
      thumb.appendChild(img);

      if (photo.label) {
        var tag = P.el('span', 'job-thumb__tag');
        tag.textContent = photo.label;
        thumb.appendChild(tag);
      }

      thumb.addEventListener('click', function () { lightbox.open(photos, index); });
      thumbGrid.appendChild(thumb);
    });

    requestAnimationFrame(function () {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
        el.classList.add('is-visible');
      });
    });
  }

  function setupLightbox() {
    var overlay = document.getElementById('lightbox');
    var imgEl = document.getElementById('lightboxImg');
    var counter = document.getElementById('lightboxCounter');
    var photos = [];
    var current = 0;

    function show(i) {
      current = (i + photos.length) % photos.length;
      imgEl.src = photos[current].src;
      imgEl.alt = photos[current].label || ('Photo ' + (current + 1));
      counter.textContent = (current + 1) + ' / ' + photos.length;
    }

    function open(photoList, index) {
      photos = photoList;
      show(index);
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    document.getElementById('lightboxClose').addEventListener('click', close);
    document.getElementById('lightboxPrev').addEventListener('click', function () { show(current - 1); });
    document.getElementById('lightboxNext').addEventListener('click', function () { show(current + 1); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    return { open: open };
  }
});
