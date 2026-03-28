<?php
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
preg_match("/define\s*\(\s*'DB_NAME'\s*,\s*'([^']+)'/", $config, $m1);
preg_match("/define\s*\(\s*'DB_USER'\s*,\s*'([^']+)'/", $config, $m2);
preg_match("/define\s*\(\s*'DB_PASSWORD'\s*,\s*'([^']+)'/", $config, $m3);
preg_match("/define\s*\(\s*'DB_HOST'\s*,\s*'([^']+)'/", $config, $m4);
preg_match('/\$table_prefix\s*=\s*\'([^\']+)\'/', $config, $m5);
$db=$m1[1]; $user=$m2[1]; $pass=$m3[1]; $host=$m4[1]; $prefix=$m5[1];
$c = new mysqli($host, $user, $pass, $db);
if ($c->connect_error) { die('DB fail: '.$c->connect_error); }
$r = $c->query("SELECT ID FROM {$prefix}posts WHERE post_name='business-automation-systems' AND post_type='page' LIMIT 1");
if ($r && $r->num_rows > 0) {
    $row = $r->fetch_assoc();
    echo 'EXISTS:'.$row['ID'];
} else {
    $now = date('Y-m-d H:i:s');
    $title = 'Business Automation Systems';
    $slug = 'business-automation-systems';
    $stmt = $c->prepare("INSERT INTO {$prefix}posts (post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_name, post_modified, post_modified_gmt, post_type) VALUES (1, ?, ?, '', ?, '', 'publish', 'closed', 'closed', ?, ?, ?, 'page')");
    $stmt->bind_param('ssssss', $now, $now, $title, $slug, $now, $now);
    $stmt->execute();
    $id = $c->insert_id;
    echo 'CREATED:'.$id;
}
$c->close();
