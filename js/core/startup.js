function resetAllFilters() {
  if (typeof applyCampaignFilter === "function") {
    applyCampaignFilter("RESET");
  } else {
    const campaignSearch = document.getElementById("campaign_filter");
    if (campaignSearch) campaignSearch.value = "";
    resetUIFilter();
    loadAllDashboardCharts();
  }
  document.querySelector(".dom_container")?.classList.remove("is-empty");
}

// ── Smart Badges Toggle ──────────────────────────────────────────
window._smartBadgesEnabled = true;

window.toggleSmartBadges = function (btn) {
  window._smartBadgesEnabled = !window._smartBadgesEnabled;
  const on = window._smartBadgesEnabled;
  btn.style.borderColor = on ? "#f59e0b" : "#e2e8f0";
  btn.style.color       = on ? "#f59e0b" : "#64748b";
  btn.style.background  = on ? "#fffbeb" : "#fff";
  btn.title = on ? "Ẩn Smart Badges" : "Hiển thị Smart Badges";
  if (window.lastRenderData) renderCampaignTable(window.lastRenderData);
};

// Đợi router khởi tạo xong mới chạy main()
async function bootstrapSaaS() {
  const _isDev = location.search.includes('debug=1');
  const _dbg = _isDev ? console.log.bind(console, '[STARTUP]') : () => {};

  const routerReady = await SAAS_ROUTER.init();
  if (!routerReady) return;

  if (typeof window.initAuth === 'function') {
      window.initAuth();
  }

  _dbg('Chờ xác thực Google...');
  if (window._authReady instanceof Promise) await window._authReady;
  _dbg('Xác thực hoàn tất. Chuẩn bị trích xuất Token...');

  // 1.5. Chạy initAccountSelector để nạp đúng targetToken từ cấu trúc multi-token vào APP_CONFIG.META_TOKEN
  if (typeof initAccountSelector === 'function') {
      await initAccountSelector();
  }
  _dbg('Token hiện tại:', window.APP_CONFIG.META_TOKEN ? 'Có token' : 'Không có token');

  // 2. Sau khi Auth xong, mới kiểm tra Token xem có hợp lệ hay không
  let tokenOk = true;
  if (typeof window.initTokenCheck === 'function') {
    tokenOk = await window.initTokenCheck();
  }

  if (!tokenOk) {
    console.warn("[STARTUP] Token khong hop le hoac bi thieu, ngung load dashboard (Hien Modal).");
    return;
  }

  // 2.5 Kiểm tra xem có Ad Account nào được chọn không
  if (!window.ACCOUNT_ID || window.ACCOUNT_ID === "" || window.ACCOUNT_ID === "---") {
    console.warn("[STARTUP] Khong co Ad Account nao duoc chon, hien thi Modal quan ly tai khoan.");
    if (typeof openAccountManagerModal === 'function') {
        openAccountManagerModal();
    }
    // Dọn dẹp giao diện trống
    const db = document.querySelector(".dom_dashboard");
    if (db) {
        db.innerHTML = `<div style="text-align:center; padding: 10rem 0; width: 100%; color: #94a3b8; font-family: sans-serif;">
            <i class="fa-solid fa-folder-open" style="font-size: 5rem; color: #cbd5e1; margin-bottom: 2rem;"></i>
            <h2 style="font-size: 1.5rem; color: #64748b; font-weight: 600;">Chưa có tài khoản quảng cáo nào được kết nối.</h2>
            <p style="margin-top: 0.5rem; font-size: 1.2rem;">Vui lòng thêm tài khoản để tiếp tục.</p>
        </div>`;
    }
    return;
  }

  _dbg('Token OK, khởi chạy Dashboard!');

  // 3. Khởi chạy Dashboard
  main();
}


bootstrapSaaS();

// Callback khi user nhập token mới từ modal → reload toàn bộ dữ liệu
window._afterTokenResolved = function () {
  if (typeof CACHE !== "undefined" && CACHE && typeof CACHE.clear === "function") {
    CACHE.clear();
  }
  main();
};

const formatMoney = (v) => {
  const cur = window.GLOBAL_CURRENCY || 'VND';
  const val = parseFloat(v);
  if (isNaN(val)) {
    if (cur === 'VND') return "0đ";
    if (cur === 'SGD') return "S$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(0);
  }
  if (cur === 'VND') return Math.round(val).toLocaleString("vi-VN") + "đ";
  if (cur === 'SGD') return "S$" + val.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(val);
};
window.formatMoney = formatMoney;

const formatMoneyShort = (v) => {
  const val = parseFloat(v);
  if (isNaN(val)) return "0";
  const abs = Math.abs(val);
  const cur = window.GLOBAL_CURRENCY || 'VND';
  
  let shortVal = String(val);
  if (abs >= 1e9) shortVal = (val / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6) shortVal = (val / 1e6).toFixed(2) + 'M';
  else if (abs >= 1e3) shortVal = (val / 1e3).toFixed(0) + 'K';
  else shortVal = String(Math.round(val));
  
  if (cur === 'VND') return shortVal + "đ";
  if (cur === 'SGD') return "S$" + shortVal;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).formatToParts(0).find(x => x.type === "currency")?.value + shortVal;
};
window.formatMoneyShort = formatMoneyShort;
const formatNumber = (v) => v && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") : "0";
const calcCpm      = (spend, reach) => reach ? (spend / reach) * 1000 : 0;
const calcFrequency = (impr, reach) => reach ? (impr / reach).toFixed(1) : "0.0";

const getReaction = (insights) => getAction(insights?.actions, "post_reaction");

const calcCpr = (insights) => {
  const spend = +insights?.spend || 0;
  const result = getResults(insights);
  if (!result) return 0;
  const goal = insights.optimization_goal || VIEW_GOAL || "";
  const factor = (goal === "REACH" || goal === "IMPRESSIONS") ? 1000 : 1;
  return (spend / result) * factor;
};

function loadLazyImages(container) {
  if (!container) return;
  container.querySelectorAll("img[data-src]").forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  });
}
