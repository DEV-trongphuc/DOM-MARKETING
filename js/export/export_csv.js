function exportAdsToCSV() {
  const data = window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS;
  if (!data || !Array.isArray(data) || data.length === 0) {
    if (typeof domAlert === "function") domAlert("Không có dữ liệu để xuất!");
    else alert("Không có dữ liệu để xuất!");
    return;
  }

  // Respect current search query filter if present
  let filteredData = data;
  const searchInput = document.getElementById("filter");
  const searchKeyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
  if (searchKeyword) {
    filteredData = data.filter((c) => {
      if ((c.name || "").toLowerCase().includes(searchKeyword)) return true;
      if (c.id && c.id.includes(searchKeyword)) return true;
      const hasAdset = (c.adsets || []).some(
        (as) => (as.name || "").toLowerCase().includes(searchKeyword) || (as.id && as.id.includes(searchKeyword))
      );
      if (hasAdset) return true;
      return (c.adsets || []).some((as) =>
        (as.ads || []).some((ad) => (ad.name || "").toLowerCase().includes(searchKeyword) || (ad.id && ad.id.includes(searchKeyword)))
      );
    });
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

  filteredData.forEach((campaign) => {
    (campaign.adsets || []).forEach((adset) => {
      (adset.ads || []).forEach((ad) => {
        const frequency = ad.reach > 0 ? ad.impressions / ad.reach : 0;
        const cpm = ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0;
        const cpr = ad.result > 0 ? ad.spend / ad.result : 0;

        rows.push({
          timeRange,
          campaignId: campaign.id,
          campaignName: campaign.name,
          adsetId: adset.id,
          adsetName: adset.name,
          adId: ad.id,
          adName: ad.name,
          status: ad.status,
          goal: ad.optimization_goal || "Unknown",
          spend: ad.spend || 0,
          result: ad.result || 0,
          cpr,
          impressions: ad.impressions || 0,
          reach: ad.reach || 0,
          frequency,
          cpm,
          clicks: ad.link_clicks || 0,
          messages: ad.message || 0,
          leads: ad.lead || 0,
        });
      });
    });
  });

  if (rows.length === 0) {
    if (typeof domAlert === "function") domAlert("Không có dữ liệu quảng cáo nào khớp với bộ lọc để xuất!");
    else alert("Không có dữ liệu quảng cáo nào khớp với bộ lọc để xuất!");
    return;
  }

  // Generate Excel-compatible HTML format with styling and formulas
  let html = `<html xmlns:o="urn:schemas-microsoft-xml:schemas-office:office" xmlns:x="urn:schemas-microsoft-xml:schemas-office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
  html += `<head><meta charset="utf-8" />`;
  html += `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Meta Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
  html += `<style>`;
  html += `table { border-collapse: collapse; }`;
  html += `th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; }`;
  html += `th { background-color: #f1f5f9; font-weight: bold; text-align: left; color: #334155; }`;
  html += `td { mso-number-format:"\\@"; text-align: left; color: #475569; }`;
  html += `.num { mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }`;
  html += `.currency { mso-number-format:"\\#\\,\\#\\#0\\ \\đ"; text-align: right; }`;
  html += `.decimal { mso-number-format:"0\\.00"; text-align: right; }`;
  html += `.total-row td { background-color: #e2e8f0; font-weight: bold; color: #1e293b; border-top: 2px solid #94a3b8; }`;
  html += `</style></head><body><table>`;

  // Headers
  html += `<tr>` + headers.map(h => `<th>${h}</th>`).join("") + `</tr>`;

  // Data Rows
  rows.forEach((row) => {
    html += `<tr>`;
    html += `<td>${row.timeRange}</td>`;
    html += `<td>${row.campaignId}</td>`;
    html += `<td>${row.campaignName}</td>`;
    html += `<td>${row.adsetId}</td>`;
    html += `<td>${row.adsetName}</td>`;
    html += `<td>${row.adId}</td>`;
    html += `<td>${row.adName}</td>`;
    html += `<td>${row.status}</td>`;
    html += `<td>${row.goal}</td>`;
    html += `<td class="currency">${row.spend}</td>`;
    html += `<td class="num">${row.result}</td>`;
    html += `<td class="currency">${row.cpr}</td>`;
    html += `<td class="num">${row.impressions}</td>`;
    html += `<td class="num">${row.reach}</td>`;
    html += `<td class="decimal">${row.frequency}</td>`;
    html += `<td class="currency">${row.cpm}</td>`;
    html += `<td class="num">${row.clicks}</td>`;
    html += `<td class="num">${row.messages}</td>`;
    html += `<td class="num">${row.leads}</td>`;
    html += `</tr>`;
  });

  // Total / Average Row
  const totalRowIndex = rows.length + 2; // header is row 1, 1-indexed
  html += `<tr class="total-row">`;
  html += `<td colspan="9" style="text-align: center; font-weight: bold;">Tổng cộng / Trung bình</td>`;
  html += `<td class="currency">=SUM(J2:J${totalRowIndex - 1})</td>`;
  html += `<td class="num">=SUM(K2:K${totalRowIndex - 1})</td>`;
  html += `<td class="currency">=IF(K${totalRowIndex}>0, J${totalRowIndex}/K${totalRowIndex}, 0)</td>`;
  html += `<td class="num">=SUM(M2:M${totalRowIndex - 1})</td>`;
  html += `<td class="num">=SUM(N2:N${totalRowIndex - 1})</td>`;
  html += `<td class="decimal">=IF(N${totalRowIndex}>0, M${totalRowIndex}/N${totalRowIndex}, 0)</td>`;
  html += `<td class="currency">=IF(M${totalRowIndex}>0, (J${totalRowIndex}/M${totalRowIndex})*1000, 0)</td>`;
  html += `<td class="num">=SUM(Q2:Q${totalRowIndex - 1})</td>`;
  html += `<td class="num">=SUM(R2:R${totalRowIndex - 1})</td>`;
  html += `<td class="num">=SUM(S2:S${totalRowIndex - 1})</td>`;
  html += `</tr>`;

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Meta_Ads_Report_${startDate}_${endDate}.xls`);
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
