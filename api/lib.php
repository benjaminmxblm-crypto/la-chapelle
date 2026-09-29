<?php
// Outils communs aux scripts du site (calendrier et formulaire). Ce fichier n'est pas accessible depuis le web (voir .htaccess).

function cfg(): array {
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/config.php';
        if (!is_file($f)) { http_response_code(503); header('Content-Type: text/plain; charset=utf-8'); exit('config.php manquant'); }
        $c = require $f;
    }
    return $c;
}

function json_out($data, int $code = 200, int $maxAge = 0): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header($maxAge ? "Cache-Control: public, max-age=$maxAge" : 'Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function esc($s): string { return htmlspecialchars((string)($s ?? ''), ENT_QUOTES, 'UTF-8'); }
function is_date($s): bool { return is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && checkdate((int)substr($s, 5, 2), (int)substr($s, 8, 2), (int)substr($s, 0, 4)); }
function is_mail($s): bool { return is_string($s) && (bool)filter_var($s, FILTER_VALIDATE_EMAIL); }
function mail_list($v): array {
    $items = is_array($v) ? $v : explode(',', (string)$v);
    return array_values(array_filter(array_map('trim', $items), 'is_mail'));
}
function nights(string $a, string $b): int { return (int)round((strtotime($b . ' 12:00 UTC') - strtotime($a . ' 12:00 UTC')) / 86400); }
function clip($s, int $n): string { return mb_substr(trim((string)($s ?? '')), 0, $n); }

function long_date(string $iso, string $lang = 'fr'): string {
    $t = strtotime($iso . ' 12:00 UTC');
    $d = (int)gmdate('j', $t); $m = (int)gmdate('n', $t) - 1; $w = (int)gmdate('w', $t); $y = gmdate('Y', $t);
    if ($lang === 'en') {
        $W = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return "{$W[$w]} $d {$M[$m]} $y";
    }
    $W = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return $W[$w] . ' ' . ($d === 1 ? '1er' : $d) . " {$M[$m]} $y";
}

function http_get(string $url): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; SiteCalendar/1.0)',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($body !== false && $code >= 200 && $code < 300) ? $body : null;
}

// Lit les calendriers iCal et renvoie les séjours réservés [[arrivée, départ], …] (départ exclu).
function read_busy(array $urls): ?array {
    $busy = []; $ok = false;
    foreach ($urls as $url) {
        $text = http_get($url);
        if ($text === null) continue;
        $ok = true;
        $text = preg_replace('/\r?\n[ \t]/', '', $text);
        foreach (array_slice(explode('BEGIN:VEVENT', $text), 1) as $ev) {
            if (preg_match('/DTSTART[^:\r\n]*:(\d{8})/', $ev, $s) && preg_match('/DTEND[^:\r\n]*:(\d{8})/', $ev, $e)) {
                $iso = fn($v) => substr($v, 0, 4) . '-' . substr($v, 4, 2) . '-' . substr($v, 6, 2);
                $busy[] = [$iso($s[1]), $iso($e[1])];
            }
        }
    }
    return $ok ? $busy : null;
}

// Calendrier avec cache de 15 minutes (et ancienne version si Airbnb ne répond pas).
function dispo_endpoint(): void {
    $c = cfg();
    $urls = array_values(array_filter(array_map('trim', (array)($c['ical_urls'] ?? []))));
    if (!$urls) json_out(['error' => 'ical_urls manquant'], 503);
    $dir = __DIR__ . '/cache';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = $dir . '/dispo.json';
    if (is_file($file) && time() - filemtime($file) < 900) {
        header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: public, max-age=900');
        readfile($file); exit;
    }
    $busy = read_busy($urls);
    if ($busy === null) {
        if (is_file($file)) { header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); readfile($file); exit; }
        json_out(['error' => 'calendrier indisponible'], 502);
    }
    $json = json_encode(['busy' => $busy, 'updated' => gmdate('c')], JSON_UNESCAPED_SLASHES);
    @file_put_contents($file, $json, LOCK_EX);
    header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: public, max-age=900');
    echo $json; exit;
}

// Données envoyées par le formulaire : JSON (JavaScript) ou formulaire classique.
function read_request(): array {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['success' => false, 'error' => 'méthode'], 405);
    $isJson = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;
    if ($isJson) {
        $d = json_decode(file_get_contents('php://input') ?: '', true);
        if (!is_array($d)) json_out(['success' => false, 'error' => 'requête invalide'], 400);
    } else $d = $_POST;
    return [$d, $isJson];
}

function to_text(string $html): string {
    $t = preg_replace(['/<style[\s\S]*?<\/style>/', '/<\/(p|tr|div)>/', '/<br\s*\/?>/', '/<\/td><td[^>]*>/'], ['', "\n", "\n", ' : '], $html);
    $t = html_entity_decode(strip_tags($t), ENT_QUOTES, 'UTF-8');
    return implode("\n", array_filter(array_map('trim', explode("\n", $t)), 'strlen'));
}

function enc_header(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function addr_header(string $from): string {
    // « Nom <adresse> » -> nom encodé + adresse
    if (preg_match('/^\s*(.*?)\s*<([^>]+)>\s*$/', $from, $m)) return ($m[1] !== '' ? enc_header($m[1]) . ' ' : '') . '<' . $m[2] . '>';
    return $from;
}
function bare_addr(string $from): string { return preg_match('/<([^>]+)>/', $from, $m) ? $m[1] : trim($from); }

// Envoi d'un e-mail HTML : par Resend si une clé est configurée, sinon par le serveur d'e-mails de l'hébergement (OVH).
function send_mail(array $to, array $cc, string $replyTo, string $subject, string $html): bool {
    $c = cfg();
    $from = (string)($c['mail_from'] ?? '');
    $text = to_text($html);
    if (!empty($c['resend_api_key'])) {
        $payload = ['from' => $from, 'to' => $to, 'subject' => $subject, 'html' => $html, 'text' => $text];
        if ($cc) $payload['cc'] = $cc;
        if ($replyTo) $payload['reply_to'] = $replyTo;
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $c['resend_api_key'], 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload)]);
        $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($code >= 200 && $code < 300) return true;
        error_log("Resend $code: $res");
        return false;
    }
    $b = 'b' . bin2hex(random_bytes(8));
    $headers = ['MIME-Version: 1.0', 'From: ' . addr_header($from), 'Content-Type: multipart/alternative; boundary="' . $b . '"'];
    if ($cc) $headers[] = 'Cc: ' . implode(', ', $cc);
    if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
          . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
          . "--$b--\r\n";
    $ok = @mail(implode(', ', $to), enc_header($subject), $body, implode("\r\n", $headers), '-f' . bare_addr($from));
    if (!$ok) error_log('mail() a échoué');
    return $ok;
}
