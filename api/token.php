<?php
// Remet un jeton au formulaire (anti-robots).
require __DIR__ . '/lib.php';
json_out(['t' => form_token()]);
