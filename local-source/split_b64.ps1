$o = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/taskhitlist_b64.txt'
$b64 = [System.IO.File]::ReadAllText($o)
$part1 = $b64.Substring(0, 8000)
$part2 = $b64.Substring(8000, 8000)
$part3 = $b64.Substring(16000)
[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/thl_p1.txt', $part1, [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/thl_p2.txt', $part2, [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/thl_p3.txt', $part3, [System.Text.Encoding]::ASCII)
Write-Host "P3 length: $($part3.Length)"
Write-Host "Done"
