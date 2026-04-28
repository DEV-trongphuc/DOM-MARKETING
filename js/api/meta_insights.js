async function fetchAdsets() {
  const allData = [];
  let nextPageUrl = `${BASE_URL}/act_${ACCOUNT_ID}/insights?level=adset&fields=adset_id,adset_name,campaign_id,campaign_name,optimization_goal,spend,reach,impressions,actions,action_values,frequency,cpm,cpc,ctr,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}&limit=10000`;

  while (nextPageUrl) {
    const data = await fetchJSON(nextPageUrl);
    if (data.data) allData.push(...data.data);
    nextPageUrl = data.paging?.next || null;
  }

  return allData;
}

async function fetchCampaignInsights() {
  const allData = [];
  let nextPageUrl = `${BASE_URL}/act_${ACCOUNT_ID}/insights?level=campaign&fields=campaign_id,campaign_name,spend,reach,impressions,actions,action_values,frequency,cpm,cpc,ctr,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}&limit=10000`;

  while (nextPageUrl) {
    const data = await fetchJSON(nextPageUrl);
    if (data.data) allData.push(...data.data);
    nextPageUrl = data.paging?.next || null;
  }
  return allData;
}

async function fetchAdsAndInsights(adsetIds, onBatchProcessedCallback) {
  if (!Array.isArray(adsetIds) || adsetIds.length === 0) return [];

  const headers = {
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  const now = Date.now();
  const results = [];
  let batchCount = 0;

  // Chia adsetIds thành các batch
  const adsetChunks = chunkArray(adsetIds, BATCH_SIZE);

  // Giảm số lượng batch song song để tối ưu hóa hiệu suất
  await runBatchesWithLimit(
    adsetChunks.map((batch) => async () => {
      const startTime = performance.now();

      // Xây dựng batch API
      const fbBatch = batch.map((adsetId) => ({
        method: "GET",
        relative_url:
          `${adsetId}/ads?fields=id,name,effective_status,adset_id,` +
          `adset{end_time,start_time,daily_budget,lifetime_budget},` +
          `insights.time_range({since:'${startDate}',until:'${endDate}'}){spend,impressions,reach,actions,action_values,optimization_goal,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions}`,
      }));

      // Gọi API
      let adsResp;
      try {
        adsResp = await fetchJSON(BASE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            access_token: META_TOKEN,
            batch: fbBatch,
            include_headers: false // 🚀 Optimize: Reduce response size by omitting headers for each sub-request
          }),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        return; // Nếu có lỗi, bỏ qua batch này
      }

      // Xử lý kết quả từ API
      const processed = [];
      for (const item of adsResp) {
        if (item?.code === 190) {
          console.error("Token Expired detected inside batch! Triggering modal...");
          if (typeof window._openTokenModal === 'function') window._openTokenModal();
          continue;
        }
        
        if (item?.code !== 200 || !item?.body) continue;

        let body;
        try {
          body = JSON.parse(item.body);
        } catch {
          continue;
        }

        const data = body.data;
        if (!Array.isArray(data) || data.length === 0) continue;
        // Duyệt qua từng ad trong dữ liệu trả về và xử lý
        for (const ad of data) {
          const adset = ad.adset ?? {};
          const insights = ad.insights?.data?.[0] ?? {};
          const endTime = adset.end_time ? Date.parse(adset.end_time) : 0;

          const effective_status =
            ad.effective_status === "ACTIVE" && endTime && endTime < now
              ? "COMPLETED"
              : ad.effective_status;

          // Chỉ lấy thông tin cần thiết từ insights
          processed.push({
            ad_id: ad.id,
            ad_name: ad.name,
            adset_id: ad.adset_id,
            effective_status,
            adset: {
              status: adset.status ?? null,
              daily_budget: adset.daily_budget || 0,
              lifetime_budget: adset.lifetime_budget ?? null,
              end_time: adset.end_time ?? null,
              start_time: adset.start_time ?? null,
            },
            creative: {
              thumbnail_url: null, // Sẽ tải ngầm (background)
              instagram_permalink_url: null,
              facebook_post_url: null,
            },
            insights: {
              spend: !isNaN(+insights.spend) ? +insights.spend : 0,
              impressions: +insights.impressions || 0,
              reach: +insights.reach || 0,
              clicks: +insights.clicks || 0,
              inline_link_clicks: +insights.inline_link_clicks || 0,
              purchase_roas: Array.isArray(insights.purchase_roas) ? insights.purchase_roas : [],
              account_id: insights.account_id || "",
              account_name: insights.account_name || "",
              account_currency: (function() {
                  const curr = insights.account_currency || "";
                  if (curr && window.GLOBAL_CURRENCY === 'VND') window.GLOBAL_CURRENCY = curr;
                  return curr;
              })(),
              buying_type: insights.buying_type || "",
              objective: insights.objective || "",
              actions: Array.isArray(insights.actions) ? insights.actions : [],
              action_values: Array.isArray(insights.action_values) ? insights.action_values : [],
              // ⭐ Store dynamic video fields
              video_play_actions: insights.video_play_actions || [],
              video_thruplay_watched_actions: insights.video_thruplay_watched_actions || [],
              video_p25_watched_actions: insights.video_p25_watched_actions || [],
              video_p50_watched_actions: insights.video_p50_watched_actions || [],
              video_p75_watched_actions: insights.video_p75_watched_actions || [],
              video_p95_watched_actions: insights.video_p95_watched_actions || [],
              video_p100_watched_actions: insights.video_p100_watched_actions || [],
              optimization_goal: insights.optimization_goal || "",
            },
          });
        }
      }

      if (processed.length) {
        onBatchProcessedCallback?.(processed);
        results.push(...processed);
      }

      batchCount++;
    }),
    CONCURRENCY_LIMIT
  );

  return results;
}

window.backgroundFetchCreative = async function(adsArray) {
  if (!Array.isArray(adsArray) || adsArray.length === 0) return;
  const chunkedAds = chunkArray(adsArray, BATCH_SIZE);
  const headers = { "Content-Type": "application/json", Prefer: "return=minimal" };
  
  await runBatchesWithLimit(
    chunkedAds.map((batch) => async () => {
      const fbBatch = batch.map((ad) => ({
        method: "GET",
        relative_url: `${ad.ad_id}?fields=creative{thumbnail_url,instagram_permalink_url,effective_object_story_id}`
      }));

      let resp;
      try {
        resp = await fetchJSON(BASE_URL, {
          method: "POST", headers, body: JSON.stringify({ access_token: META_TOKEN, batch: fbBatch, include_headers: false })
        });
      } catch (err) {
        return;
      }

      for (let i = 0; i < resp.length; i++) {
        const item = resp[i];
        if (item?.code !== 200 || !item?.body) continue;
        let body;
        try { body = JSON.parse(item.body); } catch { continue; }
        
        const adRef = batch[i];
        if (!adRef) continue;
        
        const creative = body.creative ?? {};
        const thumb = creative.thumbnail_url ?? null;
        const fbUrl = creative.effective_object_story_id ? `https://facebook.com/${creative.effective_object_story_id}` : null;
        
        adRef.creative = {
          thumbnail_url: thumb,
          instagram_permalink_url: creative.instagram_permalink_url ?? null,
          facebook_post_url: fbUrl
        };
        adRef.thumbnail = thumb; // Đảm bảo thuộc tính rễ k gãi cho UI
        adRef.post_url = fbUrl;

        // ĐỒNG BỘ NGƯỢC VÀO window._ALL_CAMPAIGNS VÀO CÁC BẢNG SAO AD ĐỂ CÁC HIỆU ỨNG TÍNH TOÁN LẤY ĐƯỢC ẢNH MỚI NHẤT
        if (window._ALL_CAMPAIGNS) {
          for (const c of window._ALL_CAMPAIGNS) {
            for (const as of (c._sortedAdsets || c.adsets || [])) {
              for (const a of (as._sortedAds || as.ads || [])) {
                if (a.id === adRef.ad_id) {
                  a.thumbnail = thumb;
                  a.post_url = fbUrl;
                  if (!a.creative) a.creative = {};
                  a.creative.thumbnail_url = thumb;
                }
              }
            }
          }
        }

        // Cập nhật DOM (Ads Thumbnails cá nhân bên trong lưới con)
        if (thumb) {
          const imgEls = document.querySelectorAll(`img[data-ad-id-img="${adRef.ad_id}"]`);
          imgEls.forEach(img => {
            img.src = thumb;
            // Xóa data-src để plugin lazy-load (nếu có) không đè placeholder lại
            img.removeAttribute('data-src');
          });

          // Cập nhật data-thumb lên nút kính lúp modal insight
          const insightBtns = document.querySelectorAll(`[data-ad-id="${adRef.ad_id}"]`);
          insightBtns.forEach(btn => btn.setAttribute('data-thumb', thumb));
          if (fbUrl) insightBtns.forEach(btn => btn.setAttribute('data-post', fbUrl));
        }
      }
    }),
    CONCURRENCY_LIMIT
  );
  
  // Cập nhật lại các cụm nhiều ảnh (Fan Stack) trên thanh Header của Campaign sau khi tải xong
  if (typeof updateFanThumbnailsCascade === "function") {
    updateFanThumbnailsCascade();
  }
}

window.updateFanThumbnailsCascade = function() {
  const campaigns = window._ALL_CAMPAIGNS || [];
  
  document.querySelectorAll('.campaign_item').forEach(cNode => {
    const checkbox = cNode.querySelector('.campaign_main .row_checkbox');
    if (!checkbox) return;
    const cid = checkbox.dataset.id;
    const cObj = campaigns.find(c => c.id === cid);
    if (!cObj) return;
    
    const tbs = [];
    for (const as of cObj.adsets || []) {
      for (const ad of as.ads || []) {
        if (ad.thumbnail && !ad.thumbnail.startsWith("data:image/gif")) tbs.push(ad.thumbnail);
        if (tbs.length >= 3) break;
      }
      if (tbs.length >= 3) break;
    }
    
    if (tbs.length > 0) {
      const fanWrap = cNode.querySelector('.campaign_main .cmp_fan_wrap');
      if (fanWrap) {
        const imgs = fanWrap.querySelectorAll('.cmp_fan_img');
        imgs.forEach((img, idx) => {
          if (tbs[idx]) {
            img.src = tbs[idx];
            img.removeAttribute('data-src'); // chống lazy overrides
          }
        });
      }
    }
  });
}


async function fetchDailySpendByAccount() {
  const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions&time_increment=1&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
  const data = await fetchJSON(url);
  return data.data || [];
}

async function loadDailyChart() {
  try {
    const dailyData = await fetchDailySpendByAccount();
    DAILY_DATA = dailyData;
    renderDetailDailyChart2(DAILY_DATA);
  } catch (err) {
    console.error("Error in loadDailyChart:", err);
  }
}
