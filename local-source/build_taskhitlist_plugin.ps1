$b64path = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/taskhitlist_b64.txt'
$outpath = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms-taskhitlist-page.php'
$b64 = [System.IO.File]::ReadAllText($b64path).Trim()

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

[System.IO.File]::WriteAllText($outpath, $php, [System.Text.Encoding]::UTF8)
Write-Host "Plugin written: $((Get-Item $outpath).Length) bytes"
