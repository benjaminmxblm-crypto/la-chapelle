<?php
// Diagnostic temporaire de l'envoi d'e-mails (à supprimer après les tests).
require __DIR__ . '/lib.php';
if (($_GET['k'] ?? '') !== 'c86c69f4c4440c3266c28428') { http_response_code(404); exit; }
header('Content-Type: text/plain; charset=utf-8');
$c = cfg();
echo "php=" . PHP_VERSION . "\n";
echo "mail_fn=" . (function_exists('mail') ? 'oui' : 'non') . "\n";
echo "sendmail_path=" . ini_get('sendmail_path') . "\n";
echo "notify_to=" . ($c['notify_to'] ?? '') . "\n";
echo "notify_cc=" . ($c['notify_cc'] ?? '') . "\n";
echo "mail_from=" . ($c['mail_from'] ?? '') . "\n";
$log = __DIR__ . '/cache/mail.log';
if (is_file($log)) { echo "--- journal ---\n" . implode('', array_slice(file($log), -20)); }
if (isset($_GET['send'])) {
    $ok = send_mail(mail_list($c['notify_to']), [], '', 'Test envoi La Chapelle ' . date('H:i:s'), '<p>Test d\'envoi depuis le site La Chapelle (OVH).</p>');
    echo "--- test ---\nsend_mail=" . ($ok ? 'true' : 'false') . "\n";
    $e = error_get_last(); if ($e) echo "last_error=" . $e['message'] . "\n";
}
