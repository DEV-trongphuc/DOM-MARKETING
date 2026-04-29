/**
 * @file heatmap_chart.js
 * @description Vẽ bản đồ nhiệt (Heatmap) Khung giờ vàng (Dayparting)
 */

window.renderHeatmap = async function() {
  const container = document.getElementById('heatmap_container');
  if (!container) return;

  const metric = document.getElementById('heatmap_metric_select')?.value || 'spend';
  
  // Get globals safely
  const accId = typeof ACCOUNT_ID !== 'undefined' ? ACCOUNT_ID : (window.ACCOUNT_ID || window.APP_CONFIG?.ACCOUNT_ID);
  const mToken = typeof META_TOKEN !== 'undefined' ? META_TOKEN : (window.META_TOKEN || window.APP_CONFIG?.META_TOKEN);

  if (!accId || !mToken) {
    container.innerHTML = '<div style="text-align:center; padding:3rem; color:#ef4444; font-size:1.2rem;">Lỗi: Chưa kết nối Ad Account.</div>';
    return;
  }

  container.innerHTML = '<div style="text-align:center; padding:3rem; color:#94a3b8; font-size:1.2rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải dữ liệu Heatmap...</div>';

  try {
    // Gọi API lấy dữ liệu theo giờ và theo ngày
    const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : (window.APP_CONFIG?.META_API_URL || 'https://graph.facebook.com/v24.0');
    
    let url = `${baseUrl}/act_${accId}/insights` +
      `?fields=spend,actions,clicks,impressions,reach` +
      `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` +
      `&time_increment=1` +
      `&limit=10000` +
      `&time_range={"since":"${typeof startDate !== 'undefined' ? startDate : ''}","until":"${typeof endDate !== 'undefined' ? endDate : ''}"}` +
      `&access_token=${mToken}`;

    let allData = [];
    let hasNext = true;

    while (hasNext) {
      const response = typeof fetchJSON !== 'undefined' ? await fetchJSON(url) : await window.fetchJSON(url);
      
      if (response && response.data) {
        allData = allData.concat(response.data);
      }

      if (response && response.paging && response.paging.next) {
        url = response.paging.next;
      } else {
        hasNext = false;
      }
    }
    
    if (allData.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:3rem; color:#64748b; font-size:1.2rem;">Không có dữ liệu trong khoảng thời gian này.</div>';
      return;
    }

    // Khởi tạo ma trận 7 ngày x 24 giờ
    // Days: 0 (Sun), 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri), 6 (Sat)
    const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxValue = 0;

    allData.forEach(row => {
      // Xác định thứ trong tuần từ date_start
      const date = new Date(row.date_start);
      const day = date.getDay(); // 0-6

      // Xác định giờ từ hourly_stats (VD: "00:00:00 - 00:59:59")
      const hourlyStr = row.hourly_stats_aggregated_by_advertiser_time_zone;
      if (!hourlyStr) return;
      const hour = parseInt(hourlyStr.split(':')[0], 10);

      // Trích xuất giá trị dựa theo metric được chọn
      let value = 0;
      if (metric === 'spend') {
        value = parseFloat(row.spend || 0);
      } else if (metric === 'clicks') {
        value = parseInt(row.clicks || 0, 10);
      } else if (['messages', 'purchases', 'leads'].includes(metric)) {
        if (row.actions && Array.isArray(row.actions)) {
          row.actions.forEach(act => {
            if (metric === 'purchases' && ['purchase', 'onsite_conversion.purchase', 'omni_purchase'].includes(act.action_type)) {
              value += parseInt(act.value || 0, 10);
            } else if (metric === 'messages' && ['onsite_conversion.messaging_conversation_started_7d', 'messages', 'messaging_conversation_started_7d'].includes(act.action_type)) {
              value += parseInt(act.value || 0, 10);
            } else if (metric === 'leads' && ['lead', 'onsite_conversion.lead_grouped'].includes(act.action_type)) {
              value += parseInt(act.value || 0, 10);
            }
          });
        }
      }

      matrix[day][hour] += value;
    });

    // Tìm giá trị lớn nhất để tính toán thang màu
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (matrix[d][h] > maxValue) maxValue = matrix[d][h];
      }
    }

    if (maxValue === 0) {
      container.innerHTML = '<div style="text-align:center; padding:3rem; color:#64748b; font-size:1.2rem;">Không có kết quả nào cho Metric này.</div>';
      return;
    }

    // Tái cấu trúc Days: Mon (1) -> Sun (0)
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dayIndices = [1, 2, 3, 4, 5, 6, 0];

    // Tạo HTML Lưới Heatmap
    let html = `<div style="display:flex; flex-direction:column; gap:4px; width:fit-content; margin:0 auto; padding-right:1rem;">`;
    
    // Header (Hours)
    html += `<div style="display:flex; gap:4px; margin-left:50px;">`;
    for (let h = 0; h < 24; h++) {
      html += `<div style="width:24px; font-size:1rem; color:#94a3b8; text-align:center;">${h}</div>`;
    }
    html += `</div>`;

    // Rows (Days)
    dayIndices.forEach((dIdx, index) => {
      html += `<div style="display:flex; gap:4px; align-items:center;">`;
      html += `<div style="width:46px; font-size:1.1rem; font-weight:600; color:#475569; text-align:right; padding-right:6px;">${dayLabels[index]}</div>`;
      
      for (let h = 0; h < 24; h++) {
        const val = matrix[dIdx][h];
        // Tính cường độ màu (0.1 -> 1)
        let intensity = 0.05; // Base color
        if (val > 0) {
          intensity = 0.15 + (val / maxValue) * 0.85;
        }

        // Định dạng tooltip
        const valFmt = metric === 'spend' ? (window.formatMoney ? window.formatMoney(val) : val.toFixed(0)) : val;
        
        let bgColor = `rgba(245, 158, 11, ${intensity})`; // Màu cam (Brand)
        if (val === 0) bgColor = '#f1f5f9';

        html += `<div class="heatmap-cell" style="width:24px; height:24px; border-radius:4px; background:${bgColor}; cursor:pointer; position:relative;" title="${dayLabels[index]} - ${h}h: ${valFmt}"></div>`;
      }
      html += `</div>`;
    });

    html += `</div>`;
    
    // Thêm ghi chú thang màu
    html += `
      <div style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:2rem; font-size:1.1rem; color:#64748b;">
        <span>Ít</span>
        <div style="display:flex; gap:4px;">
          <div style="width:16px; height:16px; border-radius:4px; background:#f1f5f9;"></div>
          <div style="width:16px; height:16px; border-radius:4px; background:rgba(245, 158, 11, 0.2);"></div>
          <div style="width:16px; height:16px; border-radius:4px; background:rgba(245, 158, 11, 0.5);"></div>
          <div style="width:16px; height:16px; border-radius:4px; background:rgba(245, 158, 11, 0.8);"></div>
          <div style="width:16px; height:16px; border-radius:4px; background:rgba(245, 158, 11, 1);"></div>
        </div>
        <span>Nhiều</span>
      </div>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error('Heatmap error:', err);
    container.innerHTML = '<div style="text-align:center; padding:3rem; color:#ef4444; font-size:1.2rem;">Lỗi tải dữ liệu. Vui lòng thử lại sau.</div>';
  }
};

// Khởi tạo Event Listener cho dropdown Heatmap
document.addEventListener("DOMContentLoaded", () => {
  const heatmapSelect = document.querySelector(".dom_select.heatmap_metric");
  if (!heatmapSelect) return;

  const ul = heatmapSelect.querySelector(".dom_select_show");
  const selectedText = heatmapSelect.querySelector(".dom_selected");
  const items = ul.querySelectorAll("li");
  const hiddenInput = document.getElementById("heatmap_metric_select");

  heatmapSelect.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".dom_select_show.active").forEach(el => {
      if (el !== ul) el.classList.remove("active");
    });
    ul.classList.toggle("active");
  });

  items.forEach(li => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = li.getAttribute("data-view");
      const text = li.querySelector("span:not(.radio_box)").innerText;
      
      items.forEach(item => {
        item.classList.remove("active");
        const radio = item.querySelector(".radio_box");
        if (radio) radio.classList.remove("active");
      });
      li.classList.add("active");
      const activeRadio = li.querySelector(".radio_box");
      if (activeRadio) activeRadio.classList.add("active");
      
      selectedText.innerText = text;
      hiddenInput.value = val;
      ul.classList.remove("active");

      if (window.renderHeatmap) window.renderHeatmap();
    });
  });
});
