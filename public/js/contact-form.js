/* Contact form: sends to /api/contact (src/worker.js, which emails the client)
   and shows the inline thank-you message instead of leaving the page.

   Turnstile (Cloudflare's free "are you human" check) is rendered here rather
   than automatically, so local preview can use Cloudflare's test key while the
   live site uses the real one from data-sitekey in contact.html. */

(function () {
  'use strict';

  var TEST_SITEKEY = '1x00000000000000000000AA'; // Cloudflare's official always-pass test key
  var FALLBACK = 'That request didn’t go through. Please try again, or call us at 845-758-1147.';

  var form = document.getElementById('contact-form');
  var success = document.getElementById('form-success');
  if (!form || !success) return;

  var errorEl = document.getElementById('form-error');
  var submitBtn = document.getElementById('form-submit');
  var submitLabel = submitBtn ? submitBtn.textContent : '';
  var widgetBox = document.getElementById('turnstile');
  var widgetId = null;

  function isLocal() {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }

  // Called by the Turnstile script once it has loaded (see ?onload= in contact.html).
  window.onTurnstileLoad = function () {
    if (!widgetBox || !window.turnstile) return;
    widgetId = window.turnstile.render(widgetBox, {
      sitekey: isLocal() ? TEST_SITEKEY : widgetBox.getAttribute('data-sitekey'),
      theme: 'light'
    });
  };

  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Sending…' : submitLabel;
  }

  // Fallback for browsers that sent the form without this script.
  var params = new URLSearchParams(location.search);
  if (params.get('sent') === '1') showSuccess();
  if (params.get('error') === '1') showError(FALLBACK);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    if (!form.reportValidity()) return;

    var data = new FormData(form);
    if (!data.get('cf-turnstile-response')) {
      showError('Please wait a moment for the security check to finish, then press the button again.');
      return;
    }

    setBusy(true);
    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok || !body.ok) throw new Error(body.error || 'failed');
          showSuccess();
        });
      })
      .catch(function (err) {
        // Keep the filled-in form on screen so nothing has to be retyped.
        setBusy(false);
        var msg = err && err.message && err.message !== 'failed' && err.message !== 'Failed to fetch'
          ? err.message
          : FALLBACK;
        showError(msg);
        // Each security-check pass can be used once, so get a fresh one.
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      });
  });
})();
