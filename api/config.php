<?php
// Réglages du site. Ce fichier n'est pas accessible depuis le web (voir .htaccess).
return [
    // Lien(s) d'export du calendrier Airbnb (Calendrier > Disponibilités > Synchroniser > Exporter)
    'ical_urls' => [
        'https://www.airbnb.fr/calendar/ical/1157387034836162874.ics?t=aa7d65f06e8f43a5a85aee2623dfbbed',
    ],
    // Qui reçoit les demandes de réservation
    'notify_to' => 'conciergerie.lauragaise11@gmail.com',
    // Qui est en copie (séparer plusieurs adresses par des virgules ; vide = personne)
    'notify_cc' => '',
    // Expéditeur : une adresse d'un nom de domaine hébergé chez OVH
    'mail_from' => 'La Chapelle <reservation@lachapelle-carcassonne.com>',
    // Facultatif : clé Resend. Vide = envoi par le serveur d'e-mails OVH.
    'resend_api_key' => '',
];
