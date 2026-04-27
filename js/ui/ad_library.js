/**
 * @file ad_library.js
 * @description Handles fetching, grouping, and rendering of the Ad Library view.
 * Grouping is based on Brand (extracted from Campaign Name).
 * Only displays ACTIVE ads.
 * Falls back to thumbnail if iframe is restricted or unavailable.
 */

window.renderAdLibrary = function () {
  const container = document.getElementById("ad_library_content");
  if (!container) return;

  const campaigns = window._ALL_CAMPAIGNS || [];
  
  if (campaigns.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 4rem; color: #94a3b8;">
        <i class="fa-solid fa-folder-open" style="font-size:3rem; margin-bottom:1rem; color:#cbd5e1;"></i>
        <br><span style="font-size:1.1rem; font-weight:600;">Chưa có dữ liệu chiến dịch.</span>
      </div>`;
    return;
  }

  // 1. Gather all ACTIVE ads
  const activeAds = [];

  campaigns.forEach((c) => {
    const brandName = extractBrandFromName(c.name || "Unknown");
    
    (c.adsets || []).forEach((as) => {
      (as.ads || []).forEach((ad) => {
        if ((ad.status || "").toLowerCase() === "active") {
          activeAds.push({
            brand: brandName,
            campaign_id: c.id,
            adset_id: as.id,
            ad_id: ad.id,
            ad_name: ad.name,
            thumbnail: ad.thumbnail,
            post_url: ad.post_url,
            effective_object_story_id: ad.effective_object_story_id,
            spend: ad.spend || 0
          });
        }
      });
    });
  });

  if (activeAds.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 4rem; color: #94a3b8;">
        <i class="fa-solid fa-circle-check" style="font-size:3rem; margin-bottom:1rem; color:#cbd5e1;"></i>
        <br><span style="font-size:1.1rem; font-weight:600;">Không có quảng cáo nào đang chạy (Active).</span>
      </div>`;
    return;
  }

  // 2. Group by Brand
  const adsByBrand = {};
  activeAds.forEach((ad) => {
    if (!adsByBrand[ad.brand]) adsByBrand[ad.brand] = [];
    adsByBrand[ad.brand].push(ad);
  });

  // Sort brands alphabetically
  const sortedBrands = Object.keys(adsByBrand).sort();

  // 3. Render
  let html = "";
  
  sortedBrands.forEach((brand) => {
    const ads = adsByBrand[brand];
    
    // Sort ads by spend desc
    ads.sort((a, b) => b.spend - a.spend);

    html += `
      <div class="ad_library_brand_group">
        <h3 class="ad_library_brand_title">
          <i class="fa-solid fa-tags" style="color:#3b82f6; font-size: 1.4rem;"></i>
          ${brand} <span style="font-size:0.9rem; color:#94a3b8; background:#f1f5f9; padding: 0.2rem 0.6rem; border-radius: 20px;">${ads.length} ads</span>
        </h3>
        <div class="ad_library_grid">
    `;

    ads.forEach((ad) => {
      // Decode URL if necessary, meta API often returns valid permalinks for iframe
      let isFacebookPost = ad.post_url && ad.post_url.includes('facebook.com');
      let iframeSrc = "";
      
      // Attempt to build iframe URL
      if (isFacebookPost && ad.post_url) {
        iframeSrc = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(ad.post_url)}&show_text=true&width=auto`;
      } else if (ad.effective_object_story_id && ad.effective_object_story_id.includes('_')) {
        // Build facebook plugin URL from ID
        const pageId = ad.effective_object_story_id.split('_')[0];
        const postId = ad.effective_object_story_id.split('_')[1];
        
        // This is a standard FB post embed URL format
        iframeSrc = `https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2F${pageId}%2Fposts%2F${postId}&show_text=true&width=auto`;
      }

      // Format spend
      const spendFormatted = formatMoneyShort ? formatMoneyShort(ad.spend) : ad.spend;

      html += `
        <div class="ad_library_card">
          <div class="ad_library_card_header">
            <div class="ad_library_card_status">
              <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active
            </div>
            <div class="ad_library_card_id" title="Spend: ${spendFormatted}đ">
              <i class="fa-solid fa-coins" style="color:#f59e0b;"></i> ${spendFormatted}
            </div>
          </div>
          <div class="ad_library_iframe_wrap">
            ${iframeSrc ? `
              <iframe src="${iframeSrc}" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" onerror="handleIframeError(this, '${ad.thumbnail}')"></iframe>
              <div class="iframe_loading_placeholder" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#f1f5f9; z-index:-1;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#cbd5e1;"></i>
              </div>
            ` : `
              <img src="${ad.thumbnail}" class="ad_library_fallback" loading="lazy" alt="${ad.ad_name}" onerror="this.src='https://ideas.edu.vn/wp-content/uploads/2025/10/520821295_122209126670091888_6779497482843304564_n.webp'">
              <a href="${ad.post_url}" target="_blank" class="ad_library_fallback_btn"><i class="fa-brands fa-meta"></i> Xem Quảng Cáo</a>
            `}
          </div>
          <div style="padding: 1rem 1.2rem; background: #fff;">
            <div style="font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ad.ad_name}">${ad.ad_name}</div>
            <div style="font-size: 0.85rem; color: #64748b; font-family: monospace;">ID: ${ad.ad_id}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

// Global error handler for iframe loading failures (e.g. non-public posts)
window.handleIframeError = function(iframeEl, fallbackThumbnail) {
  const wrap = iframeEl.parentElement;
  if (!wrap) return;
  wrap.innerHTML = `
    <img src="${fallbackThumbnail}" class="ad_library_fallback" loading="lazy" onerror="this.src='https://ideas.edu.vn/wp-content/uploads/2025/10/520821295_122209126670091888_6779497482843304564_n.webp'">
    <a href="#" class="ad_library_fallback_btn" onclick="alert('Không thể xem trực tiếp quảng cáo này do giới hạn quyền riêng tư của Meta.'); return false;"><i class="fa-solid fa-eye-slash"></i> Quảng cáo ẩn (Dark Post)</a>
  `;
};

// Simple helper to extract brand from campaign name, e.g., "[Nava Store] - Áo sơ mi" -> "NAVA STORE"
function extractBrandFromName(name) {
  if (!name) return "KHÁC";
  
  // 1. Check for [Brand] or {Brand}
  let match = name.match(/^\[(.*?)\]/) || name.match(/^\{(.*?)\}/) || name.match(/^\((.*?)\)/);
  if (match && match[1].trim() !== "") {
    return match[1].trim().toUpperCase();
  }

  // 2. Fallback check for delimiter like "-" or "_"
  match = name.split(/[-|_]/)[0];
  if (match && match.trim() !== "") {
    return match.trim().toUpperCase();
  }

  return "KHÁC";
}
