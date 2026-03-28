$phpPath = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms-taskhitlist-page.php'
$content = [System.IO.File]::ReadAllText($phpPath, [System.Text.Encoding]::UTF8)
$b64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))

$size = 7588
$p1 = $b64.Substring(0, $size)
$p2 = $b64.Substring($size, $size)
$p3 = $b64.Substring($size*2)

$base = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/'
[System.IO.File]::WriteAllText($base+'php_b64_p1.txt', $p1, [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText($base+'php_b64_p2.txt', $p2, [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText($base+'php_b64_p3.txt', $p3, [System.Text.Encoding]::ASCII)
Write-Host "Total b64: $($b64.Length)"
Write-Host "P1: $($p1.Length), P2: $($p2.Length), P3: $($p3.Length)"
