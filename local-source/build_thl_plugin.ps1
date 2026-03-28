$b64 = [System.IO.File]::ReadAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/taskhitlist_b64.txt')

$php = @"
<?php
/**
 * Plugin Name: MindStream Task Hit List Page
 */
add_action('template_redirect', function() {
    if (is_page('business-tasks-automated')) {
        echo gzdecode(base64_decode('$b64'));
        exit;
    }
});
"@

[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms-taskhitlist-page.php', $php, [System.Text.Encoding]::UTF8)
Write-Host "Plugin file written: $((Get-Item 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms-taskhitlist-page.php').Length) bytes"
