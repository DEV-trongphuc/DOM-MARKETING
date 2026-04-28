/**
 * Theme Toggle logic (Light / Dark Mode)
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Khôi phục theme từ localStorage khi tải trang
    const savedTheme = localStorage.getItem("dom_theme");
    if (savedTheme === "dark") {
        document.body.setAttribute("data-theme", "dark");
    }

    // 2. Gắn sự kiện cho nút Toggle (nếu có)
    const toggleBtn = document.getElementById("theme_toggle_btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleTheme);
    }
});

function toggleTheme() {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    
    if (isDark) {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("dom_theme", "light");
    } else {
        document.body.setAttribute("data-theme", "dark");
        localStorage.setItem("dom_theme", "dark");
    }

    // Gửi event để Chart.js cập nhật màu (nếu cần thiết)
    window.dispatchEvent(new Event("themeChanged"));
}

// Lắng nghe theme change để cập nhật màu Chart.js (nếu sử dụng Chart.js toàn cầu)
window.addEventListener("themeChanged", () => {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#cbd5e1" : "#666666";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    // Cập nhật mặc định cho Chart.js nếu thư viện Chart tồn tại
    if (window.Chart && window.Chart.defaults) {
        window.Chart.defaults.color = textColor;
        window.Chart.defaults.scale.grid.color = gridColor;
        window.Chart.defaults.scale.grid.borderColor = gridColor;

        // Force redraw tất cả các biểu đồ đang có trên trang
        for (let id in Chart.instances) {
            let chart = Chart.instances[id];
            
            // Cập nhật text color cho scales
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    chart.options.scales.x.ticks.color = textColor;
                    chart.options.scales.x.grid.color = gridColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.ticks.color = textColor;
                    chart.options.scales.y.grid.color = gridColor;
                }
            }
            // Cập nhật legend
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            
            chart.update();
        }
    }
});
