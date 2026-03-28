<?php
$content = file_get_contents('/home/mindstream/public_html/ms-home-tpl.php');
$start = strpos($content, 'Say It Once');
$startSection = strrpos(substr($content, 0, $start), '<section');
$endSection = strpos($content, '</section>', $start) + strlen('</section>');
// Save to a file we can download
file_put_contents('/home/mindstream/public_html/brain-section-backup.html', substr($content, $startSection, $endSection - $startSection));
echo 'Saved ' . ($endSection - $startSection) . ' bytes to brain-section-backup.html';
