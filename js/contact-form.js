document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('form[name="contact"]');
  var success = document.getElementById('form-success');
  if (!form || !success) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

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
        alert('Sorry, something went wrong sending your request. Please call us at 845-758-1147.');
      });
  });
});
