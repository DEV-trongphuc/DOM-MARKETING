/**
 * @file alerts.js
 * @description Trung tâm xử lý cảnh báo tự động cho DOM Meta Reports
 * Tập trung vào: Creative Fatigue (Mức độ kiệt quệ nội dung) & Wasted Spend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Đóng panel khi click ra ngoài
  document.addEventListener('click', (e) => {
    const btn = document.getElementById('alert_notifications_btn');
    const panel = document.getElementById('alert_panel_container');
    if (panel && panel.style.display === 'flex') {
      if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
        panel.style.display = 'none';
      }
    }
  });
});

window.toggleAlertPanel = function() {
  const panel = document.getElementById('alert_panel_container');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }
};

/**
 * Quét toàn bộ dữ liệu _ALL_CAMPAIGNS để tìm các Ads có vấn đề
 * Gọi hàm này sau khi dashboard đã load xong dữ liệu (ví dụ ở dashboard_charts.js)
 */
window.analyzeCampaignAlerts = function() {
  if (!window._ALL_CAMPAIGNS || !Array.isArray(window._ALL_CAMPAIGNS)) return;

  const alerts = [];
  const THRESHOLD_FREQ = 3.0; // Tần suất > 3
  const THRESHOLD_CTR = 1.0;  // CTR < 1%
  const THRESHOLD_SPEND_NO_RESULT = 200000; // Tiêu > 200k chưa có kết quả (tạm tính theo đơn vị VND hoặc tương đối)

  window._ALL_CAMPAIGNS.forEach(campaign => {
    // Chỉ kiểm tra các campaign đang active (tùy chọn: có thể kiểm tra cả paused)
    if ((campaign.status || "").toLowerCase() !== "active") return;

    if (campaign.adsets && Array.isArray(campaign.adsets)) {
      campaign.adsets.forEach(adset => {
        if ((adset.status || "").toLowerCase() !== "active") return;

        if (adset.ads && Array.isArray(adset.ads)) {
          adset.ads.forEach(ad => {
            if ((ad.status || "").toLowerCase() !== "active") return;

            // Lấy metrics từ insights của ad
            const insights = ad.insights && ad.insights.data && ad.insights.data[0] ? ad.insights.data[0] : null;
            if (!insights) return;

            const spend = parseFloat(insights.spend || 0);
            const impressions = parseInt(insights.impressions || 0, 10);
            const reach = parseInt(insights.reach || 0, 10);
            const clicks = parseInt(insights.clicks || 0, 10);
            
            // Tính số lượng Purchase hoặc Message để đo Wasted Spend
            let totalResults = 0;
            if (insights.actions && Array.isArray(insights.actions)) {
              insights.actions.forEach(act => {
                if (['purchase', 'onsite_conversion.purchase', 'omni_purchase'].includes(act.action_type)) {
                  totalResults += parseInt(act.value || 0, 10);
                } else if (['onsite_conversion.messaging_conversation_started_7d', 'messages', 'messaging_conversation_started_7d'].includes(act.action_type)) {
                  totalResults += parseInt(act.value || 0, 10);
                } else if (['lead', 'onsite_conversion.lead_grouped'].includes(act.action_type)) {
                  totalResults += parseInt(act.value || 0, 10);
                }
              });
            }

            const frequency = reach > 0 ? (impressions / reach) : 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

            // Kiểm tra Kiệt quệ Nội dung (Creative Fatigue)
            if (spend > 50000 && frequency >= THRESHOLD_FREQ && ctr < THRESHOLD_CTR) {
              alerts.push({
                type: 'fatigue',
                level: 'warning',
                adName: ad.name,
                campaignName: campaign.name,
                message: `Tần suất cao (${frequency.toFixed(2)}) nhưng CTR thấp (${ctr.toFixed(2)}%). Đề xuất: Thay đổi nội dung sáng tạo hoặc tắt quảng cáo này.`,
                spend: spend
              });
            }

            // Kiểm tra Wasted Spend (Đốt tiền rỗng)
            if (spend >= THRESHOLD_SPEND_NO_RESULT && totalResults === 0) {
              alerts.push({
                type: 'wasted',
                level: 'danger',
                adName: ad.name,
                campaignName: campaign.name,
                message: `Đã chi tiêu ${window.formatMoney ? window.formatMoney(spend) : spend} nhưng chưa thu được bất kỳ chuyển đổi (Purchase/Message/Lead) nào. Đề xuất: Tạm dừng để xem xét lại Target/Content.`,
                spend: spend
              });
            }
          });
        }
      });
    }
  });

  renderAlerts(alerts);
};

function renderAlerts(alerts) {
  const badge = document.getElementById('alert_badge');
  const listContent = document.getElementById('alert_list_content');
  if (!badge || !listContent) return;

  if (alerts.length === 0) {
    badge.style.display = 'none';
    listContent.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:#94a3b8; font-size:1.2rem;"><i class="fa-solid fa-check-circle" style="font-size:3rem; color:#10b981; margin-bottom:1rem;"></i><br>Chiến dịch của bạn đang hoạt động ổn định, không có cảnh báo nào.</div>`;
    return;
  }

  // Sắp xếp cảnh báo ưu tiên danger trước, sau đó theo spend giảm dần
  alerts.sort((a, b) => {
    if (a.level === 'danger' && b.level !== 'danger') return -1;
    if (a.level !== 'danger' && b.level === 'danger') return 1;
    return b.spend - a.spend;
  });

  badge.style.display = 'block';
  badge.textContent = alerts.length > 99 ? '99+' : alerts.length;

  let html = '';
  alerts.forEach(alert => {
    const iconColor = alert.level === 'danger' ? '#ef4444' : '#f59e0b';
    const iconClass = alert.type === 'fatigue' ? 'fa-solid fa-eye-low-vision' : 'fa-solid fa-fire-burner';
    const bgColor = alert.level === 'danger' ? '#fee2e2' : '#fef3c7';
    const borderColor = alert.level === 'danger' ? '#fca5a5' : '#fcd34d';

    html += `
      <div style="background:#fff; border:1px solid ${borderColor}; border-left:4px solid ${iconColor}; border-radius:8px; padding:1.2rem; display:flex; gap:1.2rem; align-items:flex-start;">
        <div style="background:${bgColor}; color:${iconColor}; width:3.6rem; height:3.6rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.4rem;">
          <i class="${iconClass}"></i>
        </div>
        <div style="flex:1; min-width:0;">
          <p style="margin:0 0 0.4rem 0; font-size:1.3rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${alert.adName}">${alert.adName}</p>
          <p style="margin:0 0 0.8rem 0; font-size:1.1rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-layer-group" style="margin-right:4px;"></i> ${alert.campaignName}</p>
          <p style="margin:0; font-size:1.2rem; color:#334155; line-height:1.4;">${alert.message}</p>
        </div>
      </div>
    `;
  });

  listContent.innerHTML = html;
}
