<?php
$home = file_get_contents('/home/mindstream/public_html/ms-home-tpl.php');
if (!$home) { die('Cannot read'); }
if (strpos($home, 'Doctor appt') !== false) { die('ALREADY_UPDATED'); }
// Replace the Personal Life task pills block
$search = '<span class="dept-task-pill">🔔 Reminder: 3pm</span>
          <span class="dept-task-pill">📝 Notes: Johnson call</span>
          <span class="dept-task-pill">🎤 Voicemail transcribed</span>
          <span class="dept-task-pill">🗓️ Calendar updated</span>
          <span class="dept-task-pill">📋 Meeting summary</span>';
$replace = '<span class="dept-task-pill">💊 Doctor appt: Tue 2pm</span>
          <span class="dept-task-pill">💐 Send flowers to Sarah</span>
          <span class="dept-task-pill">🎵 Song idea captured</span>
          <span class="dept-task-pill">🏋️ Gym reminder: 7am</span>
          <span class="dept-task-pill">🎂 Mom\'s birthday: Friday</span>';
$new = str_replace($search, $replace, $home);
if ($new === $home) { die('NO_MATCH - search string not found'); }
$r = file_put_contents('/home/mindstream/public_html/ms-home-tpl.php', $new);
echo $r !== false ? 'OK:'.$r : 'FAIL';
