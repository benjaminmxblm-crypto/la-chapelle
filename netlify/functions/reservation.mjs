// Demande de réservation : envoie un e-mail à la conciergerie (et au propriétaire)
// et un e-mail de confirmation au client, via Resend.
// Variables d'environnement Netlify :
//   RESEND_API_KEY  (obligatoire)  clé API Resend
//   NOTIFY_EMAILS   (facultatif)   destinataires internes séparés par des virgules
//   MAIL_FROM       (facultatif)   expéditeur, domaine vérifié chez Resend

const CONCIERGE = 'conciergerie.lauragaise11@gmail.com';
const FROM = process.env.MAIL_FROM || 'La Chapelle <reservation@lachapelle-carcassonne.com>';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const isMail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

function longDate(iso, lang) {
  const d = new Date(iso + 'T12:00:00Z');
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
function nights(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function layout(inner) {
  return `<!doctype html><html><body style="margin:0;background:#F7F4EE;font-family:Georgia,'Times New Roman',serif;color:#2B2724">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E2DACD">
<tr><td style="padding:28px 36px;border-bottom:1px solid #E2DACD;text-align:center">
<div style="font-size:24px;letter-spacing:4px;text-transform:uppercase">La Chapelle</div>
<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#86653A;margin-top:6px">Alzonne · Carcassonne</div>
</td></tr>
<tr><td style="padding:32px 36px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A433C">${inner}</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #E2DACD;font-family:Arial,sans-serif;font-size:12px;color:#8A8178;text-align:center">
lachapelle-carcassonne.com · Conciergerie Lauragaise · +33 6 14 29 19 23</td></tr>
</table></td></tr></table></body></html>`;
}
function rows(list) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #E2DACD">${list
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E2DACD;color:#8A8178;width:40%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #E2DACD;color:#2B2724">${v}</td></tr>`)
    .join('')}</table>`;
}

async function send(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

export default async (req) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return new Response('non configuré', { status: 503 });
  if (req.method !== 'POST') return new Response('méthode', { status: 405 });

  let d;
  try { d = await req.json(); } catch { return new Response('json', { status: 400 }); }
  if (d.botcheck) return Response.json({ success: true }); // robot : on ignore sans le dire
  const lang = d.langue === 'en' ? 'en' : 'fr';
  if (!isDate(d.arrivee) || !isDate(d.depart) || d.depart <= d.arrivee || !isMail(d.email) || !d.nom) {
    return Response.json({ success: false, error: 'champs' }, { status: 400 });
  }
  const n = nights(d.arrivee, d.depart);
  const services = Array.isArray(d.services) ? d.services.filter(Boolean).map(String).slice(0, 10) : [];
  const nom = String(d.nom).slice(0, 120), tel = String(d.telephone || '').slice(0, 40), msg = String(d.message || '').slice(0, 3000);
  const inFr = longDate(d.arrivee, 'fr'), outFr = longDate(d.depart, 'fr');
  const guests = `${d.adultes || 1} adulte(s)` + (Number(d.enfants) ? `, ${d.enfants} enfant(s)` : '');

  // 1. À la conciergerie (et au propriétaire)
  const team = (process.env.NOTIFY_EMAILS || CONCIERGE).split(',').map((s) => s.trim()).filter(Boolean);
  const internal = layout(`
<p style="font-family:Georgia,serif;font-size:22px;color:#2B2724;margin:0 0 6px">Nouvelle demande de réservation</p>
<p style="margin:0">${esc(nom)} souhaite séjourner à La Chapelle.</p>
${rows([
    ['Arrivée', esc(inFr)], ['Départ', esc(outFr)], ['Durée', `${n} nuit${n > 1 ? 's' : ''}`], ['Voyageurs', esc(guests)],
    ['Nom', esc(nom)], ['Téléphone', tel ? `<a href="tel:${esc(tel)}" style="color:#86653A">${esc(tel)}</a>` : ''],
    ['E-mail', `<a href="mailto:${esc(d.email)}" style="color:#86653A">${esc(d.email)}</a>`],
    ['Services', esc(services.join(', '))], ['Langue du site', lang === 'en' ? 'Anglais' : 'Français'],
  ])}
${msg ? `<p style="margin:18px 0 6px;color:#8A8178">Message</p><p style="margin:0;white-space:pre-line">${esc(msg)}</p>` : ''}
<p style="margin:24px 0 0;font-size:13px;color:#8A8178">Répondez directement à cet e-mail pour écrire au client.</p>`);

  // 2. Confirmation au client
  const t = lang === 'en'
    ? { subj: 'We have received your request – La Chapelle', h: `Thank you, ${esc(nom.split(' ')[0])}`,
        p: 'We have received your booking request for La Chapelle. Conciergerie Lauragaise will get back to you shortly to confirm availability, the exact price and payment details.',
        a: 'Check-in', b: 'Check-out', s: 'Extras', g: 'Guests', note: 'This is an acknowledgement, not a booking confirmation: your stay is confirmed once you receive the rental agreement.',
        cin: longDate(d.arrivee, 'en'), cout: longDate(d.depart, 'en'), gg: `${d.adultes || 1} adult(s)` + (Number(d.enfants) ? `, ${d.enfants} child(ren)` : '') }
    : { subj: 'Nous avons bien reçu votre demande – La Chapelle', h: `Merci, ${esc(nom.split(' ')[0])}`,
        p: 'Nous avons bien reçu votre demande de réservation pour La Chapelle. La Conciergerie Lauragaise revient vers vous rapidement pour vous confirmer la disponibilité, le prix exact et les modalités de paiement.',
        a: 'Arrivée', b: 'Départ', s: 'Services', g: 'Voyageurs', note: "Ce message accuse réception de votre demande : la réservation est confirmée à la réception du contrat de location.",
        cin: inFr, cout: outFr, gg: guests };
  const client = layout(`
<p style="font-family:Georgia,serif;font-size:24px;color:#2B2724;margin:0 0 12px">${t.h}</p>
<p style="margin:0">${t.p}</p>
${rows([[t.a, esc(t.cin) + (lang === 'en' ? ', from 5 pm' : ', à partir de 17 h')], [t.b, esc(t.cout) + (lang === 'en' ? ', by 10 am' : ', avant 10 h')], [t.g, esc(t.gg)], [t.s, esc(services.join(', '))]])}
<p style="margin:0;font-size:13px;color:#8A8178">${t.note}</p>`);

  try {
    await send(key, {
      from: FROM, to: team, reply_to: d.email,
      subject: `Demande de réservation – ${inFr.replace(/^\w+ /, '')} au ${outFr.replace(/^\w+ /, '')} – ${nom}`,
      html: internal,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: 'envoi' }, { status: 502 });
  }
  try {
    await send(key, { from: FROM, to: [d.email], reply_to: CONCIERGE, subject: t.subj, html: client });
  } catch (e) { console.error(e); /* la demande est partie : on ne bloque pas le client */ }

  return Response.json({ success: true });
};
