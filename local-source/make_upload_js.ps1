$phpPath = 'G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/ms-taskhitlist-page.php'
$content = [System.IO.File]::ReadAllText($phpPath, [System.Text.Encoding]::UTF8)

# Base64 encode the content for safe JS embedding
$b64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))

# Write JS that will POST to WHM Fileman API using current session
$js = @"
(async function() {
  const b64 = '$b64';
  const content = atob(b64);
  const params = new URLSearchParams({
    cpanel_jsonapi_user: 'mindstream',
    cpanel_jsonapi_apiversion: '2',
    cpanel_jsonapi_module: 'Fileman',
    cpanel_jsonapi_func: 'savefile',
    dir: '/home/mindstream/public_html/wp-content/mu-plugins',
    filename: 'ms-taskhitlist-page.php',
    content: content
  });
  const resp = await fetch('/json-api/cpanel', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: params.toString()});
  const json = await resp.json();
  return JSON.stringify(json);
})()
"@

[System.IO.File]::WriteAllText('G:/Shared drives/(AdROI) Dev Projects/AD ROI ECO-SYSTEM/MindStream.ing Website/upload_thl.js', $js, [System.Text.Encoding]::UTF8)
Write-Host "JS file written, b64 length: $($b64.Length)"
