# La Chapelle – site de réservation directe

Site vitrine du studio « La Chapelle » à Alzonne (Aude), hébergé chez OVH (offre Pro, PHP).

- `index.html` (FR) et `en/` (EN) : pages du site
- `api/dispo.php` : lit le calendrier Airbnb (cache de 15 minutes dans `api/cache/`)
- `api/reservation.php` : envoie la demande par e-mail à la conciergerie et un accusé de réception au client
- `api/config.php` : réglages (lien du calendrier, e-mails). Non accessible depuis le web.
