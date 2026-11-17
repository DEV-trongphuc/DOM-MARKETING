/**
 * ============================================================
 *  DOM META — UNIFIED GOOGLE APPS SCRIPT
 *  Thay thế: google_data.gs + settings_sync.gs
 *  1 Spreadsheet · 1 Web App URL · toàn bộ chức năng
 * ============================================================
 *
 *  Deploy as Web App:
 *    • Execute as: Me
 *    • Who has access: Anyone (no sign-in required)
 *
 *  Sheets trong cùng 1 Spreadsheet:
 *    "DATA"       → Google Ads performance rows
 *    "SETTINGS"   → key/value config
 *    "AI_REPORTS" → AI analysis history
 *    "Version"    → sync log
 *
 *  ── API Routing (GET) ──────────────────────────────────────
 *   ?sheet=settings              → { ok, settings:{} }
 *   ?sheet=settings&key=X        → { ok, value }
 *   ?sheet=ai_reports            → { ok, data:[] }
 *   ?action=sync                 → trigger Google Ads sync
 *   ?type=keywords&campaignId=X&since=Y&until=Z
 *   (default / ?sheet=ads_data)  → { h, d, syncedAt }
 *
 *  ── API Routing (POST) ─────────────────────────────────────
 *   { sheet:"settings", key, value }         → upsert 1 key
 *   { sheet:"settings", settings:{} }        → upsert nhiều key
 *   { sheet:"ai_reports", action:"save", report:{} }
 *   { sheet:"ai_reports", action:"delete", id }
 *   { action:"sync" }                        → Google Ads sync
 * ============================================================
 */

// ─── CẤU HÌNH CHUNG ──────────────────────────────────────────
const CONFIG = {
  // Google Ads
  DEVELOPER_TOKEN:   "oBqM_GUwxCs4t-leZtW6pQ",
  CUSTOMER_ID:       "466-215-2707",
  LOGIN_CUSTOMER_ID: "113-061-8835",
  DEFAULT_DAYS:      14,

  // ★ Dùng chung 1 Spreadsheet cho toàn bộ
  SPREADSHEET_ID:    "1eL996n-IIN4Vml_yAzF3mBYGE9u9c1uDvF6KBODH4P0",
  SHEET_NAME:        "DATA",
};

const ACCOUNTS_TO_SYNC = [
  { customerId: "466-215-2707", sheetName: "DATA" },
  { customerId: "367-797-3546", sheetName: "ESTA_DATA" },
  { customerId: "295-339-0933", sheetName: "ECOLIFE_DATA" }
];

function _getGoogleAccountByMetaId(metaId, customToken) {
  const cleanId = String(metaId || "").replace("act_", "").trim();
  if (cleanId === "1283070995510667") {
    return { customerId: "367-797-3546", sheetName: "ESTA_DATA" };
  }
  if (cleanId === "295-339-0933" || cleanId === "2953390933" || cleanId.toLowerCase() === "ecolifesignature" || customToken === "oBqM_GUwxCs4t-leZtW6pQ") {
    return { customerId: "295-339-0933", sheetName: "ECOLIFE_DATA" };
  }
  if (/^\d{3}-?\d{3}-?\d{4}$/.test(cleanId)) {
    return { customerId: cleanId, sheetName: cleanId.replace(/-/g, '_') };
  }
  // Default/Ampersand: "676599667843841"
  return { customerId: "466-215-2707", sheetName: "DATA" };
}

const GADS_API_BASE = "https://googleads.googleapis.com/v23";

// ── Sheet name constants ───────────────────────────────────
const SETTINGS_SHEET_NAME   = "SETTINGS";
const AI_REPORTS_SHEET_NAME = "AI_REPORTS";
const USERS_SHEET_NAME      = "USERS";
const AI_COL = { id:1, timestamp:2, label:3, brand:4, dateRange:5, preview:6, html:7 };
const AI_COLS_TOTAL = 7;
const USERS_HEADER = ['email','name','role','status','addedAt','requestAt','lastLogin','picture'];
const U = { email:0, name:1, role:2, status:3, addedAt:4, requestAt:5, lastLogin:6, picture:7 };

// ════════════════════════════════════════════════════════════
//  UNIFIED ENTRY POINTS
// ════════════════════════════════════════════════════════════

function doGet(e) {
  const p = (e && e.parameter) || {};
  const devToken = p.token || p.developer_token || CONFIG.DEVELOPER_TOKEN;
  const accountId = p.account_id || "";
  const googleAcc = _getGoogleAccountByMetaId(accountId, devToken);
  const sheetName = googleAcc.sheetName;

  try {
    // ── Google Ads sync trigger ──────────────────────────────
    if (p.action === 'sync') {
      _clearDoGetCache();
      syncGoogleAdsData(accountId);
      _clearDoGetCache();
      return _json({ ok: true, syncedAt: _getLastSyncTime(sheetName) });
    }

    // ── Keywords on-demand ───────────────────────────────────
    if (p.type === 'keywords') return _getKeywordsResponse(p);

    // ── Settings / AI Reports ────────────────────────────────
    const sheet = (p.sheet || '').toLowerCase();

    if (sheet === 'ai_reports') {
      return _json({ ok: true, data: _readAiReports() });
    }

    if (sheet === 'settings') {
      if (p.key) {
        const all = _readAllSettings();
        return _json({ ok: true, key: p.key, value: all[p.key] ?? null });
      }
      return _json({ ok: true, settings: _readAllSettings() });
    }

    if (sheet === 'users') {
      return _json({ ok: true, users: _readUsers() });
    }

    // ── Default: Google Ads performance data ─────────────────
    // Query Google Ads API directly without routing through intermediate Google Sheets
    let sinceStr = '', untilStr = '';
    if (p.time_range) {
      try {
        const r = JSON.parse(p.time_range);
        if (r.since) sinceStr = r.since;
        if (r.until) untilStr = r.until;
      } catch(_) {}
    }
    if (!sinceStr || !untilStr) {
      const today = new Date();
      untilStr = _formatDate(today);
      sinceStr = _formatDate(new Date(today.getTime() - CONFIG.DEFAULT_DAYS * 86400000));
    }

    const cacheKey = 'doGet_direct_' + googleAcc.customerId.replace(/-/g,'') + '_' + sinceStr + '_' + untilStr;
    try {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    } catch(_) {}

    const HEADER_KEYS = [
      "date","campaign","campaign_id","spent","impression","click","ctr","all_conversions",
      "directions","calls","menu","orders","other","store_visits",
      "mobile","desktop","tablet","hourly","channels","locations","distances","lead_forms"
    ];

    let rows = [];
    let leadForms = [];
    let directError = null;
    try {
      rows = _queryGoogleAdsDirect(googleAcc.customerId, sinceStr, untilStr, devToken);
      leadForms = Array.isArray(rows._leadForms) ? rows._leadForms : [];
    } catch(directErr) {
      directError = directErr && directErr.message ? directErr.message : String(directErr);
      console.warn("Direct Google Ads query failed, attempting sheet fallback: " + directError);
      try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        const shObj = ss.getSheetByName(sheetName);
        if (shObj) {
          const data = shObj.getDataRange().getValues();
          if (data.length > 1) {
            const sd = new Date(sinceStr + 'T00:00:00'), ud = new Date(untilStr + 'T23:59:59');
            for (let i = 1; i < data.length; i++) {
              const row = data[i];
              const d = new Date(row[0]);
              if (isNaN(d.getTime()) || d < sd || d > ud) continue;
              rows.push(row.map(val => val instanceof Date ? _formatDate(val) : val));
            }
          }
        }
      } catch(_) {}
    }

    const nowIso = new Date().toISOString();
    const payloadObj = { h: HEADER_KEYS, d: rows, leadForms: leadForms, syncedAt: nowIso, direct: true };
    if (directError) payloadObj.directError = directError;
    const jsonStr = JSON.stringify(payloadObj);
    if (!directError) {
      try { if (jsonStr.length < 100000) CacheService.getScriptCache().put(cacheKey, jsonStr, 1800); } catch(_) {}
    }
    return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return _json({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // ── Google Ads sync ───────────────────────────────────────
    if (body.action === 'sync') {
      syncGoogleAdsData(body.account_id);
      return _json({ ok: true, syncedAt: _getLastSyncTime(_getGoogleAccountByMetaId(body.account_id).sheetName) });
    }

    const sheet = (body.sheet || 'settings').toLowerCase();

    // ── USERS ─────────────────────────────────────────────────
    if (sheet === 'users') {
      const action = body.action || '';
      const email  = (body.email || '').trim().toLowerCase();
      if (!email) return _json({ ok: false, error: 'Missing email' });

      if (action === 'add') {
        _upsertUser({
          email, name: body.name || email.split('@')[0],
          role: body.role || 'viewer', status: body.status || 'active',
          addedAt: body.addedAt || new Date().toLocaleString('vi-VN'),
          requestAt: '', picture: body.picture || '', lastLogin: ''
        });
        return _json({ ok: true, action: 'added', email });
      }

      if (action === 'update') {
        const fields = {};
        ['name','role','status','picture','lastLogin','requestAt'].forEach(f => { if (body[f] !== undefined) fields[f] = body[f]; });
        _updateUser(email, fields);
        return _json({ ok: true, action: 'updated', email });
      }

      if (action === 'delete') {
        _deleteUser(email);
        return _json({ ok: true, action: 'deleted', email });
      }

      if (action === 'request') {
        _upsertUser({
          email, name: body.name || email.split('@')[0],
          role: 'viewer', status: 'request',
          addedAt: '', requestAt: body.requestAt || new Date().toLocaleString('vi-VN'),
          picture: body.picture || '', lastLogin: ''
        });
        return _json({ ok: true, action: 'requested', email });
      }

      return _json({ ok: false, error: 'Unknown action. Use add|update|delete|request' });
    }

    // ── AI_REPORTS ────────────────────────────────────────────
    if (sheet === 'ai_reports') {
      if (body.action === 'save') {
        if (!body.report) return _json({ ok: false, error: 'Missing report' });
        _appendAiReport(body.report);
        return _json({ ok: true, action: 'saved', id: body.report.id });
      }
      if (body.action === 'delete') {
        return _json({ ok: true, action: 'deleted', removed: _deleteAiReport(body.id) });
      }
      if (body.action === 'list') {
        return _json({ ok: true, data: _readAiReports() });
      }
      return _json({ ok: false, error: 'Unknown action. Use save|delete|list' });
    }

    // ── SETTINGS ──────────────────────────────────────────────
    if (body.settings && typeof body.settings === 'object') {
      Object.entries(body.settings).forEach(([k,v]) => _writeSetting(k,v));
      return _json({ ok: true, updated: Object.keys(body.settings) });
    }
    if (body.key !== undefined) {
      _writeSetting(body.key, body.value);
      return _json({ ok: true, key: body.key });
    }

    return _json({ ok: false, error: 'Invalid body' });

  } catch(err) {
    return _json({ ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════
//  USERS helpers
// ════════════════════════════════════════════════════════════

function _getUsersSheet() {
  const ss = _getSpreadsheet();
  let sh = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(USERS_SHEET_NAME);
    sh.getRange(1, 1, 1, USERS_HEADER.length).setValues([USERS_HEADER]).setFontWeight('bold');
    [220, 180, 80, 90, 160, 160, 300, 160].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  }
  return sh;
}

function _readUsers() {
  const sh = _getUsersSheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, USERS_HEADER.length).getValues();
  return data
    .filter(r => r[U.email])
    .map(r => ({
      email:     String(r[U.email] || '').trim(),
      name:      String(r[U.name]  || ''),
      role:      String(r[U.role]  || 'viewer'),
      status:    String(r[U.status]|| 'request'),
      addedAt:   String(r[U.addedAt]   || ''),
      requestAt: String(r[U.requestAt] || ''),
      picture:   String(r[U.picture]   || ''),
      lastLogin: String(r[U.lastLogin] || '')
    }));
}

function _findUserRow(sh, email) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const emails = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === email.toLowerCase()) return i + 2; // 1-based
  }
  return -1;
}

function _upsertUser(u) {
  const sh = _getUsersSheet();
  const rowIdx = _findUserRow(sh, u.email);
  const rowData = USERS_HEADER.map(h => u[h] !== undefined ? u[h] : '');
  if (rowIdx > 0) {
    // Update only non-empty fields, keep existing values for empty ones
    const existing = sh.getRange(rowIdx, 1, 1, USERS_HEADER.length).getValues()[0];
    const merged = existing.map((val, i) => (rowData[i] !== '' && rowData[i] !== undefined) ? rowData[i] : val);
    sh.getRange(rowIdx, 1, 1, USERS_HEADER.length).setValues([merged]);
  } else {
    sh.appendRow(rowData);
  }
}

function _updateUser(email, fields) {
  const sh = _getUsersSheet();
  const rowIdx = _findUserRow(sh, email);
  if (rowIdx < 0) return; // user not found
  const existing = sh.getRange(rowIdx, 1, 1, USERS_HEADER.length).getValues()[0];
  USERS_HEADER.forEach((h, i) => { if (fields[h] !== undefined) existing[i] = fields[h]; });
  sh.getRange(rowIdx, 1, 1, USERS_HEADER.length).setValues([existing]);
}

function _deleteUser(email) {
  const sh = _getUsersSheet();
  const rowIdx = _findUserRow(sh, email);
  if (rowIdx > 0) sh.deleteRow(rowIdx);
}

// ════════════════════════════════════════════════════════════
//  SETTINGS helpers
// ════════════════════════════════════════════════════════════

function _getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function _getSettingsSheet() {
  const ss = _getSpreadsheet();
  let sh = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SETTINGS_SHEET_NAME);
    sh.getRange(1,1,1,2).setValues([['key','value']]).setFontWeight('bold');
    sh.setColumnWidth(1,200); sh.setColumnWidth(2,800);
  }
  return sh;
}

function _readAllSettings() {
  const data = _getSettingsSheet().getDataRange().getValues();
  const out = {};
  for (let i = 1; i < data.length; i++) {
    const k = data[i][0]; if (!k) continue;
    try { out[k] = JSON.parse(data[i][1]); } catch { out[k] = data[i][1]; }
  }
  return out;
}

function _writeSetting(key, value) {
  const sh = _getSettingsSheet();
  const data = sh.getDataRange().getValues();
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  // Auto-detect: nếu row 0 là header "key/value" thì bắt đầu từ i=1, nếu không thì i=0
  const startIdx = (data.length > 0 && String(data[0][0]).toLowerCase() === 'key') ? 1 : 0;
  for (let i = startIdx; i < data.length; i++) {
    if (data[i][0] === key) { sh.getRange(i+1,2).setValue(v); return; }
  }
  const row = sh.getLastRow()+1;
  sh.getRange(row,1).setValue(key);
  sh.getRange(row,2).setValue(v);
}

// Chạy 1 lần để dọn duplicate keys trong SETTINGS sheet
function deduplicateSettings() {
  const sh = _getSettingsSheet();
  const data = sh.getDataRange().getValues();
  const seen = {}, toDelete = [];
  // Duyệt từ dưới lên, giữ lại row CUỐI CÙNG của mỗi key (mới nhất)
  for (let i = data.length - 1; i >= 0; i--) {
    const k = String(data[i][0] || '').trim();
    if (!k || k === 'key') continue; // skip header hoặc empty
    if (seen[k]) toDelete.push(i + 1); // row 1-based
    else seen[k] = true;
  }
  toDelete.sort((a,b) => b - a).forEach(r => sh.deleteRow(r));
  console.log(`✅ Đã xóa ${toDelete.length} row trùng trong SETTINGS.`);
}

// ════════════════════════════════════════════════════════════
//  AI_REPORTS helpers
// ════════════════════════════════════════════════════════════

function _getAiSheet() {
  const ss = _getSpreadsheet();
  let sh = ss.getSheetByName(AI_REPORTS_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(AI_REPORTS_SHEET_NAME);
    sh.getRange(1,1,1,AI_COLS_TOTAL).setValues([['ID','Timestamp','Label','Brand','DateRange','Preview','HTML']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    [120,180,200,160,200,400,600].forEach((w,i) => sh.setColumnWidth(i+1,w));
  }
  return sh;
}

function _readAiReports() {
  const sh = _getAiSheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2,1,lastRow-1,AI_COLS_TOTAL).getValues();
  return data
    .filter(r => r[0])
    .map(r => ({ id:r[0], timestamp:r[1], label:r[2], brand:r[3], dateRange:r[4], preview:r[5], html:r[6] }))
    .sort((a,b) => Number(b.id)-Number(a.id));
}

function _appendAiReport(report) {
  const sh = _getAiSheet();
  sh.appendRow([ report.id||Date.now(), report.timestamp||new Date().toLocaleString('vi-VN'), report.label||'', report.brand||'', report.dateRange||'', report.preview||'', report.html||'' ]);
  if (sh.getLastRow()-1 > 30) sh.deleteRow(2);
}

function _deleteAiReport(id) {
  const sh = _getAiSheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return false;
  const ids = sh.getRange(2,AI_COL.id,lastRow-1,1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) { sh.deleteRow(i+2); return true; }
  }
  return false;
}

// ════════════════════════════════════════════════════════════
//  GOOGLE ADS SYNC  (giữ nguyên logic từ google_data.gs)
// ════════════════════════════════════════════════════════════

function syncGoogleAdsData(accountId) {
  const today = new Date();
  const since = _formatDate(new Date(today.getTime() - CONFIG.DEFAULT_DAYS * 86400000));
  const until = _formatDate(today);
  
  const accounts = (accountId && typeof accountId !== 'object') 
    ? [_getGoogleAccountByMetaId(accountId)] 
    : ACCOUNTS_TO_SYNC;

  accounts.forEach(acc => {
    console.log(`📅 Incremental Sync (${CONFIG.DEFAULT_DAYS} ngày) cho ${acc.customerId} -> ${acc.sheetName}: ${since} → ${until}`);
    _fetchAndWriteData(acc.customerId, acc.sheetName, since, until, false);
  });
}

function fullHistorySync() {
  const today = new Date();
  const since = _formatDate(new Date(today.getTime() - 90 * 86400000));
  const until = _formatDate(today);
  ACCOUNTS_TO_SYNC.forEach(acc => {
    console.log(`📅 Full History Sync cho ${acc.customerId} -> ${acc.sheetName}: ${since} → ${until}`);
    _fetchAndWriteData(acc.customerId, acc.sheetName, since, until, true);
  });
}

function syncFromFeb25() {
  const since = "2026-02-25";
  const until = _formatDate(new Date());
  ACCOUNTS_TO_SYNC.forEach(acc => {
    console.log(`📅 Custom Sync từ ${since} đến ${until} cho ${acc.customerId} -> ${acc.sheetName}`);
    _fetchAndWriteData(acc.customerId, acc.sheetName, since, until, false);
  });
}

function autoBackfillPast45Days() {
  const today = new Date();
  const since = _formatDate(new Date(today.getTime() - 45 * 86400000));
  const until = _formatDate(today);
  ACCOUNTS_TO_SYNC.forEach(acc => {
    console.log(`📅 Auto Backfill (45 days) cho ${acc.customerId} -> ${acc.sheetName}: ${since} → ${until}`);
    _fetchAndWriteData(acc.customerId, acc.sheetName, since, until, false);
  });
}

function createMonthlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { 
    if (t.getHandlerFunction().includes("autoBackfillPast45Days")) ScriptApp.deleteTrigger(t); 
  });
  ScriptApp.newTrigger("autoBackfillPast45Days").timeBased().onMonthDay(1).atHour(3).create();
  console.log("✅ Đã tạo Trigger tự động quét lại 45 ngày vào lúc 3h sáng ngày 1 hàng tháng.");
}

const HEADER_DATA = [
  "Date","Campaign","Campaign ID","Spent (₫)","Impressions","Clicks","CTR (%)","All Conversions",
  "Directions","Calls","Menu","Orders","Other","Store Visits",
  "Mobile","Desktop","Tablet","Hourly","Channels","Locations","Distances"
];

function _queryGoogleAdsDirect(customerIdStr, since, until, devToken) {
  const customerId = customerIdStr.replace(/-/g,'');
  let headers = _getApiHeaders(devToken);
  const url = `${GADS_API_BASE}/customers/${customerId}/googleAds:searchStream`;

  const days = Math.max(1, Math.round((new Date(until)-new Date(since))/86400000)+1);
  const LIM_BASE   = Math.min(Math.max(days*500,  5000),20000);
  const LIM_HOURLY = Math.min(Math.max(days*3000,10000),50000);
  const LIM_GEO    = Math.min(Math.max(days*1000,10000),50000);

  const qBase        = `SELECT segments.date, campaign.name, campaign.id, segments.device, segments.ad_network_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.status != REMOVED ORDER BY segments.date DESC LIMIT ${LIM_BASE}`;
  const qConv        = `SELECT segments.date, campaign.name, segments.device, segments.conversion_action_category, segments.conversion_action_name, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.status != REMOVED AND metrics.all_conversions > 0 ORDER BY segments.date DESC LIMIT ${LIM_BASE}`;
  const qHourly      = `SELECT segments.date, campaign.name, segments.hour, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.status != REMOVED ORDER BY segments.date DESC, segments.hour LIMIT ${LIM_HOURLY}`;
  const qHourlyConv  = `SELECT segments.date, campaign.name, segments.hour, segments.conversion_action_category, segments.conversion_action_name, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.status != REMOVED AND metrics.all_conversions > 0 ORDER BY segments.date DESC, segments.hour LIMIT ${LIM_HOURLY}`;
  const qLocations   = `SELECT campaign.name, segments.date, segments.geo_target_city, segments.geo_target_region, geographic_view.country_criterion_id, geographic_view.location_type, metrics.impressions, metrics.clicks, metrics.all_conversions, metrics.cost_micros FROM geographic_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND geographic_view.location_type = LOCATION_OF_PRESENCE ORDER BY metrics.impressions DESC LIMIT ${LIM_GEO}`;
  const qDistances   = `SELECT campaign.name, segments.date, distance_view.distance_bucket, metrics.impressions, metrics.clicks, metrics.all_conversions, metrics.cost_micros FROM distance_view WHERE segments.date BETWEEN '${since}' AND '${until}' ORDER BY segments.date DESC LIMIT ${LIM_GEO}`;
  const qChanConv    = `SELECT campaign.name, segments.date, segments.ad_network_type, segments.conversion_action_category, segments.conversion_action_name, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.status != REMOVED AND metrics.all_conversions > 0 ORDER BY segments.date DESC LIMIT ${LIM_BASE}`;
  const qLocConv     = `SELECT campaign.name, segments.date, segments.geo_target_city, segments.geo_target_region, geographic_view.country_criterion_id, segments.conversion_action_category, segments.conversion_action_name, metrics.all_conversions FROM geographic_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND geographic_view.location_type = LOCATION_OF_PRESENCE AND metrics.all_conversions > 0 ORDER BY segments.date DESC LIMIT ${LIM_GEO}`;
  const qDistConv    = `SELECT campaign.name, segments.date, distance_view.distance_bucket, segments.conversion_action_category, segments.conversion_action_name, metrics.all_conversions FROM distance_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND metrics.all_conversions > 0 ORDER BY segments.date DESC LIMIT ${LIM_GEO}`;
  const qLeadForms   = `SELECT lead_form_submission_data.id, lead_form_submission_data.campaign, lead_form_submission_data.submission_date_time, lead_form_submission_data.lead_form_fields FROM lead_form_submission_data ORDER BY lead_form_submission_data.submission_date_time DESC LIMIT 500`;

  const mk = (q, hdrs) => ({ url, method:'post', headers: hdrs, payload: JSON.stringify({ query:q }), muteHttpExceptions:true });
  const queries = [qBase,qConv,qHourly,qHourlyConv,qLocations,qDistances,qChanConv,qLocConv,qDistConv,qLeadForms];
  let responses = UrlFetchApp.fetchAll(queries.map(q => mk(q, headers)));

  if (responses[0].getResponseCode() === 403 && headers['login-customer-id']) {
    headers = _getApiHeaders(devToken, true);
    responses = UrlFetchApp.fetchAll(queries.map(q => mk(q, headers)));
  }

  const baseData         = _parseResponse(responses[0],'Base');       if (!baseData) return [];
  const convData         = _parseResponse(responses[1],'Conv',   true)||[];
  const hourlyData       = _parseResponse(responses[2],'Hourly', true)||[];
  const hourlyConvData   = _parseResponse(responses[3],'HConv',  true)||[];
  const locationsData    = _parseResponse(responses[4],'Loc',    true)||[];
  const distancesData    = _parseResponse(responses[5],'Dist',   true)||[];
  const channelConvData  = _parseResponse(responses[6],'ChConv', true)||[];
  const locationConvData = _parseResponse(responses[7],'LocConv',true)||[];
  const distanceConvData = _parseResponse(responses[8],'DistConv',true)||[];
  const leadFormData     = _parseResponse(responses[9],'LeadForm',true)||[];

  const initDevice = () => ({'Impression':0,'Click':0,'All Conversions':0,'Lead Forms':0,'Directions':0,'Calls':0,'Menu':0,'Orders':0,'Other':0,'Store Visits':0,'Spent':0});
  const rowsMap = {};
  const CH_MAP  = {SEARCH:'Search',SEARCH_PARTNERS:'Search Partners',CONTENT:'Display',YOUTUBE_SEARCH:'YouTube',YOUTUBE_WATCH:'YouTube',MIXED:'PMAX',GOOGLE_TV:'TV',UNKNOWN:'Unknown'};

  for (const batch of baseData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},camp=r.campaign||{},met=r.metrics||{};
      const key=`${seg.date||''}|${camp.name||''}`;
      if (!rowsMap[key]) rowsMap[key]={ date:seg.date||'',campaign:camp.name||'',campaignId:String(camp.id||''), totals:{spent:0,imp:0,clicks:0,cvs:0,lead_forms:0,dir:0,calls:0,menu:0,orders:0,other:0,visits:0}, devices:{MOBILE:initDevice(),DESKTOP:initDevice(),TABLET:initDevice()}, hourly:{},channels:{},locations:{},distances:{} };
      const spent=parseFloat(((met.costMicros||0)/1e6).toFixed(0)),imp=parseInt(met.impressions||0),clicks=parseInt(met.clicks||0),cvs=parseFloat((met.allConversions||0).toFixed(2));
      rowsMap[key].totals.spent+=spent; rowsMap[key].totals.imp+=imp; rowsMap[key].totals.clicks+=clicks; rowsMap[key].totals.cvs+=cvs;
      if (['MOBILE','DESKTOP','TABLET'].includes(seg.device)) { rowsMap[key].devices[seg.device].Impression+=imp; rowsMap[key].devices[seg.device].Click+=clicks; rowsMap[key].devices[seg.device]['All Conversions']+=cvs; rowsMap[key].devices[seg.device].Spent+=spent; }
      if (seg.adNetworkType) { const ch=CH_MAP[seg.adNetworkType]||seg.adNetworkType; if (!rowsMap[key].channels[ch]) rowsMap[key].channels[ch]={imp:0,click:0,conv:0,cost:0,visits:0,dir:0,calls:0,menu:0,orders:0}; rowsMap[key].channels[ch].imp+=imp; rowsMap[key].channels[ch].click+=clicks; rowsMap[key].channels[ch].conv+=cvs; rowsMap[key].channels[ch].cost+=spent; }
    }
  }

  const convTypeOf = seg => {
    const cat = String(seg.conversionActionCategory || '').toUpperCase();
    if (cat === 'STORE_VISIT') return 'visits';
    if (['SUBMIT_LEAD_FORM','LEAD','CONTACT','BOOK_APPOINTMENT','GET_QUOTE','SIGNUP'].includes(cat)) return 'lead_forms';
    const n=(seg.conversionActionName||'').toLowerCase();
    if (n.includes('lead') || n.includes('form') || n.includes('đăng ký') || n.includes('tư vấn') || n.includes('liên hệ') || n.includes('submit')) return 'lead_forms';
    return n.includes('direction')?'dir':n.includes('call')?'calls':n.includes('menu')?'menu':n.includes('order')?'orders':n.includes('other engagement')?'other':null;
  };
  const DEV_KEY = {visits:'Store Visits',lead_forms:'Lead Forms',dir:'Directions',calls:'Calls',menu:'Menu',orders:'Orders',other:'Other'};

  for (const batch of convData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const cvs=parseFloat(((r.metrics||{}).allConversions||0).toFixed(0)),type=convTypeOf(seg); if (!type) continue;
      rowsMap[key].totals[type]+=cvs;
      if (['MOBILE','DESKTOP','TABLET'].includes(seg.device)) rowsMap[key].devices[seg.device][DEV_KEY[type]]+=cvs;
    }
  }
  for (const batch of hourlyData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]||seg.hour==null) continue;
      const h=String(seg.hour); if (!rowsMap[key].hourly[h]) rowsMap[key].hourly[h]={imp:0,click:0,spent:0,conv:0,visits:0,dir:0,calls:0,menu:0,orders:0};
      rowsMap[key].hourly[h].imp+=parseInt(r.metrics?.impressions||0); rowsMap[key].hourly[h].click+=parseInt(r.metrics?.clicks||0); rowsMap[key].hourly[h].spent+=parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0)); rowsMap[key].hourly[h].conv+=parseFloat((r.metrics?.allConversions||0).toFixed(2));
    }
  }
  for (const batch of hourlyConvData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]||seg.hour==null) continue;
      const h=String(seg.hour),cvs=parseFloat(((r.metrics||{}).allConversions||0).toFixed(2)),type=convTypeOf(seg); if (!cvs||!type) continue;
      if (!rowsMap[key].hourly[h]) rowsMap[key].hourly[h]={imp:0,click:0,spent:0,conv:0,visits:0,dir:0,calls:0,menu:0,orders:0};
      rowsMap[key].hourly[h][type]+=cvs;
    }
  }

  const VN_LOC={'2704':'Việt Nam (Tổng)','9040331':'Hà Nội','9040373':'TP. Hồ Chí Minh','9040371':'Biên Hòa (Đồng Nai)','1028509':'An Giang','1028510':'Bà Rịa - Vũng Tàu','1028511':'Bắc Giang','1028512':'Bắc Kạn','1028513':'Bạc Liêu','1028514':'Bắc Ninh','1028515':'Bến Tre','1028516':'Bình Định','1028517':'Bình Dương','1028518':'Bình Phước','1028519':'Bình Thuận','1028520':'Cà Mau','1028584':'Cần Thơ','1028521':'Cao Bằng','1028582':'Đà Nẵng','1028522':'Đắk Lắk','1028523':'Đắk Nông','1028524':'Điện Biên','1028525':'Đồng Nai','1028526':'Đồng Tháp','1028527':'Gia Lai','1028528':'Hà Giang','1028529':'Hà Nam','1028580':'Hà Nội','1028530':'Hà Tĩnh','1028531':'Hải Dương','1028583':'Hải Phòng','1028532':'Hậu Giang','1028533':'Hòa Bình','1028534':'Hưng Yên','1028535':'Lạng Sơn','1028536':'Kiên Giang','1028537':'Kon Tum','1028538':'Lai Châu','1028539':'Lâm Đồng','1028540':'Nam Định','1028541':'Nghệ An','1028542':'Ninh Bình','1028543':'Ninh Thuận','1028544':'Phú Thọ','1028545':'Phú Yên','1028546':'Quảng Bình','1028547':'Quảng Nam','1028548':'Quảng Ngãi','1028549':'Quảng Ninh','1028550':'Quảng Trị','1028551':'Sóc Trăng','1028552':'Sơn La','1028553':'Tây Ninh','1028554':'Thái Bình','1028555':'Thái Nguyên','1028556':'Thanh Hóa','1028557':'Thừa Thiên Huế','1028558':'Tiền Giang','1028581':'TP. Hồ Chí Minh','1028559':'Trà Vinh','1028560':'Tuyên Quang','1028561':'Vĩnh Long','1028562':'Vĩnh Phúc','1028563':'Yên Bái','1028570':'Long An'};
  const missingGeoIds = new Set();

  const geoKey = r => {
    const seg=r.segments||{},gv=r.geographicView||{};
    const res=(seg.geoTargetCity||seg.geoTargetRegion||'');
    return res ? res.split('/').pop() : String(gv.countryCriterionId||'unk');
  };

  for (const batch of locationsData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const cid=geoKey(r); if (cid!=='unk'&&!VN_LOC[cid]) missingGeoIds.add(cid);
      const name=VN_LOC[cid]||`Loc_${cid}`;
      if (!rowsMap[key].locations[cid]) rowsMap[key].locations[cid]={name,imp:0,click:0,conv:0,cost:0,visits:0,dir:0,calls:0,menu:0,orders:0};
      rowsMap[key].locations[cid].imp+=parseInt(r.metrics?.impressions||0); rowsMap[key].locations[cid].click+=parseInt(r.metrics?.clicks||0); rowsMap[key].locations[cid].conv+=parseFloat((r.metrics?.allConversions||0).toFixed(2)); rowsMap[key].locations[cid].cost+=parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0));
    }
  }
  for (const batch of locationConvData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const cid=geoKey(r); if (!rowsMap[key].locations[cid]) continue;
      const cvs=parseFloat(((r.metrics||{}).allConversions||0).toFixed(2)),type=convTypeOf(seg); if (!cvs||!type) continue;
      rowsMap[key].locations[cid][type]+=cvs;
    }
  }
  for (const batch of distancesData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const bk=(r.distanceView||{}).distanceBucket||'UNKNOWN';
      if (!rowsMap[key].distances[bk]) rowsMap[key].distances[bk]={imp:0,click:0,conv:0,cost:0,visits:0,dir:0,calls:0,menu:0,orders:0};
      rowsMap[key].distances[bk].imp+=parseInt(r.metrics?.impressions||0); rowsMap[key].distances[bk].click+=parseInt(r.metrics?.clicks||0); rowsMap[key].distances[bk].conv+=parseFloat((r.metrics?.allConversions||0).toFixed(2)); rowsMap[key].distances[bk].cost+=parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0));
    }
  }
  for (const batch of channelConvData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const ch=CH_MAP[seg.adNetworkType]||seg.adNetworkType||'Other'; if (!rowsMap[key].channels[ch]) continue;
      const cvs=parseFloat(((r.metrics||{}).allConversions||0).toFixed(2)),type=convTypeOf(seg); if (!cvs||!type) continue;
      rowsMap[key].channels[ch][type]+=cvs;
    }
  }
  for (const batch of distanceConvData) {
    for (const r of (batch.results||[])) {
      const seg=r.segments||{},key=`${seg.date}|${(r.campaign||{}).name}`; if (!rowsMap[key]) continue;
      const bk=(r.distanceView||{}).distanceBucket||'UNKNOWN'; if (!rowsMap[key].distances[bk]) continue;
      const cvs=parseFloat(((r.metrics||{}).allConversions||0).toFixed(2)),type=convTypeOf(seg); if (!cvs||!type) continue;
      rowsMap[key].distances[bk][type]+=cvs;
    }
  }

  // Auto lookup unknown geo IDs
  if (missingGeoIds.size > 0) {
    const idsStr = Array.from(missingGeoIds).filter(id=>id&&id!=='unk').slice(0,500).join(',');
    if (idsStr) {
      const geoUrl = `${GADS_API_BASE}/customers/${customerId}/googleAds:searchStream`;
      const geoResp = UrlFetchApp.fetch(geoUrl, { method:'post', headers:headers, payload: JSON.stringify({ query:`SELECT geo_target_constant.id, geo_target_constant.name FROM geo_target_constant WHERE geo_target_constant.id IN (${idsStr})` }), muteHttpExceptions:true });
      if (geoResp.getResponseCode()===200) {
        const geoData=JSON.parse(geoResp.getContentText());
        (Array.isArray(geoData)?geoData:[geoData]).forEach(batch=>(batch.results||[]).forEach(r=>{ if (r.geoTargetConstant?.id&&r.geoTargetConstant?.name) VN_LOC[r.geoTargetConstant.id]=r.geoTargetConstant.name; }));
        Object.values(rowsMap).forEach(row=>Object.keys(row.locations).forEach(cid=>{ if (VN_LOC[cid]) row.locations[cid].name=VN_LOC[cid]; }));
      }
    }
  }

  // Map native Lead Form Asset submissions into both leadForms list and row totals
  const campIdToName = {};
  Object.values(rowsMap).forEach(rw => { if (rw.campaignId && rw.campaign) campIdToName[rw.campaignId] = rw.campaign; });
  const leadFormsList = [];
  for (const batch of leadFormData) {
    for (const r of (batch.results || [])) {
      const lf = r.leadFormSubmissionData || {};
      const dtFull = String(lf.submissionDateTime || '');
      const dStr = dtFull.slice(0, 10);
      if (dStr && (dStr < since || dStr > until)) continue;
      const cid = String(lf.campaign || '').split('/').pop();
      const cName = campIdToName[cid] || (cid ? `Campaign ${cid}` : 'Google Ads');
      const fields = (lf.leadFormFields || []).map(f => ({ field_type: f.fieldType || '', field_value: f.fieldValue || '' }));
      leadFormsList.push({ id: lf.id || '', campaign_id: cid, campaign: cName, submission_date_time: dtFull, date: dStr, fields });
      const rKey = `${dStr}|${cName}`;
      if (rowsMap[rKey]) rowsMap[rKey].totals.lead_forms += 1;
    }
  }

  const DIST_ORDER=['WITHIN_700M','WITHIN_1KM','WITHIN_5KM','WITHIN_10KM','WITHIN_15KM','WITHIN_20KM','WITHIN_25KM','WITHIN_30KM','WITHIN_35KM','WITHIN_40KM','WITHIN_45KM','WITHIN_50KM','WITHIN_55KM','WITHIN_60KM','WITHIN_65KM','BEYOND_65KM'];

  const finalRows = Object.values(rowsMap).sort((a,b)=>b.date.localeCompare(a.date)).map(row=>{
    const t=row.totals;
    const ctr=t.imp>0?parseFloat((t.clicks/t.imp*100).toFixed(4)):0;
    const hourlyArr=Object.entries(row.hourly).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([h,v])=>({h:parseInt(h),...v}));
    const channelsArr=Object.entries(row.channels).map(([ch,v])=>({ch,...v})).sort((a,b)=>b.imp-a.imp);
    const locationsArr=Object.values(row.locations).sort((a,b)=>b.imp-a.imp).slice(0,15);
    const distancesArr=DIST_ORDER.filter(d=>row.distances[d]).map(d=>({d,...row.distances[d]}));
    Object.keys(row.distances).forEach(d=>{ if (!DIST_ORDER.includes(d)) distancesArr.push({d,...row.distances[d]}); });
    return [ row.date,row.campaign,row.campaignId, t.spent,t.imp,t.clicks,ctr,t.cvs, t.dir,t.calls,t.menu,t.orders,t.other,t.visits, JSON.stringify(row.devices.MOBILE),JSON.stringify(row.devices.DESKTOP),JSON.stringify(row.devices.TABLET), JSON.stringify(hourlyArr),JSON.stringify(channelsArr),JSON.stringify(locationsArr),JSON.stringify(distancesArr), t.lead_forms||0 ];
  });

  finalRows._leadForms = leadFormsList;
  return finalRows;
}

function _fetchAndWriteData(customerIdStr, sheetName, since, until, clearFirst) {
  const finalRows = _queryGoogleAdsDirect(customerIdStr, since, until);
  if (!finalRows.length) return console.warn('⚠️ Không có dữ liệu.');
  const sheet = _getOrCreateSheet(sheetName, HEADER_DATA);
  _smartUpsert(sheet, finalRows, since, until, HEADER_DATA, clearFirst);
  _logSyncVersion(sheetName, since, until, finalRows.length);
  console.log(`✅ Hoàn tất! Đã ghi ${finalRows.length} dòng vào sheet ${sheetName}.`);
}

// ════════════════════════════════════════════════════════════
//  KEYWORDS ON-DEMAND
// ════════════════════════════════════════════════════════════

function _getKeywordsResponse(params) {
  const campaignId=params.campaignId||'', campaignName=params.campaignName||'', since=params.since||'', until=params.until||'';
  const accountId = params.account_id || '';
  if ((!campaignId&&!campaignName)||!since||!until) return _json({ok:false,error:'Missing params'});
  const cacheKey=`kw6_${accountId}_${campaignId||campaignName}_${since}_${until}`;
  try { const c=CacheService.getScriptCache().get(cacheKey); if (c) return ContentService.createTextOutput(c).setMimeType(ContentService.MimeType.JSON); } catch(_) {}

  try {
    const devToken = params.token || params.developer_token || CONFIG.DEVELOPER_TOKEN;
    const googleAcc = _getGoogleAccountByMetaId(accountId, devToken);
    const customerId=googleAcc.customerId.replace(/-/g,'');
    const headers=_getApiHeaders(devToken);
    const url=`${GADS_API_BASE}/customers/${customerId}/googleAds:searchStream`;
    const campFilter=campaignId?`WHERE campaign.id = ${campaignId}`:`WHERE campaign.name = '${campaignName.replace(/'/g,"\\'")}'`;
    const typeResp=UrlFetchApp.fetch(url,{method:'post',headers,payload:JSON.stringify({query:`SELECT campaign.id, campaign.name, campaign.advertising_channel_type, campaign.advertising_channel_sub_type FROM campaign ${campFilter} LIMIT 1`}),muteHttpExceptions:true});
    if (typeResp.getResponseCode()!==200) return _json({ok:false,error:'API Error'});
    const firstRow=((Array.isArray(JSON.parse(typeResp.getContentText()))?JSON.parse(typeResp.getContentText())[0]:JSON.parse(typeResp.getContentText())).results||[])[0];
    if (!firstRow?.campaign) return _json({ok:false,error:'Campaign not found'});
    const campType=firstRow.campaign.advertisingChannelType||'SEARCH', campSubType=firstRow.campaign.advertisingChannelSubType||'';
    const resolvedId=firstRow.campaign.id, resolvedName=firstRow.campaign.name;
    const isPMAX=campType==='PERFORMANCE_MAX', isSmart=campSubType==='SEARCH_EXPRESS'||campType==='SMART';
    let keywords=[],searchTerms=[];

    if (isSmart) {
      const r=UrlFetchApp.fetch(url,{method:'post',headers,payload:JSON.stringify({query:`SELECT smart_campaign_search_term_view.search_term, metrics.clicks, metrics.impressions, metrics.cost_micros FROM smart_campaign_search_term_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.id = ${resolvedId} ORDER BY metrics.impressions DESC LIMIT 150`}),muteHttpExceptions:true});
      if (r.getResponseCode()===200) {
        const termMap={};
        (Array.isArray(JSON.parse(r.getContentText()))?JSON.parse(r.getContentText()):[JSON.parse(r.getContentText())]).forEach(batch=>(batch.results||[]).forEach(rv=>{ const t=rv.smartCampaignSearchTermView?.searchTerm; if (!t) return; if (!termMap[t]) termMap[t]={imp:0,click:0,cost:0}; termMap[t].imp+=parseInt(rv.metrics?.impressions||0); termMap[t].click+=parseInt(rv.metrics?.clicks||0); termMap[t].cost+=parseFloat(((rv.metrics?.costMicros||0)/1e6).toFixed(0)); }));
        searchTerms=Object.entries(termMap).sort((a,b)=>b[1].imp-a[1].imp).slice(0,50).map(([term,v])=>({term,status:'SMART',category:'',conv:0,...v}));
      }
    } else if (isPMAX) {
      const d=JSON.parse(UrlFetchApp.fetch(url,{method:'post',headers,payload:JSON.stringify({query:`SELECT search_term_insight.search_term, campaign_search_term_insight.category_label, campaign_search_term_insight.id, metrics.clicks, metrics.impressions, metrics.all_conversions, metrics.cost_micros FROM campaign_search_term_insight WHERE campaign_search_term_insight.campaign_id = '${resolvedId}' ORDER BY metrics.impressions DESC LIMIT 50`}),muteHttpExceptions:true}).getContentText()||'[]');
      (Array.isArray(d)?d:[d]).forEach(batch=>(batch.results||[]).forEach(r=>{ const term=r.searchTermInsight?.searchTerm||r.campaignSearchTermInsight?.categoryLabel; if (term) searchTerms.push({term,category:r.campaignSearchTermInsight?.categoryLabel!==term?r.campaignSearchTermInsight?.categoryLabel:'',id:r.campaignSearchTermInsight?.id||'',status:'PMAX_INSIGHT',imp:parseInt(r.metrics?.impressions||0),click:parseInt(r.metrics?.clicks||0),conv:parseFloat((r.metrics?.allConversions||0).toFixed(2)),cost:parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0))}); }));
    } else {
      const rs=UrlFetchApp.fetchAll([
        {url,method:'post',headers,payload:JSON.stringify({query:`SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group.name, metrics.impressions, metrics.clicks, metrics.all_conversions, metrics.cost_micros, metrics.search_impression_share FROM keyword_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.id = ${resolvedId} AND ad_group_criterion.status != REMOVED ORDER BY metrics.impressions DESC LIMIT 50`}),muteHttpExceptions:true},
        {url,method:'post',headers,payload:JSON.stringify({query:`SELECT search_term_view.search_term, search_term_view.status, metrics.impressions, metrics.clicks, metrics.all_conversions, metrics.cost_micros FROM search_term_view WHERE segments.date BETWEEN '${since}' AND '${until}' AND campaign.id = ${resolvedId} ORDER BY metrics.impressions DESC LIMIT 50`}),muteHttpExceptions:true}
      ]);
      const p=t=>Array.isArray(JSON.parse(t||'[]'))?JSON.parse(t||'[]'):[JSON.parse(t||'[]')];
      p(rs[0].getContentText()).forEach(b=>(b.results||[]).forEach(r=>keywords.push({keyword:r.adGroupCriterion?.keyword?.text||'(unknown)',matchType:r.adGroupCriterion?.keyword?.matchType||'',adGroup:r.adGroup?.name||'',imp:parseInt(r.metrics?.impressions||0),click:parseInt(r.metrics?.clicks||0),conv:parseFloat((r.metrics?.allConversions||0).toFixed(2)),cost:parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0)),impShare:r.metrics?.searchImpressionShare?parseFloat((r.metrics.searchImpressionShare*100).toFixed(1)):null})));
      p(rs[1].getContentText()).forEach(b=>(b.results||[]).forEach(r=>searchTerms.push({term:r.searchTermView?.searchTerm||'',status:r.searchTermView?.status||'',imp:parseInt(r.metrics?.impressions||0),click:parseInt(r.metrics?.clicks||0),conv:parseFloat((r.metrics?.allConversions||0).toFixed(2)),cost:parseFloat(((r.metrics?.costMicros||0)/1e6).toFixed(0))})));
    }

    const result=JSON.stringify({ok:true,keywords,searchTerms,since,until,campaignId:resolvedId,campaignName:resolvedName,campType,campSubType,isPMAX,isSmart});
    try { if (result.length<100000) CacheService.getScriptCache().put(cacheKey,result,3600); } catch(_) {}
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch(err) { return _json({ok:false,error:err.message}); }
}

// ════════════════════════════════════════════════════════════
//  UTILITY HELPERS
// ════════════════════════════════════════════════════════════

function _getApiHeaders(customToken, skipLoginCustomerId) {
  const token = customToken || CONFIG.DEVELOPER_TOKEN;
  const h={'Authorization':'Bearer '+ScriptApp.getOAuthToken(),'developer-token':token,'Content-Type':'application/json'};
  if (!skipLoginCustomerId && CONFIG.LOGIN_CUSTOMER_ID) h['login-customer-id']=CONFIG.LOGIN_CUSTOMER_ID.replace(/-/g,'');
  return h;
}

function _getOrCreateSheet(name, headersArr) {
  const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sh=ss.getSheetByName(name);
  if (!sh) { sh=ss.insertSheet(name); sh.getRange(1,1,1,headersArr.length).setValues([headersArr]).setFontWeight('bold'); }
  return sh;
}

function _smartUpsert(sheet, newRows, since, until, headersArr, clearFirst) {
  const NUM_COLS=headersArr.length;
  const clean=rows=>rows.map(row=>{ const r=row.slice(0,NUM_COLS); while(r.length<NUM_COLS) r.push(''); return r; });
  const sanitized=clean(newRows);
  if (clearFirst||sheet.getLastRow()<=1) {
    sanitized.sort((a,b)=>new Date(b[0]||0)-new Date(a[0]||0));
    sheet.clearContents(); sheet.getRange(1,1,1,NUM_COLS).setValues([headersArr]).setFontWeight('bold');
    if (sanitized.length) sheet.getRange(2,1,sanitized.length,NUM_COLS).setValues(sanitized);
    return;
  }
  const data=sheet.getDataRange().getValues(), header=data[0].slice(0,NUM_COLS); while(header.length<NUM_COLS) header.push('');
  const dateIdx=header.indexOf('Date')>-1?header.indexOf('Date'):0;
  const sd=new Date(since+'T00:00:00'), ud=new Date(until+'T23:59:59');
  const kept=[header];
  for (let i=1;i<data.length;i++) {
    const d=data[i][dateIdx] instanceof Date?data[i][dateIdx]:new Date(data[i][dateIdx]);
    if (isNaN(d.getTime())||d<sd||d>ud) { const r=data[i].slice(0,NUM_COLS); while(r.length<NUM_COLS) r.push(''); kept.push(r); }
  }
  const all=[...kept.slice(1),...sanitized];
  all.sort((a,b)=>new Date(b[0]||0)-new Date(a[0]||0));
  sheet.clearContents(); const rows=[header,...all];
  sheet.getRange(1,1,rows.length,NUM_COLS).setValues(rows);
}

function _parseResponse(resp, label, optional=false) {
  const code=resp.getResponseCode();
  if (code!==200) { const msg=resp.getContentText().substring(0,400); if (optional){console.warn(`⚠️ ${label} skipped: ${msg}`);return null;} throw new Error(`${label} API Error ${code}: ${msg}`); }
  const text=resp.getContentText().trim(); if (!text||text==='[]') return [];
  try { const p=JSON.parse(text); return Array.isArray(p)?p:[p]; } catch { return []; }
}

function _json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function _formatDate(date) { return date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2); }
function _clearDoGetCache() {
  try {
    const cache = CacheService.getScriptCache();
    const accounts = ['', '1283070995510667', '676599667843841', '295-339-0933', '2953390933', 'ecolifesignature'];
    accounts.forEach(accId => {
      cache.remove('doGet_' + accId + '_all');
      cache.remove('doGet_direct_' + accId.replace(/-/g,'') + '_all');
      const t = new Date();
      for (let i = 0; i <= 90; i++) {
        const ds = _formatDate(new Date(t.getTime() - i * 86400000));
        cache.remove('doGet_' + accId + '_' + JSON.stringify({ since: ds, until: ds }));
        cache.remove('doGet_direct_' + accId.replace(/-/g,'') + '_' + ds + '_' + ds);
      }
    });
  } catch(_) {}
}

function _getLastSyncTime(sheetName) {
  try {
    const v = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('Version');
    if (!v || v.getLastRow() < 2) return null;
    if (!sheetName) return v.getRange(v.getLastRow(),1).getValue().toString();
    const data = v.getRange(2, 1, v.getLastRow() - 1, 5).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][4] || '').trim() === sheetName) {
        return data[i][0].toString();
      }
    }
    return v.getRange(v.getLastRow(),1).getValue().toString();
  } catch(_) { return null; }
}

function _logSyncVersion(sheetName, since, until, rowCount) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let v = ss.getSheetByName('Version');
    if (!v) {
      v = ss.insertSheet('Version');
      v.getRange(1, 1, 1, 5).setValues([['Synced At', 'Since', 'Until', 'Rows', 'Sheet']]).setFontWeight('bold');
    }
    v.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), since, until, rowCount, sheetName]);
  } catch(_) {}
}

// ── Triggers ────────────────────────────────────────────────
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction().includes('syncGoogleAdsData'))ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('syncGoogleAdsData').timeBased().everyDays(1).atHour(2).create();
  console.log('✅ Trigger tự động 2h sáng đã được tạo.');
}
function revokeOAuth() { ScriptApp.invalidateAuth(); console.log('✅ Đã xóa OAuth cũ.'); }

// ════════════════════════════════════════════════════════════
//  OFFLINE CONVERSION UPLOAD (Google Ads API v23)
//  Đọc lead có gclid / gbraid / wbraid từ Sheet và đẩy bù về Google Ads
// ════════════════════════════════════════════════════════════

const OFFLINE_CONVERSION_CONFIG = {
  SPREADSHEET_ID:       "1tFYwBIpCtxcN5_YUnUlY3rvsuaDhnlpuA6GirllqEKA",
  SHEET_NAME:           "website",
  CUSTOMER_ID:          "295-339-0933",
  CONVERSION_ACTION_ID: "7906112050", // Conversion Action "Submit lead form (Offline Import)"
  ACTION_NAME:          "Submit lead form (Offline Import)",
  DEFAULT_VALUE:        1,
  CURRENCY_CODE:        "VND",
};

const _OFFLINE_PROP_KEY = "dom_uploaded_offline_leads_v1";

function _adsApiPostWithMccFallback(url, payloadObj, devToken) {
  let headers = _getApiHeaders(devToken);
  let resp = UrlFetchApp.fetch(url, {
    method: "post",
    headers: headers,
    payload: JSON.stringify(payloadObj),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() === 403 && headers["login-customer-id"]) {
    headers = _getApiHeaders(devToken, true);
    resp = UrlFetchApp.fetch(url, {
      method: "post",
      headers: headers,
      payload: JSON.stringify(payloadObj),
      muteHttpExceptions: true
    });
  }
  return resp;
}

/**
 * Tìm hoặc tạo Conversion Action loại UPLOAD_CLICKS (category: SUBMIT_LEAD_FORM).
 * Lưu ý: Google Ads cần ~4-6 giờ sau khi tạo mới một Conversion Action để API uploadClickConversions chấp nhận.
 */
function ensureOfflineConversionAction() {
  if (OFFLINE_CONVERSION_CONFIG.CONVERSION_ACTION_ID) {
    return String(OFFLINE_CONVERSION_CONFIG.CONVERSION_ACTION_ID).trim();
  }
  const customerId = OFFLINE_CONVERSION_CONFIG.CUSTOMER_ID.replace(/-/g, "");
  const searchUrl = `${GADS_API_BASE}/customers/${customerId}/googleAds:searchStream`;
  const q = `SELECT conversion_action.id, conversion_action.name, conversion_action.type, conversion_action.category, conversion_action.status FROM conversion_action WHERE conversion_action.type = 'UPLOAD_CLICKS' AND conversion_action.status != 'REMOVED'`;

  const searchResp = _adsApiPostWithMccFallback(searchUrl, { query: q });
  if (searchResp.getResponseCode() !== 200) {
    throw new Error("Không truy vấn được conversion_action: " + searchResp.getContentText().slice(0, 400));
  }

  const parsed = JSON.parse(searchResp.getContentText() || "[]");
  const rows = [];
  (Array.isArray(parsed) ? parsed : [parsed]).forEach(b => (b.results || []).forEach(r => {
    if (r.conversionAction) rows.push(r.conversionAction);
  }));

  const exact = rows.find(a => a.name === OFFLINE_CONVERSION_CONFIG.ACTION_NAME)
             || rows.find(a => String(a.category || "").toUpperCase() === "SUBMIT_LEAD_FORM")
             || rows[0];

  if (exact && exact.id) {
    console.log(`✅ Dùng Conversion Action sẵn có: "${exact.name}" (ID: ${exact.id})`);
    return String(exact.id);
  }

  const mutateUrl = `${GADS_API_BASE}/customers/${customerId}/conversionActions:mutate`;
  const createPayload = {
    operations: [{
      create: {
        name: OFFLINE_CONVERSION_CONFIG.ACTION_NAME,
        type: "UPLOAD_CLICKS",
        category: "SUBMIT_LEAD_FORM",
        status: "ENABLED",
        primaryForGoal: true,
        countingType: "ONE_PER_CLICK",
        valueSettings: {
          defaultValue: OFFLINE_CONVERSION_CONFIG.DEFAULT_VALUE,
          defaultCurrencyCode: OFFLINE_CONVERSION_CONFIG.CURRENCY_CODE,
          alwaysUseDefaultValue: false
        }
      }
    }],
    partialFailure: false,
    validateOnly: false
  };

  const createResp = _adsApiPostWithMccFallback(mutateUrl, createPayload);
  const createText = createResp.getContentText();
  if (createResp.getResponseCode() !== 200) {
    throw new Error("Không tạo được Conversion Action UPLOAD_CLICKS: " + createText.slice(0, 500));
  }
  const resJson = JSON.parse(createText || "{}");
  const resName = resJson.results && resJson.results[0] && resJson.results[0].resourceName;
  const newId = resName ? String(resName).split("/").pop() : "";
  console.log(`✅ Đã tạo mới Conversion Action "${OFFLINE_CONVERSION_CONFIG.ACTION_NAME}" (ID: ${newId}). Lưu ý: Google Ads cần 4-6 tiếng đồng bộ trước khi nhận uploadClickConversions.`);
  return newId;
}

function _formatAdsConversionDateTime(val) {
  let d = null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    d = val;
  } else if (typeof val === "number" && !isNaN(val)) {
    d = new Date(Math.round((val - 25569) * 86400 * 1000));
  } else {
    const s = String(val || "").trim();
    if (!s) return null;
    // Match dd/MM/yyyy HH:mm:ss or yyyy-MM-dd HH:mm:ss
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (dmy) {
      const dd = dmy[1].padStart(2, "0"), mm = dmy[2].padStart(2, "0"), yyyy = dmy[3];
      const hh = (dmy[4] || "00").padStart(2, "0"), mi = (dmy[5] || "00").padStart(2, "0"), ss = (dmy[6] || "00").padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}+07:00`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) d = parsed;
  }
  if (!d) return null;
  return Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss") + "+07:00";
}

function _extractClickTracking(text) {
  const s = String(text || "").replace(/&amp;/g, "&");
  const pick = (key) => {
    const m = s.match(new RegExp("(?:[?&#]|^)" + key + "=([^&#\\s]+)", "i"));
    if (!m) return "";
    try { return decodeURIComponent(m[1]).trim(); } catch (_) { return m[1].trim(); }
  };
  return {
    gclid:  pick("gclid"),
    gbraid: pick("gbraid"),
    wbraid: pick("wbraid")
  };
}

function _collectOfflineLeadsFromSheet() {
  const ss = SpreadsheetApp.openById(OFFLINE_CONVERSION_CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(OFFLINE_CONVERSION_CONFIG.SHEET_NAME);
  if (!sh) throw new Error(`Không tìm thấy tab "${OFFLINE_CONVERSION_CONFIG.SHEET_NAME}"`);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0].map(h => String(h || "").trim().toLowerCase());
  const colIdx = (kwList, fallback) => {
    const idx = header.findIndex(h => kwList.some(k => h.includes(k)));
    return idx >= 0 ? idx : fallback;
  };

  const iId     = colIdx(["mã lead", "ma lead", "id"], 0);
  const iTime   = colIdx(["thời gian", "thoi gian", "created"], 1);
  const iSource = colIdx(["phân loại", "nguồn", "source"], 7);
  const iUtm    = colIdx(["utm", "campaign"], 9);
  const iUrl    = colIdx(["trang đích", "vị trí form", "url"], 10);

  const cutoffMs = Date.now() - 89 * 86400000;
  const leads = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const tracking = _extractClickTracking((row[iUrl] || "") + " " + (row[iUtm] || ""));
    if (!tracking.gclid && !tracking.gbraid && !tracking.wbraid) continue;

    const convDt = _formatAdsConversionDateTime(row[iTime]);
    if (!convDt) continue;
    const convMs = new Date(convDt.replace(" ", "T")).getTime();
    if (!isNaN(convMs) && convMs < cutoffMs) continue; // quá hạn 90 ngày của Google Ads

    const leadCode = String(row[iId] || `ROW_${r + 1}`).trim();
    const dedupeKey = `${leadCode}|${tracking.gclid || tracking.gbraid || tracking.wbraid}`;

    const item = {
      leadCode,
      dedupeKey,
      source: String(row[iSource] || ""),
      conversionDateTime: convDt,
      conversionValue: OFFLINE_CONVERSION_CONFIG.DEFAULT_VALUE,
      currencyCode: OFFLINE_CONVERSION_CONFIG.CURRENCY_CODE
    };
    // Google Ads chỉ cho phép 1 định danh click trên mỗi conversion object
    if (tracking.gclid) item.gclid = tracking.gclid;
    else if (tracking.gbraid) item.gbraid = tracking.gbraid;
    else if (tracking.wbraid) item.wbraid = tracking.wbraid;

    leads.push(item);
  }
  return leads;
}

/** Chạy thử (không gửi thật) để xem danh sách lead đủ điều kiện upload */
function previewOfflineConversionsFromSheet() {
  return uploadOfflineConversionsFromSheet(true);
}

function _discoverCandidateLoginIds(targetCustomerId, devToken) {
  const token = ScriptApp.getOAuthToken();
  const candidates = [];
  const addId = (id) => {
    const clean = String(id || "").replace(/-/g, "").trim();
    if (clean && !candidates.includes(clean)) candidates.push(clean);
  };

  try {
    const listResp = UrlFetchApp.fetch(`${GADS_API_BASE}/customers:listAccessibleCustomers`, {
      method: "get",
      headers: {
        "Authorization": "Bearer " + token,
        "developer-token": devToken || CONFIG.DEVELOPER_TOKEN
      },
      muteHttpExceptions: true
    });
    if (listResp.getResponseCode() === 200) {
      const listJson = JSON.parse(listResp.getContentText() || "{}");
      const ids = (listJson.resourceNames || []).map(r => String(r).split("/").pop());
      console.log("🔑 Accessible Google Ads IDs:", ids.join(", "));
      // Check which accessible ID is a manager managing targetCustomerId
      ids.forEach(accId => {
        if (accId === targetCustomerId) { addId(accId); return; }
        try {
          const q = `SELECT customer_client.id, customer_client.manager FROM customer_client WHERE customer_client.id = ${targetCustomerId} LIMIT 1`;
          const r = UrlFetchApp.fetch(`${GADS_API_BASE}/customers/${accId}/googleAds:searchStream`, {
            method: "post",
            headers: {
              "Authorization": "Bearer " + token,
              "developer-token": devToken || CONFIG.DEVELOPER_TOKEN,
              "login-customer-id": accId,
              "Content-Type": "application/json"
            },
            payload: JSON.stringify({ query: q }),
            muteHttpExceptions: true
          });
          if (r.getResponseCode() === 200) {
            const body = JSON.parse(r.getContentText() || "[]");
            const hasMatch = (Array.isArray(body) ? body : [body]).some(b => (b.results || []).length > 0);
            if (hasMatch) addId(accId);
          }
        } catch (_) {}
      });
      ids.forEach(addId);
    }
  } catch (e) {
    console.warn("listAccessibleCustomers error:", e.message);
  }

  addId(CONFIG.LOGIN_CUSTOMER_ID);
  addId(targetCustomerId);
  return candidates;
}

/**
 * Đẩy toàn bộ lead có gclid/gbraid/wbraid chưa upload từ tab "website" lên Google Ads
 * thông qua Google Data Manager API v1 (events:ingest).
 * Yêu cầu GCP Project bật "Data Manager API" và appsscript.json có scope:
 *   "https://www.googleapis.com/auth/datamanager"
 * @param {boolean} dryRun true = chỉ validateOnly, không ghi nhận thật
 */
function uploadOfflineConversionsFromSheet(dryRun) {
  const isDry = dryRun === true;
  const props = PropertiesService.getScriptProperties();
  let uploadedMap = {};
  try { uploadedMap = JSON.parse(props.getProperty(_OFFLINE_PROP_KEY) || "{}"); } catch (_) {}

  const allLeads = _collectOfflineLeadsFromSheet();
  const pending = allLeads.filter(l => !uploadedMap[l.dedupeKey]);
  console.log(`📋 Tìm thấy ${allLeads.length} lead có gclid/gbraid/wbraid; chưa upload: ${pending.length}.`);
  if (!pending.length) return { ok: true, total: allLeads.length, pending: 0, uploaded: 0 };

  const actionId = ensureOfflineConversionAction();
  if (!actionId) throw new Error("Không lấy được Conversion Action ID.");

  const customerId = OFFLINE_CONVERSION_CONFIG.CUSTOMER_ID.replace(/-/g, "");
  const endpoint = "https://datamanager.googleapis.com/v1/events:ingest";
  const token = ScriptApp.getOAuthToken();
  const authHeaders = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  };

  // Kiểm tra nhanh token hiện tại đã có scope datamanager chưa
  try {
    const ti = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(token), { muteHttpExceptions: true });
    if (ti.getResponseCode() === 200) {
      const scopeStr = JSON.parse(ti.getContentText() || "{}").scope || "";
      console.log("🔐 Token scopes:", scopeStr);
      if (!scopeStr.includes("datamanager")) {
        throw new Error('Token OAuth chưa có quyền "https://www.googleapis.com/auth/datamanager". Hãy kiểm tra appsscript.json đã lưu đúng scope và chạy revokeOAuth() rồi chạy lại để cấp quyền mới.');
      }
    }
  } catch (scopeErr) {
    if (scopeErr.message && scopeErr.message.includes("datamanager")) throw scopeErr;
  }

  const candidateLogins = [null, ..._discoverCandidateLoginIds(customerId)];
  console.log("🔍 Thử các loginAccount:", candidateLogins.map(x => x || "(none)").join(", "));

  let uploadedCount = 0;
  let failedCount = 0;
  const requestIds = [];

  for (let i = 0; i < pending.length; i += 2000) {
    const batch = pending.slice(i, i + 2000);
    const events = batch.map(l => {
      const adIds = {};
      if (l.gclid) adIds.gclid = l.gclid;
      else if (l.gbraid) adIds.gbraid = l.gbraid;
      else if (l.wbraid) adIds.wbraid = l.wbraid;

      const rfc3339Ts = String(l.conversionDateTime).replace(" ", "T");
      return {
        eventTimestamp: rfc3339Ts,
        eventSource: "WEB",
        transactionId: l.leadCode,
        adIdentifiers: adIds,
        conversionValue: l.conversionValue,
        currency: l.currencyCode
      };
    });

    const buildPayload = (loginAccId) => {
      const dest = {
        operatingAccount: { accountType: "GOOGLE_ADS", accountId: customerId },
        productDestinationId: String(actionId)
      };
      if (loginAccId) {
        dest.loginAccount = { accountType: "GOOGLE_ADS", accountId: loginAccId };
      }
      return {
        destinations: [dest],
        validateOnly: isDry,
        events: events
      };
    };

    let resp = null;
    for (const loginOpt of candidateLogins) {
      resp = UrlFetchApp.fetch(endpoint, {
        method: "post",
        headers: authHeaders,
        payload: JSON.stringify(buildPayload(loginOpt)),
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) {
        console.log(`✅ Khớp loginAccount: ${loginOpt || "(none)"}`);
        break;
      }
      if (resp.getResponseCode() !== 403) break;
    }

    const code = resp.getResponseCode();
    const text = resp.getContentText();
    if (code !== 200) {
      failedCount += batch.length;
      throw new Error(`Data Manager API HTTP ${code}: ${text.slice(0, 800)}`);
    }

    const resJson = JSON.parse(text || "{}");
    if (resJson.requestId) requestIds.push(resJson.requestId);
    console.log("📨 Data Manager API response:", text);

    if (!isDry) {
      batch.forEach(lead => {
        uploadedMap[lead.dedupeKey] = new Date().toISOString();
        uploadedCount++;
      });
      props.setProperty(_OFFLINE_PROP_KEY, JSON.stringify(uploadedMap));
    } else {
      uploadedCount += batch.length;
    }
  }

  console.log(`${isDry ? "🧪 [DRY RUN OK]" : "✅ [INGEST SENT]"} Số lead hợp lệ: ${uploadedCount}, Thất bại: ${failedCount}` + (requestIds.length ? ` | requestId: ${requestIds.join(", ")}` : ""));
  return { ok: failedCount === 0, dryRun: isDry, actionId, total: allLeads.length, pending: pending.length, uploadedCount, failedCount, requestIds };
}

function resetOfflineUploadHistory() {
  PropertiesService.getScriptProperties().deleteProperty(_OFFLINE_PROP_KEY);
  console.log("✅ Đã reset lịch sử upload offline conversion.");
}
