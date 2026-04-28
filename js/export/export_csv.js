function exportAdsToCSV() {
  const data = window._ALL_CAMPAIGNS;
  if (!data || !Array.isArray(data) || data.length === 0) {
    domAlert("Không có dữ liệu để xuất!");
    return;
  }

  const headers = [
    "Time Range", "Campaign ID", "Campaign Name",
    "Adset ID", "Adset Name", "Ad ID", "Ad Name",
    "Status", "Goal", "Spent (VND)", "Results", "Cost per Result",
    "Impressions", "Reach", "Frequency", "CPM",
    "Link Clicks", "Messages", "Leads",
  ];

  const timeRange = `${startDate} - ${endDate}`;
  const rows = [];

  data.forEach((campaign) => {
    (campaign.adsets || []).forEach((adset) => {
      (adset.ads || []).forEach((ad) => {
        const frequency = ad.reach > 0 ? (ad.impressions / ad.reach).toFixed(2) : "0";
        const cpm = ad.impressions > 0 ? ((ad.spend / ad.impressions) * 1000).toFixed(0) : "0";
        const cpr = ad.result > 0 ? (ad.spend / ad.result).toFixed(0) : "0";

        rows.push([
          timeRange, campaign.id, campaign.name,
          adset.id, adset.name, ad.id, ad.name,
          ad.status, ad.optimization_goal || "Unknown",
          ad.spend.toFixed(0), ad.result || 0, cpr,
          ad.impressions || 0, ad.reach || 0, frequency, cpm,
          ad.link_clicks || 0, ad.message || 0, ad.lead || 0,
        ]);
      });
    });
  });

  // BOM để Excel hiển thị đúng tiếng Việt UTF-8
  let csvContent = "\uFEFF";
  csvContent += headers.map((h) => `"${h}"`).join(",") + "\r\n";
  rows.forEach((row) => {
    csvContent += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Meta_Ads_Report_${startDate}_${endDate}.csv`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* --- BRAND SETTINGS LOGIC --- */
const BRAND_SETTINGS_KEY = "dom_brand_filters";
const DEFAULT_BRANDS = [];

function loadBrandSettings() {
  const saved = window.domGetItem(BRAND_SETTINGS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { return DEFAULT_BRANDS; }
  }
  return DEFAULT_BRANDS;
}

function updateBrandDropdownUI() {
  const brands = loadBrandSettings();
  const filterWrapper = document.querySelector(".dom_filter");
  const dropdownUl = document.querySelector(".quick_filter_detail .dom_select_show");
  
  if (brands.length === 0) {
      if (filterWrapper) filterWrapper.style.display = "none";
      return;
  } else {
      if (filterWrapper && window.BRAND_FILTER_SETUP !== false) filterWrapper.style.display = "flex";
  }

  if (!dropdownUl) return;

  const current = (CURRENT_CAMPAIGN_FILTER || "").toUpperCase() === "RESET"
    ? ""
    : (CURRENT_CAMPAIGN_FILTER || "").toLowerCase();

  dropdownUl.innerHTML = brands.map((b) => {
    const bFilter  = (b.filter || "").toLowerCase();
    const isActive = bFilter === current;
    const imgSrc = (b.img && b.img.trim() !== '') ? b.img.trim() : "https://domation.net/imgs/ICON.png";
    return `
    <li data-filter="${b.filter}" class="${isActive ? "active" : ""}">
      <img src="${imgSrc}" style="border-radius:50%; width:24px; height:24px; object-fit:cover;" onerror="this.src='https://domation.net/imgs/ICON.png'"/>
      <span>${b.name}</span>
    </li>`;
  }).join("");

  const selectedBrand = brands.find((b) => (b.filter || "").toLowerCase() === current);
  const parent = dropdownUl.closest(".quick_filter_detail");
  if (parent) {
    const parentImg = parent.querySelector("img");
    const parentText = parent.querySelector(".dom_selected");
    
    if (selectedBrand) {
      const imgSrc = (selectedBrand.img && selectedBrand.img.trim() !== '') ? selectedBrand.img.trim() : "https://domation.net/imgs/ICON.png";
      if (parentImg) {
        parentImg.style.display = "block";
        parentImg.src = imgSrc;
        parentImg.onerror = function() { this.src = 'https://domation.net/imgs/ICON.png'; };
      }
      if (parentText) parentText.textContent = selectedBrand.name;
    } else {
      // Default / Reset state ("Tất cả")
      if (parentImg) {
        parentImg.style.display = "block";
        parentImg.src = "https://domation.net/imgs/ICON.png";
      }
      if (parentText) parentText.textContent = "Tất cả";
    }
  }
}
