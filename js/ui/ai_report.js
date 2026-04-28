
function openAiSummaryModal() {
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 31) {
      return showToast(`⚠️ AI chỉ hỗ trợ phân tích tối đa 31 ngày (Hiện tại: ${diffDays} ngày). Vui lòng chọn khoảng thời gian ngắn hơn.`);
    }
  }

  const modal = document.getElementById("ai_summary_modal");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
  }
  updateAiHistoryBadge();
  switchAiTab("home");
  syncAiHistoryFromApi(); // Đồng bộ ngầm khi mở modal
}

function switchAiTab(tab) {
  const allPanels = ["home", "result", "compare", "history"];
  allPanels.forEach(p => {
    const el = document.getElementById(`ai_panel_${p}`);
    if (el) el.style.display = "none";
    const ft = document.getElementById(`ai_footer_${p}`);
    if (ft) ft.style.display = "none";
  });

  const panel = document.getElementById(`ai_panel_${tab}`);
  if (panel) {
    // modal panels are flex containers to allow children to fill space
    panel.style.display = "flex";
  }
  const footer = document.getElementById(`ai_footer_${tab}`);
  if (footer) footer.style.display = "flex";

  if (tab === "history") renderAiHistory();
  if (tab === "compare") renderCompareCampaigns();
}

// ─── AI Analysis Home Trigger ──────────────────────────────────
function runAiSummaryFromHome() {
  switchAiTab("result");
  runAiSummary();
}

// ─── Campaign Compare Feature ──────────────────────────────────

function renderCompareCampaigns() {
  const list = document.getElementById("ai_compare_list");
  if (!list) return;
  const campaigns = (window._FILTERED_CAMPAIGNS ?? window._ALL_CAMPAIGNS) || [];
  if (!campaigns.length) {
    list.innerHTML = `<div class="ai_compare_empty">
      <i class="fa-solid fa-triangle-exclamation"></i>
      Chưa có dữ liệu campaign. Hãy tải dữ liệu trước.
    </div>`;
    return;
  }

  const fmt = n => Math.round(n || 0).toLocaleString("vi-VN");
  const fmtShort = n => {
    n = Math.round(n || 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
    return n.toString();
  };

  // Tính % chi phí tương đối để vẽ bar
  const maxSpend = Math.max(...campaigns.map(c => c.spend || 0), 1);

  list.innerHTML = campaigns.map((c, i) => {
    const adsets = c.adsets || [];
    const adsetCnt = adsets.length;
    const spend = window.formatMoney ? window.formatMoney(c.spend) : fmt(c.spend);
    const reach = fmtShort(c.reach);
    const result = fmt(c.result);
    const cpr = c.result > 0 ? (window.formatMoney ? window.formatMoney(c.spend / c.result) : fmt(c.spend / c.result)) : "N/A";
    const spendPct = Math.round((c.spend / maxSpend) * 100);

    // Top adset theo chi phí
    const topAdset = [...adsets].sort((a, b) => (b.spend || 0) - (a.spend || 0))[0];
    const topName = topAdset ? topAdset.name.replace(/^[^_]+_/, "") : null;

    // Goal badge
    const goals = [...new Set(adsets.map(a => a.optimization_goal).filter(Boolean))];
    const goalBadge = goals.slice(0, 2).map(g =>
      `<span class="ai_cmp_goal">${g}</span>`
    ).join("") + (goals.length > 2 ? `<span class="ai_cmp_goal">+${goals.length - 2}</span>` : "");

    return `
    <label class="ai_compare_item" data-name="${(c.name || "").toLowerCase()}" data-idx="${i}">
      <div class="ai_cmp_checkbox">
        <input type="checkbox" class="ai_compare_cb" value="${i}" id="cmp_cb_${i}" onchange="updateCompareCount()">
        <i class="fa-solid fa-check"></i>
      </div>
      <div class="ai_compare_item_body">
        <div class="ai_cmp_top_row">
          <div class="ai_compare_item_name">${c.name || "Campaign " + (i + 1)}</div>
          <div class="ai_cmp_spend_badge">${window.formatMoney ? window.formatMoney(c.spend) : spend}</div>
        </div>
        <div class="ai_cmp_spend_bar_wrap">
          <div class="ai_cmp_spend_bar" style="width:${spendPct}%"></div>
        </div>
        <div class="ai_compare_item_stats">
          <span class="ai_cmp_stat"><i class="fa-solid fa-users"></i> Reach: ${reach}</span>
          <span class="ai_cmp_stat"><i class="fa-solid fa-bullseye"></i> KQ: ${result}</span>
          <span class="ai_cmp_stat"><i class="fa-solid fa-tag"></i> CPR: ${cpr}</span>
          <span class="ai_cmp_stat"><i class="fa-solid fa-layer-group"></i> ${adsetCnt} adset</span>
          ${goalBadge}
        </div>
      </div>
    </label>`;
  }).join("");

  updateCompareCount();
}


function filterCompareCampaigns(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll(".ai_compare_item").forEach(el => {
    const name = el.dataset.name || "";
    el.style.display = (!q || name.includes(q)) ? "" : "none";
  });
}

function selectAllCompareCampaigns(checked) {
  document.querySelectorAll(".ai_compare_cb").forEach(cb => {
    const item = cb.closest(".ai_compare_item");
    if (item && item.style.display !== "none") cb.checked = checked;
  });
  updateCompareCount();
}

function updateCompareCount() {
  const selected = document.querySelectorAll(".ai_compare_cb:checked").length;
  const countEl = document.getElementById("ai_compare_count");
  const runBtn = document.getElementById("ai_compare_run_btn");
  if (countEl) countEl.textContent = `${selected} đã chọn`;
  if (runBtn) runBtn.disabled = selected < 2;
  // Đổi màu count
  if (countEl) countEl.style.color = selected >= 2 ? "var(--mainClr)" : "#aaa";
}

async function runAiCompare() {
  const campaigns = (window._FILTERED_CAMPAIGNS ?? window._ALL_CAMPAIGNS) || [];
  const checked = [...document.querySelectorAll(".ai_compare_cb:checked")];
  if (checked.length < 2) return;

  const selected = checked.map(cb => campaigns[parseInt(cb.value)]).filter(Boolean);

  // Chuyển sang tab kết quả và show loading
  switchAiTab("result");
  const loading = document.getElementById("ai_summary_loading");
  const content = document.getElementById("ai_summary_content");
  const emptyBox = document.getElementById("ai_empty_state");
  const copyBtn = document.getElementById("ai_copy_btn");
  const regenBtn = document.getElementById("ai_regenerate_btn");
  const wordBtn = document.getElementById("ai_export_word_btn");

  if (loading) loading.style.display = "block";
  if (emptyBox) emptyBox.style.display = "none";
  if (content) content.innerHTML = "";
  if (copyBtn) copyBtn.style.display = "none";
  if (regenBtn) regenBtn.style.display = "none";
  if (wordBtn) wordBtn.style.display = "none";

  const fmt = n => Math.round(n || 0).toLocaleString("vi-VN");
  const fmtMoney = n => window.formatMoney ? window.formatMoney(n) : (fmt(n) + 'đ');

  const blocks = selected.map((c, idx) => {
    const adsetLines = (c.adsets || []).map(as =>
      `  · ${as.name}: chi phí=${fmtMoney(as.spend)}, reach=${fmt(as.reach)}, kết quả=${fmt(as.result)}, CPR=${as.result > 0 ? fmtMoney(as.spend / as.result) : "N/A"}, goal=${as.optimization_goal || "N/A"}`
    ).join("\n");
    return `
[Campaign ${idx + 1}] ${c.name}
- Chi phí: ${fmtMoney(c.spend)}
- Reach: ${fmt(c.reach)}
- Kết quả: ${fmt(c.result)}
- CPR TB: ${c.result > 0 ? fmtMoney(c.spend / c.result) : "N/A"}
- Impressions: ${fmt(c.impressions)}
- Mục tiêu: ${c.objective || "N/A"}
- Adsets (${(c.adsets || []).length}):
${adsetLines || "  (không có dữ liệu adset)"}`;
  }).join("\n\n─────────────────────────\n");

  const prompt = `Bạn là chuyên gia phân tích quảng cáo Facebook Ads. Hãy so sánh CHI TIẾT và TOÀN DIỆN ${selected.length} chiến dịch sau đây.

DỮ LIỆU CÁC CHIẾN DỊCH CẦN SO SÁNH:
═══════════════════════════════════════
${blocks}
═══════════════════════════════════════

YÊU CẦU PHÂN TÍCH SO SÁNH:

## 1. Bảng tổng quan so sánh
- Tạo bảng so sánh các chỉ số chính: Chi phí, Reach, Kết quả, CPR, Impressions
- Xếp hạng từng campaign theo từng chỉ số

## 2. Phân tích điểm mạnh - điểm yếu từng campaign
- Với mỗi campaign: nêu rõ 2-3 điểm mạnh và 2-3 điểm yếu dựa trên số liệu

## 3. Campaign hiệu quả nhất
- Kết luận campaign nào tốt nhất và tại sao (dựa trên CPR, reach, chi phí)

## 4. Đề xuất tối ưu
- Gợi ý cụ thể để cải thiện campaign kém hiệu quả hơn
- Ngân sách nên phân bổ như thế nào giữa các campaign

⚠️ QUY TẮC: Dùng bảng markdown cho phần so sánh số liệu, viết bằng tiếng Việt, có số liệu cụ thể.`;

    try {
      const apiKey = window.SAAS_ROUTER?.tenant?.gemini_api_key;
      if (!apiKey) {
          throw new Error("Chưa cấu hình GEMINI API KEY. Vui lòng cập nhật cài đặt Workspace.");
      }

      const GEMINI_MODEL = "gemini-2.5-flash";
      const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const resp = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.5, maxOutputTokens: 50000 }
        })
      });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || `Gemini API error: ${resp.status}`);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không nhận được phản hồi.";

    if (loading) loading.style.display = "none";
    if (content) content.innerHTML = simpleMarkdown(text);
    if (copyBtn) copyBtn.style.display = "flex";
    if (regenBtn) regenBtn.style.display = "none";  // Regen không áp dụng cho compare
    if (wordBtn) wordBtn.style.display = "flex";

    const hLabel = `So sánh: ${selected.map(c => c.name).join(" vs ")}`;
    saveAiHistory(content.innerHTML, hLabel);

  } catch (err) {
    if (loading) loading.style.display = "none";
    if (content) {
      let errorHtml = `<div style="color:#ef4444;padding:2rem;text-align:center;">
        <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>
        ❌ Lỗi: ${err.message}
      </div>`;
      
      if (err.message && err.message.includes("Chưa cấu hình GEMINI API KEY")) {
          errorHtml += `
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border:1px solid #bbf7d0; padding:2rem; border-radius:12px; margin-top:1.5rem; max-width: 550px; margin-left: auto; margin-right: auto; text-align: left; box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.15);">
              <p style="color:#166534; font-size:1.4rem; font-weight:800; margin-bottom:0.8rem; display:flex; align-items:center; gap:0.8rem;"><i class="fa-solid fa-link" style="font-size:1.6rem; color:#10b981;"></i> Connect đồng bộ Gemini với dữ liệu hiện tại.</p>
              <p style="color:#15803d; font-size:1.1rem; margin-bottom:1.5rem; line-height:1.5;">Vui lòng nhập Gemini API Key của bạn để sử dụng tính năng phân tích nâng cao (Chỉ dành cho Admin).</p>
              <div style="display:flex; gap:0.5rem;">
                <input type="password" id="quick_api_key_input" placeholder="Nhập Gemini API Key..." class="dom-input" style="flex:1; padding:1rem 1.2rem; border-radius:8px; border:2px solid #86efac; outline:none; font-size:1.1rem; transition:all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);" onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.2)'" onblur="this.style.borderColor='#86efac'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.02)'">
                <button onclick="saveQuickApiKey('quick_api_key_input')" style="background:linear-gradient(to right, #10b981, #059669); color:#fff; border:none; padding:0 2rem; border-radius:8px; font-weight:700; font-size:1.1rem; cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(16, 185, 129, 0.3)'"><i class="fa-solid fa-check"></i> Lưu lại</button>
              </div>
            </div>
          `;
      }
      content.innerHTML = errorHtml;
    }
    console.error("❌ AI Compare error:", err);
  }
}


// ── localStorage history helpers ──

function exportAiToWord() {
  const content = document.getElementById("ai_summary_content");
  if (!content || !content.innerHTML.trim()) return;

  const modalTitle = document.querySelector(".ai_modal_header span")?.innerText || "Báo cáo AI";
  const dateRange = document.getElementById("ai_date_range")?.innerText || "";
  const brandFilter = content.getAttribute("data-brand")
    || document.querySelector(".dom_selected")?.textContent?.trim()
    || "Tất cả";
  const dateText = dateRange || document.querySelector(".dom_date")?.textContent?.trim() || "N/A";
  const timestamp = content.getAttribute("data-timestamp") || new Date().toLocaleString("vi-VN");

  const wordHtml = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${modalTitle}</title>
      <!--[if gte mso 9]>
      <xml><w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument></xml>
      <![endif]-->
      <style>
        @page { margin: 1.8cm 2cm 2cm 2cm; }

        body {
          font-family: "Calibri", "Arial", sans-serif;
          font-size: 11pt;
          color: #333;
          line-height: 1.6;
          margin: 0;
          background: #fff;
        }

        /* ── Header ── */
        .doc-header {
          background: #ffffff;
          color: #111;
          padding: 20pt 0 10pt;
          text-align: center;
          border-bottom: 1pt solid #ddd;
        }
        .doc-header-logo {
          font-size: 8.5pt;
          color: #666;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 4pt;
        }
        .doc-header h1 {
          font-size: 20pt;
          font-weight: bold;
          color: #111;
          margin: 0 0 4pt;
          text-align: center;
          border: none;
          padding: 0;
        }
        .doc-header-sub {
          font-size: 9.5pt;
          color: #666;
          margin: 0;
          text-align: center;
        }

        /* ── Meta bar ── */
        .doc-meta {
          background: #f8f8f8;
          border: 1pt solid #eee;
          padding: 8pt 12pt;
          margin: 10pt 0 15pt;
          font-size: 9pt;
          color: #555;
        }
        .doc-meta span { font-weight: bold; color: #111; }

        /* ── Content ── */
        .doc-body {
          padding: 15pt 0;
          margin-bottom: 0;
        }

        /* ── Headings ── */
        h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #111;
          text-align: center;
          border-bottom: 1.5pt solid #eee;
          padding-bottom: 6pt;
          margin: 20pt 0 10pt;
        }
        h2 {
          font-size: 13pt;
          font-weight: bold;
          color: #111;
          border-bottom: 1.5pt solid #333;
          padding: 0 0 3pt;
          margin: 18pt 0 6pt;
          text-transform: uppercase;
        }
        h3 {
          font-size: 11.5pt;
          font-weight: bold;
          color: #333;
          margin: 14pt 0 4pt;
          border-bottom: 1pt solid #eee;
          padding-bottom: 2pt;
        }
        h4 {
          font-size: 11pt;
          font-weight: bold;
          color: #374151;
          margin: 10pt 0 3pt;
        }

        /* ── Body text ── */
        p { margin: 5pt 0; color: #374151; }

        /* ── Lists ── */
        ul { margin: 4pt 0; padding: 0 0 0 18pt; list-style-type: disc; }
        ul li { margin: 2pt 0; color: #374151; padding-left: 2pt; }
        ol { margin: 4pt 0; padding: 0 0 0 18pt; }
        ol li { margin: 2pt 0; color: #1e293b; padding-left: 2pt; }
        ul ul, ol ol, ul ol, ol ul { margin: 2pt 0; padding-left: 16pt; }

        /* ── Inline ── */
        strong { font-weight: bold; color: #111; }
        em { font-style: italic; color: #64748b; }

        /* ── Tables ── */
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 12pt 0 14pt;
          font-size: 9.5pt;
        }
        table th {
          background: #f0f0f0;
          color: #111;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 8.5pt;
          padding: 7pt 9pt;
          border: 1pt solid #ccc;
          text-align: left;
        }
        table td {
          padding: 6pt 9pt;
          border: 1pt solid #d1d5db;
          color: #1e293b;
          vertical-align: top;
        }
        table tr:nth-child(even) td { background: #f4f6f8; }
        table tr:nth-child(odd) td  { background: #ffffff; }

        /* ── Blockquote ── */
        blockquote {
          border-left: 3pt solid #94a3b8;
          background: #f1f5f9;
          padding: 8pt 12pt;
          margin: 10pt 0;
          color: #475569;
          font-style: italic;
        }

        hr { border: none; border-top: 1.5pt solid #e2e8f0; margin: 14pt 0; }

        /* ── Footer ── */
        .doc-footer {
          border-top: 1pt solid #ddd;
          padding: 10pt 0;
          font-size: 8pt;
          color: #888;
          text-align: center;
        }
        .doc-footer-brand { color: #333; font-weight: bold; }
      </style>
    </head>
    <body>

      <!-- Header -->
      <div class="doc-header">
        <div class="doc-header-logo">DOM AI &mdash; Báo cáo phân tích quảng cáo</div>
        <h1>${modalTitle}</h1>
      </div>

      <!-- Meta bar -->
      <div class="doc-meta">
        📅 Khoảng thời gian: <span>${dateText}</span>
        ${brandFilter !== "Tất cả" ? `&nbsp;&nbsp;|&nbsp;&nbsp; 🏷️ Brand: <span>${brandFilter}</span>` : ""}
        &nbsp;&nbsp;|&nbsp;&nbsp; 🕐 Phân tích lúc: <span>${timestamp}</span>
      </div>

      <!-- Content -->
      <div class="doc-body">
        ${content.innerHTML}
      </div>

      <!-- Footer -->
      <div class="doc-footer">
        <span class="doc-footer-brand">DOM Report AI</span> &mdash; Được tạo tự động bởi hệ thống phân tích AI &mdash; ${timestamp}
      </div>

    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `bao-cao-ai-${new Date().toISOString().slice(0, 10)}.doc`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Feedback visual
  const btn = document.getElementById("ai_export_word_btn");
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã xuất!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }
}



// ── AI api sync helper ─────────────────────────
function _aiApiPost(action, payload) {
  const url = window.APP_CONFIG?.SAAS_API_URL;
  const slug = window.SAAS_ROUTER?.tenant?.slug;
  const account_id = window.ACCOUNT_ID || '';
  const email = window._currentUser?.email || '';
  if (!url || !slug) return;
  
  const body = { action: action, slug: slug, account_id: account_id, user_email: email, ...payload };
  fetch(url, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body) 
  }).catch(() => { });
}

async function syncAiHistoryFromApi() {
  const url = window.APP_CONFIG?.SAAS_API_URL;
  const slug = window.SAAS_ROUTER?.tenant?.slug;
  const account_id = window.ACCOUNT_ID || '';
  if (!url || !slug) return;
  
  try {
    const res = await fetch(`${url}?action=ai_list&slug=${encodeURIComponent(slug)}&account_id=${encodeURIComponent(account_id)}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      window.domSetItem(AI_HISTORY_KEY, JSON.stringify(json.data));
      updateAiHistoryBadge();
      // Nếu đang mở tab lịch sử thì render lại ngay
      const panel = document.getElementById("ai_panel_history");
      if (panel && panel.style.display !== "none") renderAiHistory();
    }
  } catch (err) {
    console.warn("AI History Sync failed:", err);
  }
}

const AI_HISTORY_KEY = "dom_ai_summary_history";
const AI_HISTORY_MAX = 20;  // tăng lên 20 vì có Sheet backup

function loadAiHistory() {
  try { return JSON.parse(window.domGetItem(AI_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveAiHistory(html, label) {
  const history = loadAiHistory();
  const dateFrom = document.getElementById("date_from")?.value || "";
  const dateTo = document.getElementById("date_to")?.value || "";
  const brand = document.querySelector(".dom_selected")?.textContent?.trim() || "Tất cả";

  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString("vi-VN"),
    label: label || "Tóm tắt chiến dịch",
    brand,
    dateRange: (dateFrom && dateTo) ? `${dateFrom} — ${dateTo}` : "",
    html,
    preview: document.getElementById("ai_summary_content")?.innerText?.slice(0, 120) || ""
  };

  history.unshift(entry);
  if (history.length > AI_HISTORY_MAX) history.splice(AI_HISTORY_MAX);
  try { window.domSetItem(AI_HISTORY_KEY, JSON.stringify(history)); } catch { }
  updateAiHistoryBadge();

  // Sync to API ngầm (non-blocking)
  _aiApiPost("ai_save", {
    report: {
      id: entry.id,
      timestamp: entry.timestamp,
      label: entry.label,
      brand: entry.brand,
      dateRange: entry.dateRange,
      preview: entry.preview,
      html: entry.html,
    }
  });
}


function confirmDeleteAiHistory(id) {
  const overlay = document.createElement("div");
  overlay.id = "ai_delete_confirm";
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
  `;
  overlay.innerHTML = `
    <div style="
      background: #fff; border-radius: 16px; padding: 3.2rem 3.6rem;
      max-width: 42rem; width: 90%; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      animation: fadeInScale .18s ease;
    ">
      <div style="font-size:3.6rem;margin-bottom:1.2rem;">🗑️</div>
      <h3 style="font-size:1.8rem;font-weight:700;color:#111;margin:0 0 0.8rem;">Xóa bản tóm tắt?</h3>
      <p style="color:#64748b;font-size:1.4rem;margin:0 0 2.4rem;">Hành động này không thể hoàn tác. Bản tóm tắt này sẽ bị xóa vĩnh viễn.</p>
      <div style="display:flex;gap:1.2rem;justify-content:center;">
        <button onclick="document.getElementById('ai_delete_confirm').remove()" style="
          padding:0.9rem 2.4rem;border-radius:10px;border:1.5px solid #e2e8f0;
          background:#fff;color:#64748b;font-size:1.4rem;font-weight:600;
          cursor:pointer;transition:all .2s;
        ">Hủy</button>
        <button onclick="_doDeleteAiHistory(${id});document.getElementById('ai_delete_confirm').remove()" style="
          padding:0.9rem 2.4rem;border-radius:10px;border:none;
          background:#ef4444;color:#fff;font-size:1.4rem;font-weight:600;
          cursor:pointer;transition:all .2s;
        "><i class='fa-solid fa-trash'></i> Xóa</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function _doDeleteAiHistory(id) {
  // 1. Xóa trong localStorage ngay
  const history = loadAiHistory().filter(e => e.id !== id);
  try { window.domSetItem(AI_HISTORY_KEY, JSON.stringify(history)); } catch { }
  updateAiHistoryBadge();
  renderAiHistory();

  // 2. Xóa trên API ngầm
  _aiApiPost("ai_delete", { id });
}


function loadAiHistoryItem(id) {
  const entry = loadAiHistory().find(e => e.id === id);
  if (!entry) return;
  const content = document.getElementById("ai_summary_content");
  const emptyBox = document.getElementById("ai_empty_state");
  const dateBadge = document.getElementById("ai_date_range");

  if (content) {
    content.innerHTML = entry.html;
    content.setAttribute("data-brand", entry.brand || "Tất cả");
    content.setAttribute("data-timestamp", entry.timestamp || "");
  }
  if (dateBadge) {
    dateBadge.innerText = entry.dateRange || "N/A";
  }
  if (emptyBox) emptyBox.style.display = "none";
  const copyBtn = document.getElementById("ai_copy_btn");
  const regenBtn = document.getElementById("ai_regenerate_btn");
  const wordBtn = document.getElementById("ai_export_word_btn");
  if (copyBtn) copyBtn.style.display = "flex";
  if (regenBtn) regenBtn.style.display = "flex";
  if (wordBtn) wordBtn.style.display = "flex";
  switchAiTab("result");
}

function updateAiHistoryBadge() {
  const count = loadAiHistory().length;
  const badge = document.getElementById("ai_history_badge");
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

function renderAiHistory() {
  const list = document.getElementById("ai_history_list");
  if (!list) return;
  const history = loadAiHistory();
  if (!history.length) {
    list.innerHTML = `<div class="ai_history_empty"><i class="fa-solid fa-clock-rotate-left"></i> Chưa có bản tóm tắt nào được lưu.</div>`;
    return;
  }
  list.innerHTML = history.map(e => `
    <div class="ai_history_item">
      <!-- Status bar bên trong từng card -->
      <div class="ai_status_bar">
        <div class="ai_status_left">
          <span>Chiến dịch phân tích:</span>
          <div class="ai_badge_orange"><i class="fa-solid fa-bolt"></i> ${e.label}</div>
          ${e.dateRange ? `<div class="ai_badge_gray"><i class="fa-solid fa-calendar-days"></i> ${e.dateRange}</div>` : ""}
        </div>
        <div class="ai_status_right">
          <i class="fa-solid fa-circle" style="font-size:0.7rem"></i> ĐÃ HOÀN THÀNH
        </div>
      </div>
      <!-- Footer card: thời gian + actions -->
      <div class="ai_history_item_header">
        <div class="ai_history_meta">
          <span class="ai_history_time"><i class="fa-regular fa-clock"></i> ${e.timestamp}</span>
        </div>
        <div class="ai_history_actions">
          <button class="ai_history_btn primary" onclick="loadAiHistoryItem(${e.id})"><i class="fa-solid fa-eye"></i> Xem</button>
          <button class="ai_history_btn" onclick="confirmDeleteAiHistory(${e.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="ai_history_preview">${e.preview}</div>
    </div>
  `).join("");
}

// Abort controller cho request AI đang chạy
let _aiController = null;

function closeAiSummaryModal() {
  // Huỷ request đang chạy (nếu có)
  if (_aiController) {
    _aiController.abort();
    _aiController = null;
  }
  const modal = document.getElementById("ai_summary_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
}

async function runAiSummary() {
  // Chuyển sang tab kết quả khi bắt đầu
  switchAiTab("result");
  const loading = document.getElementById("ai_summary_loading");
  const content = document.getElementById("ai_summary_content");
  const emptyBox = document.getElementById("ai_empty_state");
  const copyBtn = document.getElementById("ai_copy_btn");
  const regenBtn = document.getElementById("ai_regenerate_btn");
  const dateBadge = document.getElementById("ai_date_range");

  // Hiển thị dải ngày thực tế (nếu có trong app)
  if (dateBadge) {
    const start = document.getElementById("date_from")?.value || "N/A";
    const end = document.getElementById("date_to")?.value || "N/A";
    dateBadge.innerText = `${start} — ${end} `;
  }

  if (loading) loading.style.display = "block";
  if (emptyBox) emptyBox.style.display = "none";
  if (content) content.innerHTML = "";
  if (copyBtn) copyBtn.style.display = "none";
  if (regenBtn) regenBtn.style.display = "none";
  const wordBtn = document.getElementById("ai_export_word_btn");
  if (wordBtn) wordBtn.style.display = "none";

  try {
    // Dùng _FILTERED_CAMPAIGNS nếu đang lọc, fallback về _ALL_CAMPAIGNS
    const isFiltered = window._FILTERED_CAMPAIGNS
      && window._FILTERED_CAMPAIGNS !== window._ALL_CAMPAIGNS
      && window._FILTERED_CAMPAIGNS.length < (window._ALL_CAMPAIGNS || []).length;

    const campaigns = (window._FILTERED_CAMPAIGNS ?? window._ALL_CAMPAIGNS) || [];
    if (!campaigns.length) {
      if (content) content.innerHTML = "<p>⚠️ Chưa có dữ liệu campaign. Vui lòng load dữ liệu trước.</p>";
      if (loading) loading.style.display = "none";
      return;
    }

    // Cập nhật tiêu đề modal hiển thị filter context
    const brandFilter = document.querySelector(".dom_selected")?.textContent?.trim() || "Tất cả";
    const modalTitle = document.querySelector(".ai_modal_header span");
    if (modalTitle) {
      modalTitle.innerHTML = `AI Tóm tắt${isFiltered ? ` — ${brandFilter}` : " chiến dịch"} `;
    }

    // ====== Xây dựng dữ liệu chi tiết từng campaign + adset ======
    const fmt = (n) => Math.round(n || 0).toLocaleString("vi-VN");
    const fmtMoney = (n) => window.formatMoney ? window.formatMoney(n) : (fmt(n) + 'đ');
    const fmtCpr = (spend, result, goal) => {
      if (result <= 0) return "N/A";
      const factor = (goal === "REACH" || goal === "IMPRESSIONS") ? 1000 : 1;
      return fmtMoney((spend / result) * factor);
    };

    // ====== Xây dựng danh sách Campaign riêng ======
    const campaignLines = campaigns.map((c) => {
      const cFreq = c.reach > 0 ? (c.impressions / c.reach).toFixed(2) : "N/A";
      const cCpr = fmtCpr(c.spend, c.result);
      const cCpm = c.impressions > 0 ? fmtMoney((c.spend / c.impressions) * 1000) : "N/A";
      return `• Campaign: "${c.name}" | Status: ${c.status || "N/A"} | Spent: ${fmtMoney(c.spend)} | Reach: ${fmt(c.reach)} | Impressions: ${fmt(c.impressions)} | Freq: ${cFreq} | Results: ${c.result} | CPR: ${cCpr} | CPM: ${cCpm}`;
    }).join("\n");

    // ====== Xây dựng danh sách Adset riêng ======
    const adsetLines = campaigns.flatMap(c => (c.adsets || []).map(as => {
      const freq = as.reach > 0 ? (as.impressions / as.reach).toFixed(2) : "N/A";
      const cpr = fmtCpr(as.spend, as.result);
      const cpm = as.impressions > 0 ? fmtMoney((as.spend / as.impressions) * 1000) : "N/A";
      const budget = as.daily_budget > 0
        ? `daily ${fmtMoney(as.daily_budget)}`
        : as.lifetime_budget > 0 ? `lifetime ${fmtMoney(as.lifetime_budget)}` : "N/A";
      return `• Adset: "${as.name}" (thuộc Campaign: "${c.name}") | Goal: ${as.optimization_goal} | Spent: ${fmtMoney(as.spend)} | Reach: ${fmt(as.reach)} | Results: ${as.result} | CPR: ${fmtCpr(as.spend, as.result, as.optimization_goal)} | Budget: ${budget}`;
    })).join("\n");

    const dateRange = document.querySelector(".dom_date")?.textContent?.trim() || "N/A";
    const filterNote = isFiltered
      ? `Brand đang lọc: **${brandFilter}** (${campaigns.length}/${(window._ALL_CAMPAIGNS || []).length} campaign)`
      : `Toàn bộ tài khoản — ${campaigns.length} campaign`;

    // Tổng hợp nhanh toàn account
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalReach = campaigns.reduce((s, c) => s + (c.reach || 0), 0);
    const totalResult = campaigns.reduce((s, c) => s + (c.result || 0), 0);

    const prompt = `Bạn là chuyên gia phân tích quảng cáo Facebook Ads cao cấp. Hãy phân tích toàn diện và chi tiết dữ liệu sau, viết bằng tiếng Việt chuyên nghiệp.

⚠️ QUY TẮC QUAN TRỌNG VỀ DỮ LIỆU:
- Dữ liệu của từng Campaign và từng Adset được cung cấp là số liệu thực tế ĐỘC LẬP. 
- **TUYỆT ĐỐI KHÔNG** tự ý cộng dồn (sum) các chỉ số của Adset để tính lại cho Campaign. Hãy sử dụng trực tiếp số liệu của Campaign đã cung cấp để phân tích.
- Tránh việc tính toán dư thừa gây ra sai số không đáng có.

═══════════════════════════════
THÔNG TIN CHUNG
═══════════════════════════════
  - Khoảng thời gian: ${dateRange}
  - ${filterNote}
  - Tổng chi phí: ${fmtMoney(totalSpend)} | Tổng reach: ${fmt(totalReach)} | Tổng kết quả: ${fmt(totalResult)}

═══════════════════════════════
DANH SÁCH CAMPAIGN
═══════════════════════════════
${campaignLines}

═══════════════════════════════
DANH SÁCH ADSET CHI TIẾT
═══════════════════════════════
${adsetLines}

═══════════════════════════════
YÊU CẦU PHÂN TÍCH (đầy đủ, chi tiết, có số liệu cụ thể)
═══════════════════════════════
## 1. Tổng quan hiệu suất
    - Tổng hợp spend / reach / result / CPR / CPM toàn bộ
    - So sánh hiệu quả giữa các mục tiêu tối ưu (optimization goal)

## 2. Phân tích Campaign & Adset nổi bật
    - Top 3 adset hiệu quả nhất (lý do: CPR thấp / reach cao / kết quả tốt)
    - Top 3 adset kém nhất cần xem xét (lý do cụ thể)
    - Campaign nào chi nhiều nhất nhưng kết quả không tương xứng?

## 3. Phân tích theo Optimization Goal
    - So sánh hiệu quả giữa các nhóm: Awareness / Consideration / Conversion
    - Goal nào đang cho ROI tốt nhất? Goal nào chi phí quá cao?

## 4. Phân tích Frequency & CPM
    - Adset nào có frequency cao (> 3) — nguy cơ banner blindness?
    - CPM nào bất thường (quá cao hoặc quá thấp)?

## 5. Điểm mạnh & điểm cần cải thiện
    - Liệt kê vài điểm mạnh với dẫn chứng số liệu
    - Liệt kê vài điểm yếu cụ thể cần khắc phục

## 6. Đề xuất hành động
    - 5 - 7 gợi ý hành động cụ thể, có ưu tiên (cao / trung / thấp)
    - Đề xuất phân bổ ngân sách tối ưu hơn nếu có thể

⚠️ QUY TẮC ĐỊNH DẠNG OUTPUT (bắt buộc tuân thủ):
  - Dùng ## cho section headers (ví dụ: ## 1. Tổng quan hiệu suất)
  - Dùng ### cho sub-section nếu cần
  - Dùng **bold** cho số liệu và từ khóa quan trọng
  - Dùng bullet points (-) cho danh sách, indent 2 dấu cách cho sub-bullet
  - KHÔNG dùng ký tự đặc biệt như ═══ hay ───
  - Có thể dùng markdown table (|---|) cho các phần so sánh dữ liệu để báo cáo chuyên nghiệp hơn.
  - Viết bằng tiếng Việt, súc tích, có số liệu cụ thể từ dữ liệu được cung cấp.`;

    // ── Huỷ request cũ nếu còn đang chạy ──
    if (_aiController) _aiController.abort();
    _aiController = new AbortController();
    const signal = _aiController.signal;

    // ── Gọi trực tiếp lên Google Gemini (Client-side) ──
    const apiKey = window.SAAS_ROUTER?.tenant?.gemini_api_key;
    if (!apiKey) {
        throw new Error("Chưa cấu hình GEMINI API KEY. Vui lòng cập nhật cài đặt Workspace.");
    }

    const GEMINI_MODEL = "gemini-2.5-flash";
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.5, maxOutputTokens: 50000 }
      }),
      signal,
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || `Gemini API error: ${resp.status}`);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không nhận được phản hồi từ AI.";

    // Render markdown
    if (content) {
      content.innerHTML = simpleMarkdown(text);
      content.setAttribute("data-brand", brandFilter);
      content.setAttribute("data-timestamp", new Date().toLocaleString("vi-VN"));
    }
    if (copyBtn) copyBtn.style.display = "flex";
    if (regenBtn) regenBtn.style.display = "flex";
    const wordBtnFinal = document.getElementById("ai_export_word_btn");
    if (wordBtnFinal) wordBtnFinal.style.display = "flex";

    // Lưu vào lịch sử: Chỉ lấy tên Brand làm label để tránh lặp ngày
    const hBrand = document.querySelector(".dom_selected")?.textContent?.trim() || "";
    const hLabel = (hBrand && hBrand !== "Ampersand") ? hBrand : "Tất cả chiến dịch";
    saveAiHistory(content.innerHTML, hLabel);

  } catch (err) {
    if (err.name === "AbortError") {
      // Request bị huỷ chủ động (user đóng modal) — im lặng
      return;
    }
    console.error("❌ AI Summary error:", err);
    if (content) {
      let errorHtml = `<p style="color:#e05c1a">❌ Lỗi: ${err.message}</p>`;
      
      if (err.message && err.message.includes("Chưa cấu hình GEMINI API KEY")) {
          errorHtml += `
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border:1px solid #bbf7d0; padding:2rem; border-radius:12px; margin-top:1.5rem; max-width: 550px; text-align: left; box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.15);">
              <p style="color:#166534; font-size:1.4rem; font-weight:800; margin-bottom:0.8rem; display:flex; align-items:center; gap:0.8rem;"><i class="fa-solid fa-link" style="font-size:1.6rem; color:#10b981;"></i> Connect đồng bộ Gemini với dữ liệu hiện tại.</p>
              <p style="color:#15803d; font-size:1.1rem; margin-bottom:1.5rem; line-height:1.5;">Vui lòng nhập Gemini API Key của bạn để sử dụng tính năng phân tích nâng cao (Chỉ dành cho Admin).</p>
              <div style="display:flex; gap:0.5rem;">
                <input type="password" id="quick_api_key_input_2" placeholder="Nhập Gemini API Key..." class="dom-input" style="flex:1; padding:1rem 1.2rem; border-radius:8px; border:2px solid #86efac; outline:none; font-size:1.1rem; transition:all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);" onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.2)'" onblur="this.style.borderColor='#86efac'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.02)'">
                <button onclick="saveQuickApiKey('quick_api_key_input_2')" style="background:linear-gradient(to right, #10b981, #059669); color:#fff; border:none; padding:0 2rem; border-radius:8px; font-weight:700; font-size:1.1rem; cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(16, 185, 129, 0.3)'"><i class="fa-solid fa-check"></i> Lưu lại</button>
              </div>
            </div>
          `;
      }
      content.innerHTML = errorHtml;
    }
  } finally {
    if (loading) loading.style.display = "none";
    _aiController = null;
  }
}

/**
 * Chuyển markdown sang HTML — với table support
 */
function simpleMarkdown(text) {
  // Pre-convert <br> variants to a safe placeholder BEFORE HTML escaping
  // so they survive the escape step and are rendered as real line breaks
  text = text.replace(/<br\s*\/?>/gi, "__BR__");

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Restore <br> placeholders as actual HTML line breaks
    .replace(/__BR__/g, "<br>")
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>");

  const lines = html.split("\n");
  const out = [];
  let inUl = false, depth = 0;
  let tblRows = [];

  const closeUl = (d) => { while (depth > d) { out.push("</ul>"); depth--; } };

  const flushTable = () => {
    if (!tblRows.length) return;
    const isSep = r => /^\|[\s\-:| ]+\|$/.test(r);
    const parse = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const dataRows = tblRows.filter(r => !isSep(r));
    if (!dataRows.length) { tblRows = []; return; }
    const hdr = parse(dataRows[0]);
    const body = dataRows.slice(1);
    let t = `<table class="ai_tbl"><thead><tr>`;
    hdr.forEach(h => t += `<th>${h}</th>`);
    t += `</tr></thead><tbody>`;
    body.forEach(r => {
      const cells = parse(r);
      t += `<tr>`;
      hdr.forEach((_, i) => t += `<td>${cells[i] || ""}</td>`);
      t += `</tr>`;
    });
    t += `</tbody></table>`;
    out.push(t);
    tblRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table row
    if (/^\|.+\|$/.test(trimmed)) {
      closeUl(0);
      if (inUl) { out.push("</ul>"); inUl = false; }
      tblRows.push(trimmed);
      continue;
    }
    flushTable();

    // Sub-list (2+ leading spaces)
    if (/^ {2,}[-*] (.+)$/.test(line)) {
      const content = line.replace(/^ +[-*] /, "");
      if (!inUl) { out.push("<ul>"); inUl = true; depth = 0; }
      if (depth < 1) { out.push("<ul class='ai_sub'>"); depth = 1; }
      out.push(`<li>${content}</li>`);
      continue;
    }

    // Top-level bullet
    if (/^[-*] (.+)$/.test(line)) {
      const content = line.replace(/^[-*] /, "");
      closeUl(0);
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${content}</li>`);
      continue;
    }

    // Non-list / non-table
    closeUl(0);
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (/^<h[1-4]|^<hr/.test(line)) {
      out.push(line);
    } else if (line.trim()) {
      out.push(`<p>${line}</p>`);
    }
  }
  flushTable();
  closeUl(0);
  if (inUl) out.push("</ul>");

  return out.join("\n").replace(/<p><\/p>/g, "");
}

// Quick Save API Key from Error UI
window.saveQuickApiKey = async function(inputId) {
    if (!window.SAAS_ROUTER || !window.SAAS_ROUTER.tenant) {
        alert("Lỗi: Không tìm thấy thông tin tenant hiện tại.");
        return;
    }
    const slug = window.SAAS_ROUTER.tenant.slug;
    const inp = document.getElementById(inputId);
    const gemini_api_key = inp ? inp.value.trim() : '';

    if (!gemini_api_key) {
        alert("Vui lòng nhập API Key!");
        return;
    }

    const btn = inp.nextElementSibling;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'auth_update_settings',
                slug: slug,
                admin_email: window._currentUser?.email || '',
                gemini_api_key: gemini_api_key
            })
        });
        const data = await res.json();
        if (data.ok) {
            showToast("Đã lưu API Key thành công! Vui lòng thử lại chức năng AI.", 4000);
            window.SAAS_ROUTER.tenant.gemini_api_key = gemini_api_key;
            // Hide the error
            if (inp.parentElement && inp.parentElement.parentElement) {
               inp.parentElement.parentElement.style.display = 'none';
            }
        } else {
            alert("Lỗi: " + (data.error || "Không thể cập nhật cấu hình. Có thể bạn không phải Admin."));
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối khi lưu API Key");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
