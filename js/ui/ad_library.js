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

  // Apply Global Brand Filter
  let filteredAds = activeAds;
  if (typeof CURRENT_CAMPAIGN_FILTER !== 'undefined' && CURRENT_CAMPAIGN_FILTER && CURRENT_CAMPAIGN_FILTER !== "RESET") {
    filteredAds = activeAds.filter(ad => ad.brand === CURRENT_CAMPAIGN_FILTER);
  }

  if (filteredAds.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 4rem; color: #94a3b8;">
        <i class="fa-solid fa-filter" style="font-size:3rem; margin-bottom:1rem; color:#cbd5e1;"></i>
        <br><span style="font-size:1.1rem; font-weight:600;">Không có quảng cáo nào phù hợp với bộ lọc.</span>
      </div>`;
    return;
  }

  // Sort globally by spend desc before pagination
  filteredAds.sort((a, b) => b.spend - a.spend);

  window._adLibraryFilteredAds = filteredAds;
  window._adLibraryCurrentPage = 1;
  window.renderAdLibraryCurrentPage();
};

window.renderAdLibraryCurrentPage = function() {
  const container = document.getElementById("ad_library_content");
  if (!container) return;

  const ads = window._adLibraryFilteredAds || [];
  const page = window._adLibraryCurrentPage || 1;
  const itemsPerPage = 15;
  const totalPages = Math.ceil(ads.length / itemsPerPage);
  
  const startIndex = (page - 1) * itemsPerPage;
  const pagedAds = ads.slice(startIndex, startIndex + itemsPerPage);

  // Group by Brand for the current page
  const adsByBrand = {};
  pagedAds.forEach((ad) => {
    if (!adsByBrand[ad.brand]) adsByBrand[ad.brand] = [];
    adsByBrand[ad.brand].push(ad);
  });

  const sortedBrands = Object.keys(adsByBrand).sort();

  let html = "";
  
  sortedBrands.forEach((brand) => {
    const brandAds = adsByBrand[brand];
    
    html += `
      <div class="ad_library_brand_group">
        <h3 class="ad_library_brand_title">
          <i class="fa-solid fa-tags" style="color:#f59e0b; font-size: 1.6rem;"></i>
          ${brand} <span style="font-size:0.9rem; color:#94a3b8; background:#f1f5f9; padding: 0.2rem 0.6rem; border-radius: 20px;">${brandAds.length} ads (Trang ${page})</span>
        </h3>
        <div class="ad_library_grid">
    `;

    brandAds.forEach((ad) => {
      const spendFormatted = window.formatMoneyShort ? window.formatMoneyShort(ad.spend) : ad.spend;
      html += `
        <div class="ad_library_card">
          <div class="ad_library_card_header">
            <div class="ad_library_card_status">
              <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active
            </div>
            <div class="ad_library_card_id" title="Spend: ${spendFormatted}">
              <i class="fa-solid fa-coins" style="color:#f59e0b;"></i> ${spendFormatted}
            </div>
          </div>
          <style>
            .ad-hide-scroll::-webkit-scrollbar { display: none; }
            .ad-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
          </style>
          <div class="ad_library_iframe_wrap ad-hide-scroll" style="position:relative; height: 400px; overflow-y: auto; overflow-x: hidden;" id="ad_lib_wrap_${ad.ad_id}" data-ad-id="${ad.ad_id}" data-thumb="${ad.thumbnail}" data-post="${ad.post_url}">
             <div class="ad_lib_iframe_content" style="width:100%; min-height:100%; display:flex; justify-content:center; overflow:hidden;">
               <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#f1f5f9; flex-direction:column; gap: 1rem; z-index:1;">
                 <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#cbd5e1;"></i>
                 <span style="color:#94a3b8; font-size: 0.9rem; font-weight:500;">Đang tải nội dung...</span>
               </div>
             </div>
             <!-- Expand Button (only covers the top-right corner) -->
             <div style="position:absolute; top: 0.8rem; right: 0.8rem; z-index:10; cursor:pointer;" onclick="window._openAdIframeModal('${ad.ad_id}')">
               <div style="width: 2.8rem; height: 2.8rem; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); border-radius: 50%; display:flex; align-items:center; justify-content:center; color: #fff; font-size: 1.2rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(15,23,42,0.9)'" onmouseout="this.style.background='rgba(15,23,42,0.6)'" title="Phóng to">
                 <i class="fa-solid fa-expand"></i>
               </div>
             </div>
          </div>
          <div style="padding: 1.4rem 1.6rem; background: #fff;">
            <div style="font-weight: 700; color: #1e293b; font-size: 1.3rem; margin-bottom: 0.5rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${ad.ad_name}">${ad.ad_name}</div>
            <div style="font-size: 1.1rem; color: #64748b; font-family: monospace;">ID: ${ad.ad_id}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  // Pagination Controls
  if (totalPages > 1) {
    html += `
      <div style="display:flex; justify-content:center; align-items:center; gap:1rem; padding: 2rem 0; margin-top: 1rem; border-top: 1px solid #f1f5f9;">
        <button onclick="window._changeAdLibraryPage(-1)" ${page <= 1 ? 'disabled' : ''} style="padding: 0.8rem 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0; background: ${page <= 1 ? '#f8fafc' : '#fff'}; color: ${page <= 1 ? '#cbd5e1' : '#64748b'}; font-weight: 600; cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};">
          <i class="fa-solid fa-chevron-left"></i> Trước
        </button>
        <span style="font-weight: 700; color: #1e293b; font-size: 1.1rem;">Trang ${page} / ${totalPages}</span>
        <button onclick="window._changeAdLibraryPage(1)" ${page >= totalPages ? 'disabled' : ''} style="padding: 0.8rem 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0; background: ${page >= totalPages ? '#f8fafc' : '#fff'}; color: ${page >= totalPages ? '#cbd5e1' : '#64748b'}; font-weight: 600; cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};">
          Sau <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  
  // After HTML is inserted, load previews asynchronously
  loadAdLibraryPreviews();
};

window._changeAdLibraryPage = function(delta) {
  const ads = window._adLibraryFilteredAds || [];
  const totalPages = Math.ceil(ads.length / 15);
  let newPage = (window._adLibraryCurrentPage || 1) + delta;
  
  if (newPage < 1) newPage = 1;
  if (newPage > totalPages) newPage = totalPages;
  
  window._adLibraryCurrentPage = newPage;
  window.renderAdLibraryCurrentPage();
  
  // Scroll to top of ad library
  const tab = document.getElementById("tab-ad-library");
  if (tab) tab.scrollTop = 0;
};

async function loadAdLibraryPreviews() {
  const wrappers = document.querySelectorAll('.ad_library_iframe_wrap');
  
  // To avoid hitting API rate limits too hard, we can fetch them in parallel with a concurrency limit
  // But a simple Promise.all with small arrays is fine. We'll do it sequentially or all at once.
  // Meta API can handle parallel requests if not too many. Let's just fire them.
  for (const wrap of wrappers) {
    const adId = wrap.dataset.adId;
    const thumb = wrap.dataset.thumb;
    const postUrl = wrap.dataset.post;
    
    if (!adId) continue;
    
    try {
      const url = `${BASE_URL}/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${META_TOKEN}`;
      const data = await fetchJSON(url);
      const iframeHtml = data?.data?.[0]?.body || "";
      
      const contentWrap = wrap.querySelector('.ad_lib_iframe_content');
      if (!contentWrap) continue;

      if (iframeHtml) {
        contentWrap.innerHTML = iframeHtml;
        const iframe = contentWrap.querySelector('iframe');
        if (iframe) {
          iframe.style.setProperty('width', '100%', 'important');
          iframe.style.setProperty('min-width', '100%', 'important');
          iframe.style.setProperty('max-width', '100%', 'important');
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.style.overflow = 'hidden';
        }
      } else {
        renderAdLibraryFallback(contentWrap, thumb, postUrl);
      }
    } catch (err) {
      console.warn("Ad Library preview load failed for ad:", adId, err);
      const contentWrap = wrap.querySelector('.ad_lib_iframe_content');
      if (contentWrap) renderAdLibraryFallback(contentWrap, thumb, postUrl);
    }
  }
}

function renderAdLibraryFallback(wrap, thumb, postUrl) {
  wrap.innerHTML = `
    <img src="${thumb}" class="ad_library_fallback" loading="lazy" onerror="this.src='https://ideas.edu.vn/wp-content/uploads/2025/10/520821295_122209126670091888_6779497482843304564_n.webp'">
  `;
}

// Global error handler for iframe loading failures (e.g. non-public posts)
window.handleIframeError = function(iframeEl, fallbackThumbnail) {
  const wrap = iframeEl.parentElement;
  if (!wrap) return;
  wrap.innerHTML = `
    <img src="${fallbackThumbnail}" class="ad_library_fallback" loading="lazy" onerror="this.src='https://ideas.edu.vn/wp-content/uploads/2025/10/520821295_122209126670091888_6779497482843304564_n.webp'">
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

window._openAdIframeModal = function(adId) {
  const wrap = document.getElementById(`ad_lib_wrap_${adId}`);
  if (!wrap) return;
  const contentWrap = wrap.querySelector('.ad_lib_iframe_content');
  if (!contentWrap) return;
  const iframeHtml = contentWrap.innerHTML;
  
  let modal = document.getElementById("ad_iframe_modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ad_iframe_modal";
    modal.className = "ai_modal_overlay";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;animation:aiModalFadeIn .3s ease-out forwards;";
    modal.innerHTML = `
      <div class="ai_modal_box" style="width:min(600px, 95vw);height:85vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <button onclick="document.getElementById('ad_iframe_modal').classList.remove('active'); setTimeout(() => document.getElementById('ad_iframe_modal').style.display='none', 300);" style="position:absolute;top:1.2rem;right:1.2rem;width:3.6rem;height:3.6rem;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;color:#64748b;font-size:1.6rem;transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-xmark"></i></button>
        <div id="ad_iframe_modal_content" style="flex:1;overflow-y:auto;position:relative;background:#f8fafc;padding:2rem 0;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
      }
    });
  }
  
  modal.style.display = "flex";
  // Force reflow before adding active class for CSS transition
  void modal.offsetWidth;
  modal.classList.add("active");
  
  const contentDest = document.getElementById("ad_iframe_modal_content");
  contentDest.innerHTML = iframeHtml;
  
  // Make sure the iframe is fully expanded
  const iframe = contentDest.querySelector('iframe');
  if (iframe) {
    iframe.style.width = '100%';
    iframe.style.minHeight = '100%';
    iframe.style.border = 'none';
  }
};
