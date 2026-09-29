<?php
// Page protégée : enregistre la clé Resend sur l'hébergement (jamais dans GitHub).
require __DIR__ . '/lib.php';
if (($_GET['k'] ?? '') !== 'a931713b6f685ad2fe77') { http_response_code(404); exit; }
$file = __DIR__ . '/cache/resend.key';
$msg = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $key = trim((string)($_POST['cle'] ?? ''));
    if (preg_match('/^re_[A-Za-z0-9_]{10,}$/', $key)) { file_put_contents($file, $key, LOCK_EX); @chmod($file, 0600); $msg = 'Clé enregistrée.'; }
    else $msg = 'Clé invalide : elle doit commencer par re_';
}
$has = is_file($file) && filesize($file) > 0;
?><!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Réglage e-mails</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#2B2724}input{width:100%;padding:12px;font-size:16px;box-sizing:border-box;margin:8px 0 16px}button{padding:12px 20px;font-size:16px;cursor:pointer}.ok{color:#2f6b3a;font-weight:600}</style></head>
<body><h1>Réglage de l'envoi des e-mails</h1>
<p>État : <strong><?= $has ? 'clé Resend enregistrée' : 'aucune clé enregistrée' ?></strong></p>
<?php if ($msg): ?><p class="ok"><?= esc($msg) ?></p><?php endif; ?>
<form method="post"><label for="cle">Clé Resend (commence par re_)</label><input id="cle" name="cle" type="password" autocomplete="off" required><button type="submit">Enregistrer</button></form>
</body></html>
