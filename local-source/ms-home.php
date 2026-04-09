<?php
/**
 * Plugin Name: MindStream Front Page
 * Description: Uses custom template for homepage
 */
add_filter("template_include", function($template) {
    if (is_front_page()) {
        $custom = ABSPATH . "ms-home-tpl.php";
        if (file_exists($custom)) return $custom;
    }
    return $template;
}, 99);