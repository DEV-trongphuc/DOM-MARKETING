function shareCurrentView() {
  const url = new URL(window.location.href);
  url.search = ""; // Xóa query params gốc (nếu có) để link cực kỳ sạch

  let basePath = url.pathname;
  const params = new URLSearchParams();
  if (typeof startDate !== 'undefined' && startDate) params.set("since", startDate);
  if (typeof endDate !== 'undefined' && endDate) params.set("until", endDate);

  if (typeof CURRENT_CAMPAIGN_FILTER !== 'undefined' && CURRENT_CAMPAIGN_FILTER && CURRENT_CAMPAIGN_FILTER.toUpperCase() !== "RESET") {
    params.set("brand", CURRENT_CAMPAIGN_FILTER);
  }

  url.search = params.toString();
  url.hash = "";

  const shareUrl = url.toString();
  navigator.clipboard.writeText(shareUrl)
    .then(() => showToast("🔗 Link copied! Date range & brand filter included.", 3000))
    .catch(() => prompt("Copy this link:", shareUrl));
}

// Auto-restore state from URL params on load
(function restoreStateFromURL() {
  let paramString = window.location.search;
  
  const params = new URLSearchParams(paramString);
  const since  = params.get("since");
  const until  = params.get("until");
  const brand  = params.get("brand");
  if (since && until) {
    window._URL_RESTORE = { since, until, brand: brand || "" };
  }
})();

// Hook into initDashboard to restore URL params after init
const _origInitDashboard = typeof initDashboard === "function" ? initDashboard : null;
if (_origInitDashboard) {
  window.initDashboard = function () {
    _origInitDashboard.call(this);
    if (window._URL_RESTORE) {
      const { since, until, brand: brandFilter } = window._URL_RESTORE;
      startDate = since;
      endDate   = until;
      
      // Update UI components for date selector
      const startInput = document.getElementById("start_date_val");
      const endInput = document.getElementById("end_date_val");
      if (startInput) startInput.value = since;
      if (endInput) endInput.value = until;
      
      // Update temp vars so calendar matches when opened
      if (typeof tempStartDate !== "undefined") tempStartDate = since;
      if (typeof tempEndDate !== "undefined") tempEndDate = until;
      
      // Format label e.g., "DD/MM/YYYY - DD/MM/YYYY"
      const fmt = (d) => {
        const [y, m, day] = d.split("-");
        return `${day}/${m}/${y}`;
      };
      const selectedText = document.querySelector(".dom_select.time .dom_selected");
      if (selectedText) {
        selectedText.textContent = `${fmt(since)} - ${fmt(until)}`;
      }
      
      // Reset sidebar presets and quick buttons to inactive, except Custom
      const presetItems = document.querySelectorAll(".time_picker_sidebar li[data-date]");
      presetItems.forEach((i) => i.classList.remove("active"));
      const customLi = document.querySelector('li[data-date="custom_range"]');
      if (customLi) customLi.classList.add("active");
      
      document.querySelectorAll(".date_quick_btn").forEach((btn) => btn.classList.remove("active"));
      
      window._URL_RESTORE_BRAND = brandFilter;
      showToast(`🔗 Restored view: ${since} → ${until}${brandFilter ? " | Brand: " + brandFilter : ""}`, 4000);
    }
  };
}

// Patch loadDashboardData to apply brand after data loads
const _origLoadDashboardData = typeof loadDashboardData === "function" ? loadDashboardData : null;
if (_origLoadDashboardData) {
  window.loadDashboardData = async function (...args) {
    await _origLoadDashboardData.apply(this, args);
    if (window._URL_RESTORE_BRAND !== undefined) {
      const b = window._URL_RESTORE_BRAND;
      window._URL_RESTORE_BRAND = undefined;
      if (b && typeof applyCampaignFilter === "function") await applyCampaignFilter(b);
    }
  };
}

// document.getElementById("share_url_btn")?.addEventListener("click", shareCurrentView);
