$p = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/what-you-get-mockup/index.html'
$o = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/taskhitlist_b64.txt'
$html = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
$gz.Write($bytes, 0, $bytes.Length)
$gz.Close()
$b64 = [System.Convert]::ToBase64String($ms.ToArray())
[System.IO.File]::WriteAllText($o, $b64, [System.Text.Encoding]::ASCII)
Write-Host "Length: $($b64.Length)"
Write-Host "DONE"
