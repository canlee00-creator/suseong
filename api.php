<?php
// 창고 물품 관리 API (PHP 7 이상). 데이터는 data/data.json 에 저장됩니다.
// 수정 비밀번호: 비워 두면 누구나 수정할 수 있습니다. (조회는 항상 누구나 가능)
$PASSWORD = '';

$F = __DIR__ . '/data/data.json';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function out($c, $d) { http_response_code($c); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function num($v) { return max(0, (int)$v); }
function str($v) { return trim((string)($v === null ? '' : $v)); }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (is_file($F)) readfile($F); else echo '{"items":[],"locs":[]}';
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'method not allowed']);
$pass = isset($_SERVER['HTTP_X_PASS']) ? $_SERVER['HTTP_X_PASS'] : '';
if ($PASSWORD !== '' && !hash_equals($PASSWORD, $pass)) out(401, ['error' => 'unauthorized']);
$b = json_decode(file_get_contents('php://input'), true);
if (!is_array($b)) out(400, ['error' => '잘못된 요청입니다']);

$fp = @fopen($F, 'c+');
if (!$fp) out(500, ['error' => 'data 폴더에 쓸 수 없습니다 (쓰기 권한 확인)']);
flock($fp, LOCK_EX);
$d = json_decode(stream_get_contents($fp), true);
if (!is_array($d)) $d = [];
if (!isset($d['items']) || !is_array($d['items'])) $d['items'] = [];
if (!isset($d['locs']) || !is_array($d['locs'])) $d['locs'] = [];
$op = isset($b['op']) ? $b['op'] : '';

if ($op === 'setItem') {
  $i = isset($b['item']) && is_array($b['item']) ? $b['item'] : [];
  $code = str(isset($i['code']) ? $i['code'] : ''); $name = str(isset($i['name']) ? $i['name'] : '');
  if ($code === '' || $name === '') out(400, ['error' => '물품코드와 품명이 필요합니다']);
  $nw = num(isset($i['nw']) ? $i['nw'] : 0); $used = num(isset($i['used']) ? $i['used'] : 0);
  $it = [
    'no' => (isset($i['no']) && $i['no'] !== null) ? num($i['no']) : null,
    'code' => $code, 'name' => $name,
    'spec' => str(isset($i['spec']) ? $i['spec'] : ''),
    'base' => num(isset($i['base']) ? $i['base'] : 0),
    'nw' => $nw, 'used' => $used, 'qty' => $nw + $used,
    'loc' => str(isset($i['loc']) ? $i['loc'] : ''),
  ];
  $prev = str(isset($b['prev']) ? $b['prev'] : '');
  $outItems = []; $done = false;
  foreach ($d['items'] as $x) {
    if ($x['code'] === $code || ($prev !== '' && $x['code'] === $prev)) { if (!$done) { $outItems[] = $it; $done = true; } }
    else $outItems[] = $x;
  }
  if (!$done) $outItems[] = $it;
  $d['items'] = $outItems;
} elseif ($op === 'delItem') {
  $id = str(isset($b['id']) ? $b['id'] : '');
  $d['items'] = array_values(array_filter($d['items'], function ($x) use ($id) { return $x['code'] !== $id; }));
} elseif ($op === 'setLoc') {
  $l = isset($b['loc']) && is_array($b['loc']) ? $b['loc'] : [];
  $code = str(isset($l['code']) ? $l['code'] : '');
  if ($code === '') out(400, ['error' => '위치 코드가 필요합니다']);
  $o = ['code' => $code, 'desc' => str(isset($l['desc']) ? $l['desc'] : '')];
  $found = false;
  foreach ($d['locs'] as $k => $x) { if ($x['code'] === $code) { $d['locs'][$k] = $o; $found = true; break; } }
  if (!$found) $d['locs'][] = $o;
} elseif ($op === 'delLoc') {
  $id = str(isset($b['id']) ? $b['id'] : '');
  $d['locs'] = array_values(array_filter($d['locs'], function ($x) use ($id) { return $x['code'] !== $id; }));
} else {
  out(400, ['error' => '알 수 없는 요청입니다']);
}

rewind($fp); ftruncate($fp, 0);
fwrite($fp, json_encode($d, JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
out(200, ['ok' => true]);
