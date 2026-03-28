<?php
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
preg_match("/define\s*\(\s*'DB_NAME'\s*,\s*'([^']+)'/", $config, $m1);
preg_match("/define\s*\(\s*'DB_USER'\s*,\s*'([^']+)'/", $config, $m2);
preg_match("/define\s*\(\s*'DB_PASSWORD'\s*,\s*'([^']+)'/", $config, $m3);
preg_match("/define\s*\(\s*'DB_HOST'\s*,\s*'([^']+)'/", $config, $m4);
preg_match('/\$table_prefix\s*=\s*\'([^\']+)\'/', $config, $m5);
$dbname=$m1[1]; $dbuser=$m2[1]; $dbpass=$m3[1]; $dbhost=$m4[1]; $prefix=$m5[1];
$c = new mysqli($dbhost, $dbuser, $dbpass, $dbname);
if ($c->connect_error) { die('Connect: '.$c->connect_error); }
$check = $c->query("SELECT ID FROM {$prefix}posts WHERE post_name='business-automation-systems' AND post_type='page' LIMIT 1");
if (!$check) { die('Query err: '.$c->error); }
if ($check->num_rows > 0) {
    $row = $check->fetch_assoc();
    echo 'EXISTS:'.$row['ID'];
} else {
    $now = date('Y-m-d H:i:s');
    $ins = $c->query("INSERT INTO {$prefix}posts (post_author,post_date,post_date_gmt,post_content,post_title,post_excerpt,post_status,comment_status,ping_status,post_name,post_modified,post_modified_gmt,post_type) VALUES (1,'$now','$now','','Business Automation Systems','','publish','closed','closed','business-automation-systems','$now','$now','page')");
    if (!$ins) { die('Insert err: '.$c->error); }
    echo 'CREATED:'.$c->insert_id;
}
$c->close();
