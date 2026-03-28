<?php
$content = file_get_contents('/home/mindstream/public_html/ms-home-tpl.php');
// Get the last 3000 chars before the footer comment
$footerPos = strrpos($content, '<!-- FOOTER -->');
if ($footerPos === false) {
    echo 'NO FOOTER COMMENT FOUND';
    echo 'LAST 2000: ' . substr($content, -2000);
} else {
    echo 'Footer at position: ' . $footerPos . ' of ' . strlen($content) . "\n";
    echo "BEFORE_FOOTER:\n" . substr($content, $footerPos - 500, 600);
}
