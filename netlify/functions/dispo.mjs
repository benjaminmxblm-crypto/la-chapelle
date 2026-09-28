// Lit les calendriers iCal (Airbnb, Booking…) et renvoie les nuits réservées.
// Réglage : dans Netlify > Site configuration > Environment variables,
// créer ICAL_URLS = lien(s) iCal séparés par une virgule.
export default async () => {
  const urls = (process.env.ICAL_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!urls.length) return new Response('ICAL_URLS manquant', { status: 503 });

  const busy = [];
  const toIso = (v) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LaChapelleCalendar/1.0)' } });
      if (!res.ok) continue;
      const text = (await res.text()).replace(/\r?\n[ \t]/g, '');
      for (const ev of text.split('BEGIN:VEVENT').slice(1)) {
        const s = ev.match(/DTSTART[^:]*:(\d{8})/);
        const e = ev.match(/DTEND[^:]*:(\d{8})/);
        if (s && e) busy.push([toIso(s[1]), toIso(e[1])]); // fin exclusive = jour du départ
      }
    } catch (_) { /* un calendrier indisponible n'empêche pas les autres */ }
  }
  return new Response(JSON.stringify({ busy, updated: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
  });
};
