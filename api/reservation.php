<?php
// Demande de réservation : e-mail à la conciergerie (et au propriétaire) + accusé de réception au client.
// Réglages dans config.php : notify_to, notify_cc, mail_from (et resend_api_key, facultatif).
require __DIR__ . '/lib.php';

function layout(string $inner): string {
    return '<!doctype html><html><body style="margin:0;background:#F7F4EE;font-family:Georgia,\'Times New Roman\',serif;color:#2B2724">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E2DACD">
<tr><td style="padding:28px 36px;border-bottom:1px solid #E2DACD;text-align:center">
<div style="font-size:24px;letter-spacing:4px;text-transform:uppercase">La Chapelle</div>
<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#86653A;margin-top:6px">Alzonne · Carcassonne</div>
</td></tr>
<tr><td style="padding:32px 36px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A433C">' . $inner . '</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #E2DACD;font-family:Arial,sans-serif;font-size:12px;color:#8A8178;text-align:center">
lachapelle-carcassonne.com · Conciergerie Lauragaise · +33 6 14 29 19 23</td></tr>
</table></td></tr></table></body></html>';
}
function rows(array $items): string {
    $out = '';
    foreach ($items as [$k, $v]) {
        if ($v === '' || $v === null) continue;
        $out .= '<tr><td style="padding:10px 0;border-bottom:1px solid #E2DACD;color:#8A8178;width:40%">' . esc($k) . '</td><td style="padding:10px 0;border-bottom:1px solid #E2DACD;color:#2B2724">' . $v . '</td></tr>';
    }
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #E2DACD">' . $out . '</table>';
}

$c = cfg();
$team = mail_list($c['notify_to'] ?? '');
$cc = mail_list($c['notify_cc'] ?? '');
if (!$team || empty($c['mail_from'])) json_out(['success' => false, 'error' => 'non configuré'], 503);

[$d, $isJson] = read_request();
$lang = ($d['langue'] ?? '') === 'en' ? 'en' : 'fr';
$done = function () use ($isJson, $lang) {
    if ($isJson) json_out(['success' => true]);
    header('Location: ' . ($lang === 'en' ? '/en/thanks.html' : '/merci.html'), true, 303); exit;
};
if (!empty($d['botcheck'])) $done(); // robot : on ignore sans le dire

$arr = $d['arrivee'] ?? ''; $dep = $d['depart'] ?? '';
$email = trim((string)($d['email'] ?? ''));
$nom = clip($d['nom'] ?? '', 120);
if (!is_date($arr) || !is_date($dep) || $dep <= $arr || !is_mail($email) || $nom === '') json_out(['success' => false, 'error' => 'champs'], 400);
$n = nights($arr, $dep);
$services = array_slice(array_values(array_filter(array_map(fn($s) => clip($s, 60), (array)($d['services'] ?? [])), 'strlen')), 0, 10);
$tel = clip($d['telephone'] ?? '', 40);
$msg = clip($d['message'] ?? '', 3000);
$adultes = max(1, min(4, (int)($d['adultes'] ?? 1)));
$enfants = max(0, min(3, (int)($d['enfants'] ?? 0)));
$inFr = long_date($arr); $outFr = long_date($dep);
$guests = "$adultes adulte(s)" . ($enfants ? ", $enfants enfant(s)" : '');
$concierge = $team[0];

// 1. À la conciergerie (et au propriétaire)
$internal = layout('
<p style="font-family:Georgia,serif;font-size:22px;color:#2B2724;margin:0 0 6px">Nouvelle demande de réservation</p>
<p style="margin:0">' . esc($nom) . ' souhaite séjourner à La Chapelle.</p>
' . rows([
    ['Arrivée', esc($inFr)], ['Départ', esc($outFr)], ['Durée', $n . ' nuit' . ($n > 1 ? 's' : '')], ['Voyageurs', esc($guests)],
    ['Nom', esc($nom)], ['Téléphone', $tel !== '' ? '<a href="tel:' . esc($tel) . '" style="color:#86653A">' . esc($tel) . '</a>' : ''],
    ['E-mail', '<a href="mailto:' . esc($email) . '" style="color:#86653A">' . esc($email) . '</a>'],
    ['Services', esc(implode(', ', $services))], ['Langue du site', $lang === 'en' ? 'Anglais' : 'Français'],
]) . ($msg !== '' ? '<p style="margin:18px 0 6px;color:#8A8178">Message</p><p style="margin:0;white-space:pre-line">' . esc($msg) . '</p>' : '') . '
<p style="margin:24px 0 0;font-size:13px;color:#8A8178">Répondez directement à cet e-mail pour écrire au client.</p>');

// 2. Confirmation au client
$first = esc(explode(' ', $nom)[0]);
$t = $lang === 'en'
    ? ['subj' => 'We have received your request – La Chapelle', 'h' => "Thank you, $first",
       'p' => 'We have received your booking request for La Chapelle. Conciergerie Lauragaise will get back to you shortly to confirm availability, the exact price and payment details.',
       'a' => 'Check-in', 'b' => 'Check-out', 's' => 'Extras', 'g' => 'Guests', 'note' => 'This is an acknowledgement, not a booking confirmation: your stay is confirmed once you receive the rental agreement.',
       'cin' => long_date($arr, 'en') . ', from 5 pm', 'cout' => long_date($dep, 'en') . ', by 10 am', 'gg' => "$adultes adult(s)" . ($enfants ? ", $enfants child(ren)" : '')]
    : ['subj' => 'Nous avons bien reçu votre demande – La Chapelle', 'h' => "Merci, $first",
       'p' => 'Nous avons bien reçu votre demande de réservation pour La Chapelle. La Conciergerie Lauragaise revient vers vous rapidement pour vous confirmer la disponibilité, le prix exact et les modalités de paiement.',
       'a' => 'Arrivée', 'b' => 'Départ', 's' => 'Services', 'g' => 'Voyageurs', 'note' => 'Ce message accuse réception de votre demande : la réservation est confirmée à la réception du contrat de location.',
       'cin' => $inFr . ', à partir de 17 h', 'cout' => $outFr . ', avant 10 h', 'gg' => $guests];
$client = layout('
<p style="font-family:Georgia,serif;font-size:24px;color:#2B2724;margin:0 0 12px">' . $t['h'] . '</p>
<p style="margin:0">' . $t['p'] . '</p>
' . rows([[$t['a'], esc($t['cin'])], [$t['b'], esc($t['cout'])], [$t['g'], esc($t['gg'])], [$t['s'], esc(implode(', ', $services))]]) . '
<p style="margin:0;font-size:13px;color:#8A8178">' . $t['note'] . '</p>');

$strip = fn($s) => preg_replace('/^\S+ /u', '', $s);
$subject = 'Demande de réservation – ' . $strip($inFr) . ' au ' . $strip($outFr) . ' – ' . $nom;
if (!send_mail($team, $cc, $email, $subject, $internal)) json_out(['success' => false, 'error' => 'envoi'], 502);
send_mail([$email], [], $concierge, $t['subj'], $client); // on ne bloque pas le client si cet envoi échoue
$done();
