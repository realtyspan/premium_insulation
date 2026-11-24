/**
 * Premium Insulation site worker (built from the Data Derivation starter 1.0.0).
 *
 * Cloudflare serves everything in public/ by itself. This script only runs for
 *   - /api/contact      the contact form (wrangler.jsonc: run_worker_first),
 *   - /portfolio/<slug> one job's page: serves the shared portfolio-detail page
 *                       at that address (a rewrite, so the address stays put
 *                       and each job is its own page for Google), and
 *   - addresses with no matching file, which it hands back to the static files
 *     so visitors get public/404.html.
 *
 * Settings (Cloudflare dashboard > this Worker > Settings > Variables and Secrets).
 * The owner types the secret ones in; they never go in this repo.
 *   TURNSTILE_SECRET  secret   Turnstile widget's secret key (spam check)
 *   CONTACT_TO        secret   who receives form messages (kept out of the repo on purpose)
 *   RESEND_API_KEY    secret   only when sending through Resend
 *   CONTACT_FROM      variable sender shown on the email (wrangler.jsonc)
 *   SITE_NAME         variable used in the email subject (wrangler.jsonc)
 *
 * Email is sent by whichever is set up, in this order:
 *   1. Cloudflare Email Sending: a `send_email` binding named EMAIL in wrangler.jsonc
 *   2. Resend: RESEND_API_KEY
 * See .claude/CLAUDE.md "Contact form email" for when to use which.
 */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'no-store',
};

// Field names match the form in public/contact.html.
const LIMITS = { name: 100, contact: 200, county: 60, projectType: 60, insulationType: 60, notes: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return reply(request, 405, { ok: false, error: 'Method not allowed' }, { Allow: 'POST' });
      }
      return handleContact(request, env);
    }

    // One job's page. portfolio-detail.js reads the slug from the address.
    if (/^\/portfolio\/[^/]+\/?$/.test(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      const page = await env.ASSETS.fetch(new Request(new URL('/portfolio-detail', url), request));
      const res = new Response(page.body, page);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        if (k !== 'Cache-Control') res.headers.set(k, v);
      }
      // Keep the temporary preview address out of Google (the real domain is indexed).
      if (url.hostname.endsWith('.workers.dev')) res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }

    // Anything else that reached the worker has no matching file: let the
    // static-files layer answer (this applies the 404 page).
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(request, 400, { ok: false, error: 'Sorry, that message could not be read. Please try again.' });
  }

  const field = (name) => String(form.get(name) ?? '').trim();

  // Honeypot: a hidden field people never see. Bots fill it in; pretend it
  // worked so they don't retry, but send nothing.
  if (field('website')) {
    return reply(request, 200, { ok: true });
  }

  // Single-line fields: squash any line breaks a bot might slip in.
  const line = (name) => field(name).replace(/\s+/g, ' ');
  const data = {
    name: line('name'),
    contact: line('contact'), // phone number OR email address, one box
    county: line('county'),
    projectType: line('project-type'),
    insulationType: line('insulation-type'),
    notes: field('notes'),
  };

  if (!data.name || !data.contact) {
    return reply(request, 400, { ok: false, error: 'Please fill in your name and a phone number or email address.' });
  }
  for (const [key, max] of Object.entries(LIMITS)) {
    if (data[key].length > max) {
      const what = key === 'notes' ? 'project details are' : 'answer is';
      return reply(request, 400, { ok: false, error: `Your ${what} too long. Please shorten it.` });
    }
  }

  if (!env.TURNSTILE_SECRET || !env.CONTACT_TO) {
    console.error('contact form: TURNSTILE_SECRET or CONTACT_TO is not set');
    return reply(request, 500, { ok: false, error: 'The form is not set up yet. Please contact us another way.' });
  }

  const human = await verifyTurnstile(field('cf-turnstile-response'), request, env);
  if (!human) {
    return reply(request, 400, { ok: false, error: 'The security check did not pass. Please try again.' });
  }

  try {
    await sendEmail(data, env);
  } catch (err) {
    // Log the reason, never the message itself (it is personal data).
    console.error('contact form: send failed', err && (err.code || ''), err && err.message);
    return reply(request, 502, { ok: false, error: 'Sorry, your message could not be sent. Please try again in a minute.' });
  }

  return reply(request, 200, { ok: true });
}

async function verifyTurnstile(token, request, env) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = await res.json();
    if (!result.success) console.warn('contact form: turnstile failed', (result['error-codes'] || []).join(','));
    return result.success === true;
  } catch (err) {
    console.error('contact form: turnstile unreachable', err && err.message);
    return false;
  }
}

async function sendEmail(data, env) {
  const oneLine = (s) => s.replace(/[\r\n]+/g, ' ');
  const siteName = env.SITE_NAME || 'your website';
  const subject = oneLine(`New estimate request from ${siteName}: ${data.name}`).slice(0, 200);
  const from = env.CONTACT_FROM || 'Website form <onboarding@resend.dev>';
  const to = env.CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean);
  // The visitor gives a phone number or an email address in one box. Only an
  // email address can be replied to directly.
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) ? data.contact : undefined;
  const text = [
    `Name: ${data.name}`,
    `Phone or email: ${data.contact}`,
    `Property location: ${data.county || '(not given)'}`,
    `Project type: ${data.projectType || '(not given)'}`,
    `Insulation type needed: ${data.insulationType || '(not given)'}`,
    '',
    'Project details:',
    data.notes || '(none given)',
    '',
    '--',
    replyTo
      ? `Sent from the estimate form on ${siteName}. Reply to this email to answer ${data.name}.`
      : `Sent from the estimate form on ${siteName}. ${data.name} gave a phone number, so call them back rather than replying.`,
  ].join('\n');

  // 1. Cloudflare Email Sending (needs the `send_email` binding in wrangler.jsonc)
  if (env.EMAIL && typeof env.EMAIL.send === 'function') {
    await env.EMAIL.send({ to, from, ...(replyTo ? { replyTo } : {}), subject, text });
    return;
  }

  // 2. Resend
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw Object.assign(new Error(`Resend ${res.status} ${detail.slice(0, 300)}`), { code: 'RESEND' });
    }
    return;
  }

  throw Object.assign(new Error('No email sender set up (EMAIL binding or RESEND_API_KEY)'), { code: 'NO_SENDER' });
}

// JSON for the page's script; a redirect back to the contact page for a
// browser that submitted the form without it.
function reply(request, status, body, extraHeaders = {}) {
  const headers = { ...SECURITY_HEADERS, ...extraHeaders };
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (!wantsJson && request.method === 'POST') {
    const back = new URL('/contact', request.url);
    back.searchParams.set(body.ok ? 'sent' : 'error', '1');
    return new Response(null, { status: 303, headers: { ...headers, Location: back.toString() } });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
