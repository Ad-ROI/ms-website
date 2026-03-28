<?php
$content = file_get_contents('/home/mindstream/public_html/ms-home-tpl.php');
// Find the "Say It Once" section
$start = strpos($content, 'Say It Once');
$startSection = strrpos(substr($content, 0, $start), '<section');
$endSection = strpos($content, '</section>', $start) + strlen('</section>');
echo 'SECTION_START:' . $startSection . "\n";
echo 'SECTION_END:' . $endSection . "\n";
echo 'LENGTH:' . ($endSection - $startSection) . "\n";
echo "---CONTENT---\n";
echo substr($content, $startSection, $endSection - $startSection);
