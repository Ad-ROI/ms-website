<?php
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
preg_match("/define.*?'DB_USER'.*?'([^']+)'/s", $config, $mu);
preg_match("/define.*?'DB_PASSWORD'.*?'([^']+)'/s", $config, $mp);
$c = new mysqli('localhost', $mu[1], $mp[1], 'mindstream_wp');
if ($c->connect_error) { die('Connect: '.$c->connect_error); }
$r = $c->query("SELECT ID FROM wp_posts WHERE post_name='business-automation-systems' AND post_type='page' LIMIT 1");
if (!$r) { die('Q: '.$c->error); }
if ($r->num_rows > 0) {
    echo 'EXISTS:'.$r->fetch_assoc()['ID'];
} else {
    $now = date('Y-m-d H:i:s');
    $ok = $c->query("INSERT INTO wp_posts (post_author,post_date,post_date_gmt,post_content,post_title,post_excerpt,post_status,comment_status,ping_status,post_name,post_modified,post_modified_gmt,post_type,post_content_filtered,to_ping,pinged,guid) VALUES (1,'{$now}','{$now}','','Business Automation Systems','','publish','closed','closed','business-automation-systems','{$now}','{$now}','page','','','','https://mindstream.ing/?page_id=NEW')");
    if (!$ok) { die('Insert: '.$c->error); }
    $id = $c->insert_id;
    $c->query("UPDATE wp_posts SET guid='https://mindstream.ing/?page_id={$id}' WHERE ID={$id}");
    echo 'CREATED:'.$id;
}
$c->close();
