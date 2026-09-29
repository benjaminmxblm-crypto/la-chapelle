<?php
// Réglages du site. Ce fichier n'est pas accessible depuis le web (voir .htaccess).
return [
    // Lien(s) d'export du calendrier Airbnb (Calendrier > Disponibilités > Synchroniser > Exporter)
    'ical_urls' => [
        'https://www.airbnb.fr/calendar/ical/1157387034836162874.ics?t=aa7d65f06e8f43a5a85aee2623dfbbed',
    ],
    // Qui reçoit les demandes de réservation
    'notify_to' => 'benjamin.mx.blm@gmail.com', // TEST : remettre conciergerie.lauragaise11@gmail.com après les essais
    // Qui est en copie (séparer plusieurs adresses par des virgules ; vide = personne)
    'notify_cc' => '',
    // Expéditeur : une adresse d'un domaine rattaché à CE site chez OVH (sinon OVH bloque l'envoi)
    'mail_from' => 'La Chapelle <reservation@lachapelle-carcassonne.com>',
    // Clé Resend : ne pas l'écrire ici (GitHub la bloque). Elle s'enregistre via la page protégée api/reglage.php, dans api/cache/resend.key.
    'resend_api_key' => '',
];
