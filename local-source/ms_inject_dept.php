<?php
$homePath = '/home/mindstream/public_html/ms-home-tpl.php';
$teaserPath = '/home/mindstream/public_html/dept-teaser.html';
$homeContent = file_get_contents($homePath);
$teaserContent = file_get_contents($teaserPath);
if (!$homeContent) { die('Cannot read home template'); }
if (!$teaserContent) { die('Cannot read teaser file'); }
// Check if already injected
if (strpos($homeContent, 'dept-teaser-section') !== false) {
    die('ALREADY_INJECTED');
}
// Inject before <!-- FOOTER -->
$footerComment = '<!-- FOOTER -->';
$pos = strrpos($homeContent, $footerComment);
if ($pos === false) { die('FOOTER COMMENT NOT FOUND'); }
$newContent = substr($homeContent, 0, $pos) . $teaserContent . "\n" . substr($homeContent, $pos);
$result = file_put_contents($homePath, $newContent);
echo $result !== false ? 'OK:' . $result . ' bytes written' : 'FAIL';
