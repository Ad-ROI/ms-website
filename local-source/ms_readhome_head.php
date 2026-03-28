<?php
// Read first 8000 chars of ms-home-tpl.php to get CSS/structure
$f = file_get_contents('/home/mindstream/public_html/ms-home-tpl.php');
echo '<pre>' . htmlspecialchars(substr($f, 0, 8000)) . '</pre>';
