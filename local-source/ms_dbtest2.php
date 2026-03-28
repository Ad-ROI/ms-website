<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
if (!$config) { echo 'NO CONFIG'; exit; }
echo 'CONFIG_LEN:'.strlen($config)."\n";
preg_match("/define.*?'DB_USER'.*?'([^']+)'/s", $config, $m2);
preg_match("/define.*?'DB_PASSWORD'.*?'([^']+)'/s", $config, $m3);
echo 'USER:'.($m2[1]??'?')."\n";
echo 'PASS_LEN:'.strlen($m3[1]??'')."\n";
$c = @new mysqli('localhost', $m2[1], $m3[1], 'mindstream_wp');
echo 'CONNECT_ERR:'.($c->connect_error ?: 'none')."\n";
if (!$c->connect_error) {
    $r = $c->query("SELECT COUNT(*) as n FROM wp_posts WHERE post_type='page'");
    if ($r) { $row = $r->fetch_assoc(); echo 'PAGES:'.$row['n']; }
    else { echo 'QUERY_ERR:'.$c->error; }
}
