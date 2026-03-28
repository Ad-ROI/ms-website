<?php
// Write ms-taskhitlist-page.php to mu-plugins + create WP page if missing
error_reporting(E_ALL);

// 1. Write the mu-plugin
$muplugin_dir = '/home/mindstream/public_html/wp-content/mu-plugins/';
$plugin_file = $muplugin_dir . 'ms-taskhitlist-page.php';

$b64 = file_get_contents(__DIR__ . '/taskhitlist_b64_inline.txt');
if (!$b64) { die('ERROR: b64 file missing'); }

$php_content = '<?php
/**
 * Plugin Name: MindStream Task Hit List Page
 */
add_action(\'template_redirect\', function() {
    if (is_page(\'business-tasks-automated\')) {
        echo gzdecode(base64_decode(\'' . trim($b64) . '\'));
        exit;
    }
});';

$result = file_put_contents($plugin_file, $php_content);
echo $result ? "PLUGIN_WRITTEN:$result bytes\n" : "PLUGIN_FAILED\n";

// 2. Create WordPress page if missing
$config = file_get_contents('/home/mindstream/public_html/wp-config.php');
preg_match("/define\s*\(\s*'DB_NAME'\s*,\s*'([^']+)'/", $config, $m1);
preg_match("/define\s*\(\s*'DB_USER'\s*,\s*'([^']+)'/", $config, $m2);
preg_match("/define\s*\(\s*'DB_PASSWORD'\s*,\s*'([^']+)'/", $config, $m3);
preg_match("/define\s*\(\s*'DB_HOST'\s*,\s*'([^']+)'/", $config, $m4);
preg_match('/\$table_prefix\s*=\s*\'([^\']+)\'/', $config, $m5);
$dbname=$m1[1]; $dbuser=$m2[1]; $dbpass=$m3[1]; $dbhost=$m4[1]; $prefix=$m5[1];

$c = new mysqli($dbhost, $dbuser, $dbpass, $dbname);
if ($c->connect_error) { die('DB_FAIL: '.$c->connect_error); }

$r = $c->query("SELECT ID FROM {$prefix}posts WHERE post_name='business-tasks-automated' AND post_type='page' LIMIT 1");
if ($r && $r->num_rows > 0) {
    $row = $r->fetch_assoc();
    echo "PAGE_EXISTS:ID=".$row['ID']."\n";
} else {
    $now = date('Y-m-d H:i:s');
    $c->query("INSERT INTO {$prefix}posts (post_author,post_date,post_date_gmt,post_content,post_title,post_excerpt,post_status,comment_status,ping_status,post_name,post_modified,post_modified_gmt,post_type) VALUES (1,'$now','$now','','The Task Hit List','','publish','closed','closed','business-tasks-automated','$now','$now','page')");
    $id = $c->insert_id;
    echo "PAGE_CREATED:ID=$id\n";
}
$c->close();
echo "DONE\n";
