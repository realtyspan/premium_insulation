document.addEventListener('DOMContentLoaded', function () {

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Footer copyright year — the markup carries a static year so it stays
     correct with JS disabled; this just keeps it from going stale. */
  document.querySelectorAll('.js-year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Sticky header shrink */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile drawer */
  var toggle = document.querySelector('.nav__toggle');
  var drawer = document.querySelector('.mobile-drawer');
  var closeBtn = document.querySelector('.mobile-drawer__close');

  if (toggle && drawer) {
    var drawerLinks = drawer.querySelectorAll('a');

    var openDrawer = function () {
      drawer.classList.add('open');
      // `inert` is what actually keeps the panel out of the tab order and the
      // accessibility tree while it sits off screen; the transform alone does
      // not. aria-hidden is kept in sync for browsers that predate inert.
      drawer.inert = false;
      drawer.removeAttribute('aria-hidden');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (drawerLinks.length) drawerLinks[0].focus();
    };

    var closeDrawer = function (returnFocus) {
      drawer.classList.remove('open');
      // Move focus out before inerting, or it lands on <body> and the caller's
      // returnFocus is silently lost.
      if (returnFocus) toggle.focus();
      drawer.inert = true;
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    // Starting state, so assistive tech never sees the off-screen links.
    closeDrawer(false);

    toggle.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', function () { closeDrawer(true); });

    drawerLinks.forEach(function (a) {
      a.addEventListener('click', function () { closeDrawer(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;

      if (e.key === 'Escape') {
        closeDrawer(true);
        return;
      }

      // Keep Tab inside the drawer while it covers the page.
      if (e.key !== 'Tab') return;
      var focusable = [closeBtn].concat(Array.prototype.slice.call(drawerLinks)).filter(Boolean);
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    });
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Counter animation */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var settle = function (el) {
      el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
    };

    // Counting numbers up is motion too — honour the same preference the
    // hero and scroll reveals do, and just show the final figure.
    if (reduceMotion || !('IntersectionObserver' in window)) {
      counters.forEach(settle);
    } else {
      var countIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          var suffix = el.getAttribute('data-suffix') || '';
          var duration = 1400;
          var start = null;

          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          countIo.unobserve(el);
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { countIo.observe(el); });
    }
  }

});
