/**
 * DOM META - CENTRAL CONFIGURATION (JAVASCRIPT)
 * Tập trung tất cả Token, ID, API URL tại đây để dễ dàng cài đặt
 */

window.APP_CONFIG = {
    // 1. Meta API Settings (Được load động qua SaaS Router)
    META_TOKEN: "",
    
    // ID tài khoản (Được load động)
    ACCOUNT_ID: "",
    ALLOWED_ACCOUNTS: [],

    // 2. Google Integration (Cài đặt Google Report & Ads)
    GOOGLE_CLIENT_ID: "641158233158-nsg8a8tdsj3fdgb34dc9tugm8god7tho.apps.googleusercontent.com",
    
    // URL của Google Apps Script (Deploy as Web App)
    GOOGLE_SHEET_API_URL: "https://script.google.com/macros/s/AKfycbzpl49TWIpHkcKNd0WRURLVOZGreY_lEYwq8COqWzuiY4TcOtzvelaIvTJpaz9tYQnYcA/exec",

    // 3. Backend API (Cài đặt Database API)
    BACKEND_API_URL: "https://meta.domation.net/api/index.php", // Không dùng nữa nhưng giữ cho tương thích ngược
    SAAS_API_URL: "https://meta.domation.net/api/index.php", // API SaaS chính

    // 4. Feature Toggles
    GOOGLE_ADS_SETUP: true
};
