# La Chapelle – site de réservation directe

Site vitrine du studio « La Chapelle » à Alzonne (Aude), hébergé sur Netlify.

- `index.html` (FR) et `en/` (EN) : pages du site
- `netlify/functions/dispo.mjs` : lit les calendriers iCal (variable d'environnement `ICAL_URLS`, jamais dans le code)
- Formulaire de réservation : Netlify Forms, notifications envoyées à la conciergerie
