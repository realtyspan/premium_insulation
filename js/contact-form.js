document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('form[name="contact"]');
  var success = document.getElementById('form-success');
  if (!form || !success) return;

  var errorEl = document.getElementById('form-error');
  var submitBtn = document.getElementById('form-submit');
  var submitLabel = submitBtn ? submitBtn.textContent : '';

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    setBusy(true);

    var data = new FormData(form);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString()
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Form submission failed');
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function () {
        // Keep the filled-in form on screen so nothing has to be retyped.
        setBusy(false);
        showError('That request didn’t go through. Please try again, or call us at 845-758-1147.');
      });
  });
});
