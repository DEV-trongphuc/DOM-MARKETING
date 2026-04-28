/**
 * DOM Settings Sync — Client module
 * Reads settings from Google Sheets on load.
 * Writes happen silently in background after UI is already updated.
 */

const SETTINGS_SYNC_URL =
    typeof window.SETTINGS_SHEET_URL === "string" && window.SETTINGS_SHEET_URL
        ? window.SETTINGS_SHEET_URL
        : null;

const SYNC_KEYS = [
    "dom_brand_filters",
    "dom_view_presets",
    "dom_column_config",
    "goal_keywords",
    "goal_chart_mode",
    "dom_summary_metrics",
];

// ── Workspace Scoped LocalStorage ───────────────────────────────────
window.getWorkspaceSlug = () => new URLSearchParams(window.location.search).get('slug') || window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0] || 'default';

window.domGetItem = function(key) {
    const accId = typeof ACCOUNT_ID !== 'undefined' ? ACCOUNT_ID : '';
    const slugKey = `${key}_${window.getWorkspaceSlug()}_${accId}`;
    const val = localStorage.getItem(slugKey);
    if (val !== null) return val;
    
    // Migration: try old workspace-scoped key
    const oldSlugKey = `${key}_${window.getWorkspaceSlug()}`;
    const oldVal1 = localStorage.getItem(oldSlugKey);
    if (oldVal1 !== null) {
        localStorage.setItem(slugKey, oldVal1);
        return oldVal1;
    }

    // Migration: fallback to old global key if exists
    const oldVal2 = localStorage.getItem(key);
    if (oldVal2 !== null) {
        localStorage.setItem(slugKey, oldVal2);
        return oldVal2;
    }
    return null;
};

window.domSetItem = function(key, value) {
    const accId = typeof ACCOUNT_ID !== 'undefined' ? ACCOUNT_ID : '';
    const slugKey = `${key}_${window.getWorkspaceSlug()}_${accId}`;
    localStorage.setItem(slugKey, value);
};

// ── Core helpers ────────────────────────────────────────────────────

async function _apiGetSettings() {
    const url = window.APP_CONFIG?.SAAS_API_URL;
    const slug = window.getWorkspaceSlug();
    const accId = typeof ACCOUNT_ID !== 'undefined' ? ACCOUNT_ID : '';
    const email = window._currentUser?.email || '';

    if (!url || !slug || !accId) return null;
    try {
        const res = await fetch(`${url}?action=auth_load_dashboard_settings&slug=${encodeURIComponent(slug)}&account_id=${encodeURIComponent(accId)}&email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.ok ? (json.settings || {}) : null;
    } catch (err) {
        console.warn("Settings load failed:", err.message);
        return null;
    }
}

async function _apiPostSetting(key, value) {
    const url = window.APP_CONFIG?.SAAS_API_URL;
    const slug = window.getWorkspaceSlug();
    const accId = typeof ACCOUNT_ID !== 'undefined' ? ACCOUNT_ID : '';
    const email = window._currentUser?.email || '';

    if (!url || !slug || !accId) return;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "auth_save_dashboard_settings",
                slug: slug,
                account_id: accId,
                email: email,
                setting_key: key,
                setting_value: value
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Unknown");
    } catch (err) {
        // Re-throw so callers can catch and show error toast
        throw err;
    }
}

// ── Apply loaded value to global state ─────────────────────────────

function _applyToGlobal(key, value) {
    switch (key) {
        case "dom_brand_filters":
            // loadBrandSettings() reads from localStorage — already written before this call
            break;
        case "dom_view_presets":
            // loadViewPresets() reads from localStorage — already written by caller
            break;
        case "dom_column_config":
            if (value && typeof value === "object") {
                if (Array.isArray(value.activeColumns))
                    window.ACTIVE_COLUMNS = value.activeColumns.slice(0, 15);
                if (Array.isArray(value.customMetrics))
                    window.CUSTOM_METRICS = value.customMetrics;
            }
            break;
        case "goal_keywords":
            if (Array.isArray(value)) window.GOAL_KEYWORDS = value;
            break;
        case "goal_chart_mode":
            if (typeof value === "string") window.GOAL_CHART_MODE = value;
            break;
        case "dom_summary_metrics":
            if (Array.isArray(value)) window.SUMMARY_METRICS = value;
            break;
    }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Called once on startup.
 * Loads all settings from Sheet (falls back to localStorage silently).
 */
window.initSettingsSync = async function () {
    const apiData = await _apiGetSettings();

    SYNC_KEYS.forEach((key) => {
        let value = apiData?.[key];

        // Fall back to localStorage if API has nothing for this key
        if (value === undefined || value === null) {
            try {
                const ls = window.domGetItem(key);
                if (ls !== null) value = JSON.parse(ls);
            } catch (_) { }
        }

        if (value === undefined || value === null) return;

        // Write to localStorage so existing code (loadBrandSettings etc.) can read it
        try { 
            const toSave = typeof value === 'string' ? value : JSON.stringify(value);
            window.domSetItem(key, toSave); 
        } catch (_) { }

        // Apply to in-memory globals
        _applyToGlobal(key, value);
    });

    // Refresh brand dropdown after settings applied
    if (typeof updateBrandDropdownUI === "function") updateBrandDropdownUI();

    // Sync column settings into ACTIVE_COLUMNS / CUSTOM_METRICS
    if (typeof loadColumnConfig === "function") loadColumnConfig();

    // Refresh preset dropdown
    if (typeof renderPresetDropdown === "function") renderPresetDropdown();

    // Sync goal chart toggle label
    const modeLabel = document.getElementById("goal_mode_label");
    if (modeLabel && typeof GOAL_CHART_MODE !== "undefined") {
        modeLabel.textContent = GOAL_CHART_MODE === "brand" ? "Keyword" : "Brand";
    }
};

/**
 * Save brand settings silently in background.
 * UI must already be updated by caller before calling this.
 */
window.saveBrandSettingsSync = function (brands) {
    return _apiPostSetting("dom_brand_filters", brands);
};

/**
 * Save column config silently in background.
 */
window.saveColumnConfigSync = function (config) {
    return _apiPostSetting("dom_column_config", config);
};

/**
 * Save goal keywords + chart mode silently in background.
 */
window.saveGoalSettingsSync = function (keywords, mode) {
    // Save them separately
    _apiPostSetting("goal_keywords", keywords).catch(()=>{});
    return _apiPostSetting("goal_chart_mode", mode);
};

/**
 * Save view presets silently in background.
 */
window.saveViewPresetsSync = function (presets) {
    return _apiPostSetting("dom_view_presets", presets);
};

/**
 * Save summary metrics silently in background.
 */
window.saveSummaryMetricsSync = function (metrics) {
    return _apiPostSetting("dom_summary_metrics", metrics);
};
