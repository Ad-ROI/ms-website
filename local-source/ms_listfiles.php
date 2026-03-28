<?php
$dir = '/home/mindstream/public_html/wp-content/mu-plugins/';
$files = scandir($dir);
foreach ($files as $f) {
    if ($f === '.' || $f === '..') continue;
    echo $f . ' (' . filesize($dir.$f) . ")\n";
}
