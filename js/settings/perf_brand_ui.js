function updatePerfBrandDropdownUI() {
  const brands     = loadBrandSettings();
  const filterWrapper = document.querySelector(".perf_brand_filter_wrapper");
  const dropdownUl = document.getElementById("perf_brand_list");

  if (brands.length === 0) {
      if (filterWrapper) filterWrapper.style.display = "none";
      return;
  } else {
      if (filterWrapper && window.APP_CONFIG?.BRAND_FILTER_ENABLED !== false) {
          filterWrapper.style.display = "flex";
      } else if (filterWrapper) {
          filterWrapper.style.display = "none";
          return;
      }
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
  const parentText = document.getElementById("perf_selected_brand");
  const parentImg  = document.getElementById("perf_selected_brand_img");
  
  if (selectedBrand) {
    if (parentText) parentText.textContent = selectedBrand.name;
    if (parentImg) {
      const imgSrc = (selectedBrand.img && selectedBrand.img.trim() !== '') ? selectedBrand.img.trim() : "https://domation.net/imgs/ICON.png";
      parentImg.style.display = "block";
      parentImg.src = imgSrc;
      parentImg.onerror = function() { this.src = 'https://domation.net/imgs/ICON.png'; };
    }
  } else {
    // Default / Reset state ("Tất cả")
    if (parentText) parentText.textContent = "Tất cả";
    if (parentImg) {
      parentImg.style.display = "block";
      parentImg.src = "https://domation.net/imgs/ICON.png";
    }
  }
}
