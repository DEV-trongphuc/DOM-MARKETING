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
  btn.style.color = on ? "#f59e0b" : "#64748b";
  btn.style.background = on ? "#fffbeb" : "#fff";
  btn.title = on ? "Ẩn Smart Badges" : "Hiển thị Smart Badges";
  if (window.lastRenderData) renderCampaignTable(window.lastRenderData);
};

// Đợi router khởi tạo xong mới chạy main()
async function bootstrapSaaS() {
  const _isDev = location.search.includes('debug=1');
  const _dbg = _isDev ? console.log.bind(console, '[STARTUP]') : () => { };

  const routerReady = await SAAS_ROUTER.init();
  if (!routerReady) return;
  // Hiển thị tab CRM DATA & DATA Router nếu là workspace /ideas (Render động để tránh lộ đường dẫn/cấu trúc ở các workspace khác)
  if (window.SAAS_ROUTER && window.SAAS_ROUTER.tenant && window.SAAS_ROUTER.tenant.slug?.toLowerCase() === 'ideas') {
    const sidebar = document.querySelector('.dom_sidebar');
    if (sidebar) {
      const ideasTab = document.createElement('div');
      ideasTab.id = 'ideas_crm_tab';
      ideasTab.style.marginTop = '1.5rem';
      ideasTab.style.borderTop = '1px solid var(--borderSlate2)';
      ideasTab.style.paddingTop = '1.5rem';
      ideasTab.innerHTML = `
        <p class="dom_text_menu" style="margin-bottom: 0.8rem;">OTHER APP</p>
        <ul class="dom_other_menu" style="margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.8rem;">
          <li class="" data-view="ideas_crm" style="list-style: none; margin: 0; padding: 0;">
            <a target="_blank" href="https://dev-trongphuc.github.io/DOM_MISA_IDEAS_CRM/" 
               style="display: flex; align-items: center; gap: 1rem; padding: 1.2rem 1.6rem; border-radius: 12px; cursor: pointer; transition: all 0.25s ease; color: var(--textSlate); border: 1.5px dashed var(--mainClr-mid); background: var(--mainClr-bg); text-decoration: none;"
               onmouseover="this.style.background='var(--mainClr-soft)'; this.style.color='var(--textNavy)'; this.style.borderColor='var(--mainClr)'; this.style.transform='translateY(-1px)';"
               onmouseout="this.style.background='var(--mainClr-bg)'; this.style.color='var(--textSlate)'; this.style.borderColor='var(--mainClr-mid)'; this.style.transform='none';">
              <i class="fa-solid fa-database" style="font-size: 1.8rem; color: var(--mainClr); transition: transform 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 2rem;"
                 onmouseover="this.style.transform='scale(1.15) rotate(5deg)';"
                 onmouseout="this.style.transform='none';"></i>
              <span style="font-weight: 700; font-size: 1.25rem; letter-spacing: -0.01em;">CRM MISA</span>
              <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 1rem; color: var(--textSlate); opacity: 0.6; margin-left: auto;"></i>
            </a>
          </li>
          <li class="" data-view="ideas_auto_data" style="list-style: none; margin: 0; padding: 0;">
            <a target="_blank" href="https://ideas-data.vercel.app/rounds" 
               style="display: flex; align-items: center; gap: 1rem; padding: 1.2rem 1.6rem; border-radius: 12px; cursor: pointer; transition: all 0.25s ease; color: var(--textSlate); border: 1.5px dashed var(--mainClr-mid); background: var(--mainClr-bg); text-decoration: none;"
               onmouseover="this.style.background='var(--mainClr-soft)'; this.style.color='var(--textNavy)'; this.style.borderColor='var(--mainClr)'; this.style.transform='translateY(-1px)';"
               onmouseout="this.style.background='var(--mainClr-bg)'; this.style.color='var(--textSlate)'; this.style.borderColor='var(--mainClr-mid)'; this.style.transform='none';">
              <i class="fa-solid fa-robot" style="font-size: 1.8rem; color: var(--mainClr); transition: transform 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 2rem;"
                 onmouseover="this.style.transform='scale(1.15) rotate(5deg)';"
                 onmouseout="this.style.transform='none';"></i>
              <span style="font-weight: 700; font-size: 1.25rem; letter-spacing: -0.01em;">Auto Data</span>
              <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 1rem; color: var(--textSlate); opacity: 0.6; margin-left: auto;"></i>
            </a>
          </li>
          <li class="" data-view="ideas_automation" style="list-style: none; margin: 0; padding: 0;">
            <a target="_blank" href="https://automation.ideas.edu.vn/" 
               style="display: flex; align-items: center; gap: 1rem; padding: 1.2rem 1.6rem; border-radius: 12px; cursor: pointer; transition: all 0.25s ease; color: var(--textSlate); border: 1.5px dashed var(--mainClr-mid); background: var(--mainClr-bg); text-decoration: none;"
               onmouseover="this.style.background='var(--mainClr-soft)'; this.style.color='var(--textNavy)'; this.style.borderColor='var(--mainClr)'; this.style.transform='translateY(-1px)';"
               onmouseout="this.style.background='var(--mainClr-bg)'; this.style.color='var(--textSlate)'; this.style.borderColor='var(--mainClr-mid)'; this.style.transform='none';">
              <i class="fa-solid fa-gears" style="font-size: 1.8rem; color: var(--mainClr); transition: transform 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 2rem;"
                 onmouseover="this.style.transform='scale(1.15) rotate(5deg)';"
                 onmouseout="this.style.transform='none';"></i>
              <span style="font-weight: 700; font-size: 1.25rem; letter-spacing: -0.01em;">Automation</span>
              <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 1rem; color: var(--textSlate); opacity: 0.6; margin-left: auto;"></i>
            </a>
          </li>
        </ul>
      `;
      const sidebarBottom = sidebar.querySelector('.dom_sidebar_bottom');
      if (sidebarBottom) {
        sidebar.insertBefore(ideasTab, sidebarBottom);
      } else {
        sidebar.appendChild(ideasTab);
      }
    }
  }

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

// ── Format helpers ───────────────────────────────────────────────
const CURRENCY_CONFIG = {
  VND: { symbol: 'đ', pos: 'suffix', decimals: 0 },
  SGD: { symbol: 'S$', pos: 'prefix', decimals: 2 },
  USD: { symbol: '$', pos: 'prefix', decimals: 2 },
  EUR: { symbol: '€', pos: 'prefix', decimals: 2 },
  THB: { symbol: '฿', pos: 'prefix', decimals: 2 },
  MYR: { symbol: 'RM', pos: 'prefix', decimals: 2 },
  IDR: { symbol: 'Rp', pos: 'prefix', decimals: 0 },
  PHP: { symbol: '₱', pos: 'prefix', decimals: 2 },
  AUD: { symbol: 'A$', pos: 'prefix', decimals: 2 },
  GBP: { symbol: '£', pos: 'prefix', decimals: 2 },
  JPY: { symbol: '¥', pos: 'prefix', decimals: 0 },
  INR: { symbol: '₹', pos: 'prefix', decimals: 2 },
  KRW: { symbol: '₩', pos: 'prefix', decimals: 0 },
  TWD: { symbol: 'NT$', pos: 'prefix', decimals: 0 },
  CAD: { symbol: 'C$', pos: 'prefix', decimals: 2 }
};

window.formatMoney = (v) => {
  const cur = window.GLOBAL_CURRENCY || 'VND';
  const val = parseFloat(v);
  const config = CURRENCY_CONFIG[cur];

  if (isNaN(val)) {
    if (config) {
      if (config.pos === 'suffix') return `0${config.symbol}`;
      return `${config.symbol}0${config.decimals > 0 ? '.' + '0'.repeat(config.decimals) : ''}`;
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(0);
  }

  if (config) {
    const formattedNum = val.toLocaleString("en-US", { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals });
    return config.pos === 'suffix' ? `${formattedNum}${config.symbol}` : `${config.symbol}${formattedNum}`;
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(val);
};

window.formatMoneyShort = (v) => {
  const cur = window.GLOBAL_CURRENCY || 'VND';
  const val = parseFloat(v);
  if (isNaN(val)) return "0";

  const abs = Math.abs(val);
  let shortVal = String(val);

  if (abs >= 1e9) shortVal = (val / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6) shortVal = (val / 1e6).toFixed(2) + 'M';
  else if (abs >= 1e3) shortVal = (val / 1e3).toFixed(0) + 'K';
  else shortVal = String(Math.round(val));

  const config = CURRENCY_CONFIG[cur];
  if (config) {
    return config.pos === 'suffix' ? `${shortVal}${config.symbol}` : `${config.symbol}${shortVal}`;
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).formatToParts(0).find(x => x.type === "currency")?.value + shortVal;
};
const formatNumber = (v) => v && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") : "0";
const calcCpm = (spend, reach) => reach ? (spend / reach) * 1000 : 0;
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
