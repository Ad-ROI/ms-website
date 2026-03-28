$phpPath = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms_readhome_head.php'
$content = [System.IO.File]::ReadAllText($phpPath, [System.Text.Encoding]::UTF8)
$b64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))

$js = @"
(async function() {
  const content = atob('$b64');
  const params = new URLSearchParams({
    cpanel_jsonapi_user: 'mindstream',
    cpanel_jsonapi_apiversion: '2',
    cpanel_jsonapi_module: 'Fileman',
    cpanel_jsonapi_func: 'savefile',
    dir: '/home/mindstream/public_html',
    filename: 'ms_readhome_head.php',
    content: content
  });
  const resp = await fetch('/json-api/cpanel', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: params.toString()});
  const json = await resp.json();
  return JSON.stringify(json.cpanelresult ? json.cpanelresult.data : json);
})()
"@

[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/upload_reader_js.txt', $js, [System.Text.Encoding]::UTF8)
Write-Host "Done. b64 length: $($b64.Length)"
