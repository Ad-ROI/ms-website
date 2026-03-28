<?php
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
preg_match("/define.*?'DB_NAME'.*?'([^']+)'/s", $config, $m1);
preg_match("/define.*?'DB_USER'.*?'([^']+)'/s", $config, $m2);
preg_match("/define.*?'DB_PASSWORD'.*?'([^']+)'/s", $config, $m3);
preg_match("/define.*?'DB_HOST'.*?'([^']+)'/s", $config, $m4);
preg_match('/table_prefix\s*=\s*["\']([^"\']+)/s', $config, $m5);
$db=$m1[1]; $user=$m2[1]; $pass=$m3[1]; $host=$m4[1]; $prefix=$m5[1]??'wp_';
$c = new mysqli($host, $user, $pass, $db);
if ($c->connect_error) { die('Connect: '.$c->connect_error); }
$check = $c->query("SELECT ID FROM {$prefix}posts WHERE post_name='business-automation-systems' AND post_type='page' LIMIT 1");
if (!$check) { die('Query: '.$c->error); }
if ($check->num_rows > 0) {
    $row = $check->fetch_assoc();
    echo 'EXISTS:'.$row['ID'];
} else {
    $now = date('Y-m-d H:i:s');
    $title = 'Business Automation Systems';
    $slug = 'business-automation-systems';
    $q = "INSERT INTO {$prefix}posts (post_author,post_date,post_date_gmt,post_content,post_title,post_excerpt,post_status,comment_status,ping_status,post_name,post_modified,post_modified_gmt,post_type) VALUES (1,'$now','$now','','$title','','publish','closed','closed','$slug','$now','$now','page')";
    if (!$c->query($q)) { die('Insert: '.$c->error); }
    $id = $c->insert_id;
    echo 'CREATED:'.$id;
}
$c->close();
