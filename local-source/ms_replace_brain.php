<?php
$homePath = '/home/mindstream/public_html/ms-home-tpl.php';
$newSectionPath = '/home/mindstream/public_html/brain-section-new.html';

$home = file_get_contents($homePath);
$newSection = file_get_contents($newSectionPath);

if (!$home) { die('Cannot read home template'); }
if (!$newSection) { die('Cannot read new section'); }

// Find the brain section boundaries
$start = strpos($home, 'Say It Once');
if ($start === false) { die('Cannot find Say It Once marker'); }

$sectionStart = strrpos(substr($home, 0, $start), '<section');
$sectionEnd = strpos($home, '</section>', $start) + strlen('</section>');

if ($sectionStart === false || $sectionEnd === false) { die('Cannot find section boundaries'); }

$before = substr($home, 0, $sectionStart);
$after = substr($home, $sectionEnd);
$newHome = $before . $newSection . $after;

$result = file_put_contents($homePath, $newHome);
echo $result !== false ? 'OK: wrote ' . strlen($newHome) . ' bytes (was ' . strlen($home) . ')' : 'FAIL';
