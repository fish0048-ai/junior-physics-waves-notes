/**
 * 課堂座位表 — 伺服端
 * 以這份 Google 試算表為唯一資料來源，各載具讀寫同一份檔即可同步。
 */

var SHEET = {
  students: '學生',
  log: '操作紀錄',
  settings: '設定'
};

var HEAD = {
  students: ['班級', '座號', '姓名', '列', '欄', '分數'],
  log: ['編號', '時間', '班級', '動作', '座號', '姓名', '分數變化', '列', '欄', '已復原', '對方座號', '對方列', '對方欄'],
  settings: ['鍵', '值']
};

function onOpen() {
  setupSheets();
  SpreadsheetApp.getUi()
    .createMenu('座位表')
    .addItem('開啟座位表（對話框）', 'openWebDialog')
    .addItem('顯示網頁網址', 'showWebAppUrl')
    .addItem('重建工作表標題', 'setupSheets')
    .addToUi();
}

function doGet() {
  setupSheets();
  var out = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('課堂座位表')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  return out;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function openWebDialog() {
  var html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(960)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, '課堂座位表');
}

function showWebAppUrl() {
  var url = '';
  try {
    url = ScriptApp.getService().getUrl() || '';
  } catch (e) {
    url = '';
  }
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('尚未部署網頁應用程式', '請到 Apps Script：部署 → 新增部署作業 → 網頁應用程式。\n執行身分：我自己；存取權：任何人。', ui.ButtonSet.OK);
    return;
  }
  ui.alert('座位表網址（平板可加到主畫面）', url, ui.ButtonSet.OK);
}

function setupSheets() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEET.students, HEAD.students);
  ensureSheet_(ss, SHEET.log, HEAD.log);
  ensureSheet_(ss, SHEET.settings, HEAD.settings);

  var settings = ss.getSheetByName(SHEET.settings);
  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, 6, 2).setValues([
      ['網頁密碼', ''],
      ['預設列數', '6'],
      ['預設欄數', '7'],
      ['過道在第幾欄後', '3'],
      ['修訂號', '0'],
      ['上次存檔', '']
    ]);
  }

  var students = ss.getSheetByName(SHEET.students);
  if (students.getLastRow() < 2) {
    var sample = sampleStudents_();
    students.getRange(2, 1, sample.length, 6).setValues(sample);
    students.getRange(1, 1, 1, 6).setFontWeight('bold');
    students.autoResizeColumns(1, 6);
  }
}

/** 前端：讀取班級清單與目前座位／分數 */
function getState(className, pin) {
  return withLock_(function () {
    setupSheets();
    assertPin_(pin);
    var ss = SpreadsheetApp.getActive();
    var all = readStudents_(ss);
    var classes = uniqueClasses_(all);
    if (!classes.length) {
      return fail_('請先在「學生」工作表輸入班級、座號、姓名。');
    }
    className = String(className || classes[0]);
    if (classes.indexOf(className) === -1) className = classes[0];

    var layout = getLayout_(ss, className);
    var students = all.filter(function (s) { return s.className === className; });
    var noneSeated = !students.some(function (s) { return s.row > 0 && s.col > 0; });
    students = autoSeatIfNeeded_(students, layout.rows, layout.cols);
    if (noneSeated && students.length) persistAutoSeats_(ss, className, students);

    return {
      ok: true,
      classes: classes,
      className: className,
      rows: layout.rows,
      cols: layout.cols,
      aisleAfter: layout.aisleAfter,
      students: students.map(publicStudent_),
      revision: getRevision_(ss),
      savedAt: getSetting_(ss, '上次存檔', ''),
      canUndo: hasUndo_(ss, className)
    };
  });
}

/** 前端：輕量輪詢，沒變就少傳資料 */
function pollState(className, pin, clientRev) {
  return withLock_(function () {
    setupSheets();
    assertPin_(pin);
    var ss = SpreadsheetApp.getActive();
    var rev = getRevision_(ss);
    if (Number(clientRev) === rev) {
      return { ok: true, unchanged: true, revision: rev };
    }
    return getStateUnlocked_(ss, className);
  });
}

/** 一鍵存檔：座位、列數欄數、時間 */
function saveAll(payload) {
  return withLock_(function () {
    setupSheets();
    assertPin_(payload && payload.pin);
    var ss = SpreadsheetApp.getActive();
    var className = String(payload.className || '');
    if (!className) return fail_('沒有班級。');

    var rows = clamp_(payload.rows, 1, 12, 6);
    var cols = clamp_(payload.cols, 1, 12, 7);
    var aisleAfter = clamp_(payload.aisleAfter, 0, cols - 1, Math.floor(cols / 2));
    setLayout_(ss, className, rows, cols, aisleAfter);

    var seats = payload.students || [];
    writeSeatsAndScores_(ss, className, seats);

    var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    setSetting_(ss, '上次存檔', now);
    bumpRevision_(ss);
    SpreadsheetApp.flush();

    return getStateUnlocked_(ss, className);
  });
}

function setLayoutSize(payload) {
  return withLock_(function () {
    setupSheets();
    assertPin_(payload && payload.pin);
    var ss = SpreadsheetApp.getActive();
    var className = String(payload.className || '');
    var rows = clamp_(payload.rows, 1, 12, 6);
    var cols = clamp_(payload.cols, 1, 12, 7);
    var aisleAfter = clamp_(payload.aisleAfter, 0, cols - 1, Math.floor(cols / 2));
    setLayout_(ss, className, rows, cols, aisleAfter);

    var students = readStudents_(ss).filter(function (s) { return s.className === className; });
    students.forEach(function (s) {
      if (s.row > rows || s.col > cols) {
        s.row = 0;
        s.col = 0;
      }
    });
    persistAutoSeats_(ss, className, students);
    bumpRevision_(ss);
    return getStateUnlocked_(ss, className);
  });
}

function adjustScore(payload) {
  return withLock_(function () {
    setupSheets();
    assertPin_(payload && payload.pin);
    var ss = SpreadsheetApp.getActive();
    var className = String(payload.className || '');
    var seatNo = String(payload.seatNo || '');
    var delta = Number(payload.delta);
    if (!className || !seatNo) return fail_('找不到學生。');
    if (!delta || !isFinite(delta)) return fail_('分數變化無效。');

    var found = findStudentRow_(ss, className, seatNo);
    if (!found) return fail_('名單裡沒有座號 ' + seatNo + '。');

    var newScore = Number(found.student.score || 0) + delta;
    ss.getSheetByName(SHEET.students).getRange(found.row, 6).setValue(newScore);
    appendLog_(ss, {
      className: className,
      action: delta > 0 ? '加分' : '扣分',
      seatNo: seatNo,
      name: found.student.name,
      delta: delta,
      row: found.student.row,
      col: found.student.col
    });
    bumpRevision_(ss);
    SpreadsheetApp.flush();
    return getStateUnlocked_(ss, className);
  });
}

function undoLast(payload) {
  return withLock_(function () {
    setupSheets();
    assertPin_(payload && payload.pin);
    var ss = SpreadsheetApp.getActive();
    var className = String(payload.className || '');
    var sheet = ss.getSheetByName(SHEET.log);
    var last = sheet.getLastRow();
    if (last < 2) return fail_('沒有可復原的紀錄。');

    var values = sheet.getRange(2, 1, last - 1, 13).getValues();
    var idx = -1;
    for (var i = values.length - 1; i >= 0; i--) {
      if (String(values[i][2]) === className && String(values[i][9]) !== '是') {
        idx = i;
        break;
      }
    }
    if (idx === -1) return fail_('這個班沒有可復原的紀錄。');

    var rec = values[idx];
    var action = String(rec[3]);
    var seatNo = String(rec[4]);
    var delta = Number(rec[6] || 0);
    var found = findStudentRow_(ss, className, seatNo);
    var studentsSheet = ss.getSheetByName(SHEET.students);

    if (action === '加分' || action === '扣分') {
      if (found) {
        studentsSheet.getRange(found.row, 6).setValue(Number(found.student.score || 0) - delta);
      }
    } else if (action === '換位') {
      var prevRow = Number(rec[7] || 0);
      var prevCol = Number(rec[8] || 0);
      if (found) {
        studentsSheet.getRange(found.row, 4, 1, 2).setValues([[prevRow, prevCol]]);
      }
      var otherSeat = rec.length > 10 ? String(rec[10] || '') : '';
      if (otherSeat) {
        var other = findStudentRow_(ss, className, otherSeat);
        if (other) {
          studentsSheet.getRange(other.row, 4, 1, 2).setValues([[
            Number(rec[11] || 0),
            Number(rec[12] || 0)
          ]]);
        }
      }
    }

    sheet.getRange(idx + 2, 10).setValue('是');
    bumpRevision_(ss);
    SpreadsheetApp.flush();
    return getStateUnlocked_(ss, className);
  });
}

function logMove(payload) {
  return withLock_(function () {
    setupSheets();
    assertPin_(payload && payload.pin);
    var ss = SpreadsheetApp.getActive();
    var className = String(payload.className || '');
    writeSeatsAndScores_(ss, className, payload.students || []);
    var moved = payload.moved || {};
    var swapped = payload.swapped || {};
    appendLog_(ss, {
      className: className,
      action: '換位',
      seatNo: String(moved.seatNo || ''),
      name: String(moved.name || ''),
      delta: 0,
      row: Number(moved.fromRow || 0),
      col: Number(moved.fromCol || 0),
      otherSeatNo: String(swapped.seatNo || ''),
      otherRow: Number(swapped.fromRow || 0),
      otherCol: Number(swapped.fromCol || 0)
    });
    bumpRevision_(ss);
    return getStateUnlocked_(ss, className);
  });
}

function drawRandom(payload) {
  setupSheets();
  assertPin_(payload && payload.pin);
  var exclude = payload.exclude || [];
  var state = getState(payload.className, payload.pin);
  if (!state.ok) return state;
  var pool = state.students.filter(function (s) {
    return exclude.indexOf(String(s.seatNo)) === -1;
  });
  if (!pool.length) return fail_('可以抽的學生都抽過了，請重設抽籤。');
  var pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    ok: true,
    pick: pick,
    remain: pool.length - 1
  };
}

/* ---------- 內部 ---------- */

function getStateUnlocked_(ss, className) {
  var all = readStudents_(ss);
  var classes = uniqueClasses_(all);
  className = String(className || (classes[0] || ''));
  var layout = getLayout_(ss, className);
  var students = all.filter(function (s) { return s.className === className; });
  return {
    ok: true,
    classes: classes,
    className: className,
    rows: layout.rows,
    cols: layout.cols,
    aisleAfter: layout.aisleAfter,
    students: students.map(publicStudent_),
    revision: getRevision_(ss),
    savedAt: getSetting_(ss, '上次存檔', ''),
    canUndo: hasUndo_(ss, className)
  };
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return fail_('其他裝置正在存檔，請再試一次。');
  }
  try {
    return fn();
  } catch (e) {
    return fail_(String(e && e.message ? e.message : e));
  } finally {
    lock.releaseLock();
  }
}

function fail_(message) {
  return { ok: false, error: message };
}

function assertPin_(pin) {
  var expected = String(getSetting_(SpreadsheetApp.getActive(), '網頁密碼', '') || '').trim();
  if (!expected) return;
  if (String(pin || '') !== expected) {
    throw new Error('密碼錯誤');
  }
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  var width = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1, 1, 1, width).getValues()[0];
  var empty = existing.every(function (v) { return String(v) === ''; });
  var missingCols = existing.filter(function (v) { return String(v) !== ''; }).length < headers.length;
  if (empty || missingCols) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function readStudents_(ss) {
  var sheet = ss.getSheetByName(SHEET.students);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var className = String(values[i][0] || '').trim();
    var seatNo = String(values[i][1] || '').trim();
    var name = String(values[i][2] || '').trim();
    if (!className || !seatNo || !name) continue;
    out.push({
      sheetRow: i + 2,
      className: className,
      seatNo: seatNo,
      name: name,
      row: Number(values[i][3] || 0),
      col: Number(values[i][4] || 0),
      score: Number(values[i][5] || 0)
    });
  }
  return out;
}

function uniqueClasses_(students) {
  var seen = {};
  var list = [];
  students.forEach(function (s) {
    if (!seen[s.className]) {
      seen[s.className] = true;
      list.push(s.className);
    }
  });
  list.sort();
  return list;
}

function publicStudent_(s) {
  return {
    seatNo: s.seatNo,
    name: s.name,
    row: s.row || 0,
    col: s.col || 0,
    score: s.score || 0
  };
}

function autoSeatIfNeeded_(students, rows, cols) {
  var seated = students.some(function (s) { return s.row > 0 && s.col > 0; });
  if (seated) return students;
  var sorted = students.slice().sort(function (a, b) {
    return seatSort_(a.seatNo) - seatSort_(b.seatNo);
  });
  var max = rows * cols;
  sorted.forEach(function (s, i) {
    if (i >= max) {
      s.row = 0;
      s.col = 0;
      return;
    }
    s.row = Math.floor(i / cols) + 1;
    s.col = (i % cols) + 1;
  });
  return students;
}

function persistAutoSeats_(ss, className, students) {
  var sheet = ss.getSheetByName(SHEET.students);
  students.forEach(function (s) {
    if (s.sheetRow) {
      sheet.getRange(s.sheetRow, 4, 1, 2).setValues([[s.row || 0, s.col || 0]]);
    }
  });
}

function writeSeatsAndScores_(ss, className, seats) {
  var map = {};
  (seats || []).forEach(function (s) {
    map[String(s.seatNo)] = s;
  });
  var current = readStudents_(ss).filter(function (s) { return s.className === className; });
  var sheet = ss.getSheetByName(SHEET.students);
  current.forEach(function (s) {
    var next = map[s.seatNo];
    if (!next) return;
    var score = next.score;
    if (score === undefined || score === null || score === '') score = s.score;
    sheet.getRange(s.sheetRow, 4, 1, 3).setValues([[
      Number(next.row || 0),
      Number(next.col || 0),
      Number(score || 0)
    ]]);
  });
}

function findStudentRow_(ss, className, seatNo) {
  var list = readStudents_(ss);
  for (var i = 0; i < list.length; i++) {
    if (list[i].className === className && String(list[i].seatNo) === String(seatNo)) {
      return { row: list[i].sheetRow, student: list[i] };
    }
  }
  return null;
}

function appendLog_(ss, rec) {
  var sheet = ss.getSheetByName(SHEET.log);
  var id = sheet.getLastRow();
  sheet.appendRow([
    id,
    new Date(),
    rec.className,
    rec.action,
    rec.seatNo,
    rec.name,
    rec.delta || 0,
    rec.row || 0,
    rec.col || 0,
    '',
    rec.otherSeatNo || '',
    rec.otherRow || 0,
    rec.otherCol || 0
  ]);
}

function hasUndo_(ss, className) {
  var sheet = ss.getSheetByName(SHEET.log);
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var values = sheet.getRange(2, 1, last - 1, 10).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][2]) === className && String(values[i][9]) !== '是') return true;
  }
  return false;
}

function getLayout_(ss, className) {
  var rows = Number(getSetting_(ss, '列數_' + className, '') || getSetting_(ss, '預設列數', '6'));
  var cols = Number(getSetting_(ss, '欄數_' + className, '') || getSetting_(ss, '預設欄數', '7'));
  var aisleAfter = Number(getSetting_(ss, '過道_' + className, '') || getSetting_(ss, '過道在第幾欄後', '3'));
  rows = clamp_(rows, 1, 12, 6);
  cols = clamp_(cols, 1, 12, 7);
  aisleAfter = clamp_(aisleAfter, 0, cols - 1, Math.floor(cols / 2));
  return { rows: rows, cols: cols, aisleAfter: aisleAfter };
}

function setLayout_(ss, className, rows, cols, aisleAfter) {
  setSetting_(ss, '列數_' + className, String(rows));
  setSetting_(ss, '欄數_' + className, String(cols));
  setSetting_(ss, '過道_' + className, String(aisleAfter));
}

function getRevision_(ss) {
  return Number(getSetting_(ss, '修訂號', '0') || 0);
}

function bumpRevision_(ss) {
  setSetting_(ss, '修訂號', String(getRevision_(ss) + 1));
}

function getSetting_(ss, key, fallback) {
  var sheet = ss.getSheetByName(SHEET.settings);
  var last = sheet.getLastRow();
  if (last < 2) return fallback;
  var values = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === key) return values[i][1];
  }
  return fallback;
}

function setSetting_(ss, key, value) {
  var sheet = ss.getSheetByName(SHEET.settings);
  var last = sheet.getLastRow();
  if (last >= 2) {
    var values = sheet.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]) === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }
  sheet.appendRow([key, value]);
}

function clamp_(n, min, max, fallback) {
  n = Number(n);
  if (!isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return Math.round(n);
}

function seatSort_(seatNo) {
  var n = parseInt(String(seatNo).replace(/[^\d]/g, ''), 10);
  return isFinite(n) ? n : 0;
}

function sampleStudents_() {
  var names = [
    '王小明', '李美玲', '陳志偉', '林佳蓉', '張家豪', '黃雅婷',
    '吳建宏', '蔡欣怡', '鄭宇翔', '許雅琪', '謝俊傑', '周佩珊',
    '徐承恩', '羅心妍', '蘇柏翰', '葉庭瑋', '呂冠宇', '高子晴',
    '潘彥廷', '簡語彤', '洪承風', '鍾雨萱', '馮柏宇', '鄧詠琪',
    '曹子安', '阮佳穎', '梁浩宇', '韓宜蓁', '朱冠霖', '歐陽晴'
  ];
  return names.map(function (name, i) {
    var seat = i + 1;
    var row = Math.floor(i / 7) + 1;
    var col = (i % 7) + 1;
    return ['801', seat, name, row, col, 0];
  });
}
