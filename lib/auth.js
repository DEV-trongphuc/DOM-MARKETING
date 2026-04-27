/**
 * auth.js — Google OAuth + User Access Control
 * Requires token.js: window.GOOGLE_CLIENT_ID = "...apps.googleusercontent.com"
 * USERS sheet: email | name | role | status | addedAt | requestAt
 * Roles: admin | viewer   |   Status: active | request | rejected
 */
(function () {
    "use strict";

    const CLIENT_ID = window.GOOGLE_CLIENT_ID || "";
    const SESSION_KEY = "dom_auth_v1";
    const PENDING_KEY = "dom_pending_v1";
    const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 ngày

    // Admin mặc định dự phòng (Super Admin)
    const DEFAULT_ADMINS = ["dom.marketing.vn@gmail.com"];

    window._currentUser = null;
    let _authResolve;
    window._authReady = new Promise(r => { _authResolve = r; });

    function _jwt(token) {
        try {
            const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch { return null; }
    }

    function _saveSession(u) { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ u, ts: Date.now() })); } catch (_) { } }
    function _loadSession() {
        try {
            const d = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
            if (!d || Date.now() - d.ts > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
            return d.u;
        } catch { return null; }
    }
    function _clearSession() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PENDING_KEY);
        window._currentUser = null;
    }

    function _savePending(u) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(u)); } catch (_) { } }
    function _loadPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch { return null; } }
    function _clearPending() { localStorage.removeItem(PENDING_KEY); }

    // ── SAAS API ──────────────────────────────────────────────────────
    function _getTenantSlug() {
        let slug = window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0];
        if (!slug) slug = window.location.search.substring(1).replace('slug=', '');
        return slug;
    }

    async function _saasApi(action, payload = {}) {
        const url = window.APP_CONFIG?.SAAS_API_URL || "https://meta.domation.net/api/index.php";
        try {
            const slug = _getTenantSlug();
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, slug, ...payload })
            });
            return await res.json();
        } catch (e) {
            console.warn("[saas auth]", e);
            return { ok: false, error: e.message };
        }
    }

    window._everyoneViewEnabled = false;

    // ── Overlay ───────────────────────────────────────────────────────
    let _ov = null;
    function _overlay() {
        if (document.getElementById("_auth_ov")) return;
        const el = document.createElement("div");
        el.id = "_auth_ov";
        el.style.cssText = "position:fixed;inset:0;z-index:999998;background:linear-gradient(135deg,#f8f9fa 0%,#fff8e6 100%);display:flex;align-items:center;justify-content:center;font-family:'Roboto',sans-serif;transition:opacity .4s;";
        el.innerHTML = `<div id="_auth_box" style="width:min(90vw,460px);"></div>`;
        document.body.appendChild(el);
        _ov = el;
    }
    function _html(h) { const b = document.getElementById("_auth_box"); if (b) b.innerHTML = h; }
    function _hide() {
        if (!_ov) return;
        _ov.style.opacity = "0"; _ov.style.pointerEvents = "none";
        setTimeout(() => { _ov?.remove(); _ov = null; }, 420);
    }

    // ── Screens ───────────────────────────────────────────────────────
    const _card = (body) => `<div style="background:#fff;border-radius:2rem;padding:3.2rem;border:1.5px solid #e2e8f0;box-shadow:0 20px 60px rgba(0,0,0,.09);">${body}</div>`;
    const _icon = (ico, bg, size = "2.8rem") => `<div style="width:5.6rem;height:5.6rem;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;margin:0 auto 1.6rem;"><i class="${ico}" style="color:#fff;font-size:${size};"></i></div>`;
    const _title = (t, s) => `<h2 style="color:#1e293b;font-size:2rem;font-weight:800;margin-bottom:.6rem;text-align:center;">${t}</h2><p style="color:#64748b;font-size:1.3rem;line-height:1.7;text-align:center;margin-bottom:2rem;">${s}</p>`;
    const _outBtn = () => `<button onclick="window._signOut()" style="width:100%;margin-top:.8rem;background:#f1f5f9;color:#64748b;border:none;padding:1rem;border-radius:1rem;font-size:1.3rem;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</button>`;

    function _showLoading() {
        _html(_card(`<div style="text-align:center;color:#64748b;">
            <div style="width:4rem;height:4rem;border-radius:50%;border:3px solid #e2e8f0;border-top-color:#ffa900;animation:_spin .8s linear infinite;margin:0 auto 1.6rem;"></div>
            Đang kiểm tra quyền truy cập...
            <style>@keyframes _spin{to{transform:rotate(360deg)}}</style></div>`));
    }

    function _showSignIn() {
        if (!CLIENT_ID) {
            _html(_card(`${_icon("fa-solid fa-triangle-exclamation", "linear-gradient(135deg,#f59e0b,#d88200)")}
                ${_title("Chưa cấu hình Google Client ID", `Thêm <code style="background:#fef9c3;padding:.2rem .5rem;border-radius:.4rem;color:#92400e;">window.GOOGLE_CLIENT_ID</code> vào <b>token.js</b>`)}
                <button onclick="window._skipAuth()" style="width:100%;background:linear-gradient(135deg,#ffa900,#d88200);color:#fff;border:none;padding:1.1rem;border-radius:1rem;font-size:1.35rem;font-weight:700;cursor:pointer;">Bỏ qua (Dev mode)</button>`));
            return;
        }
        _html(_card(`
            <div style="display:flex; align-items:center; justify-content:center; gap:1.2rem; margin-bottom:0.5rem; transform: scale(1.1); margin-top: 0.5rem;">
                <img src="http://localhost:3000/imgs/ICON.png" alt="DOMATION Logo" style="width: 4.8rem; height: 4.8rem; object-fit: contain; flex-shrink: 0;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2991/2991148.png'">
                <div style="display: flex; flex-direction: column; justify-content: center; text-align: left;">
                    <h1 style="margin: 0; font-size: 2.8rem; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.02em; text-align: left;">DOMATION</h1>
                    <p style="margin: 0.4rem 0 0 0; font-size: 0.9rem; font-weight: 800; color: #64748b; line-height: 1; letter-spacing: 0.15em; display: flex; gap: 0.4rem; text-transform: uppercase;">
                        <span style="color: #f59e0b;">/</span> REALTIME META REPORT
                    </p>
                </div>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:1.3rem;margin-bottom:2.5rem;margin-top:1.5rem;">Đăng nhập để tiếp tục</p>
            <div style="border-top:1.5px solid #f1f5f9;margin-bottom:2rem;"></div>
            <div id="_gsi_wrap" style="display:flex;justify-content:center;margin-bottom:1.2rem;"></div>
            <p style="text-align:center;color:#cbd5e1;font-size:1.1rem;">Chỉ tài khoản được cấp phép mới có thể đăng nhập</p>`));
        setTimeout(() => {
            if (typeof google !== "undefined" && google.accounts) {
                google.accounts.id.initialize({ client_id: CLIENT_ID, callback: _handleCredential, auto_select: false, ux_mode: "popup" });
                google.accounts.id.renderButton(document.getElementById("_gsi_wrap"), { theme: "outline", size: "large", width: 380, text: "signin_with", shape: "pill" });
                google.accounts.id.prompt();
            }
        }, 120);
    }

    function _maskedAdmin() {
        // Lấy email admin đầu tiên, che phần trước @ : 3 ký tự + "..." + phần còn lại
        const adminEmail = DEFAULT_ADMINS[0] || "";
        if (!adminEmail) return "Admin";
        const [local, domain] = adminEmail.split("@");
        const masked = local.slice(0, 3) + "..." + (domain ? "@" + domain : "");
        return masked;
    }

    let _pendingRefreshTimer = null; // timer auto-refresh pending screen

    function _showPending(email) {
        const adminLabel = _maskedAdmin();

        // Hiển thị thời gian đã chờ dựa vào requestAt (nếu có)
        const pendingData = _loadPending();
        let waitHtml = '';
        if (pendingData?.requestAt) {
            try {
                // requestAt dạng vi-VN: "02/03/2026, 20:00:00"
                const reqTime = new Date(pendingData.requestAt.replace(/(\.\d+)?$/, ''));
                if (!isNaN(reqTime)) {
                    const diffMs = Date.now() - reqTime.getTime();
                    const diffMin = Math.round(diffMs / 60000);
                    const diffText = diffMin < 1 ? 'vừa xong' :
                        diffMin < 60 ? `${diffMin} phút trước` :
                            `${Math.round(diffMin / 60)} giờ trước`;
                    waitHtml = `<p style="font-size:1.1rem;color:#94a3b8;margin-top:.8rem;">Yêu cầu gửi lúc ${pendingData.requestAt} (${diffText})</p>`;
                }
            } catch (_) { }
        }

        _html(_card(`${_icon("fa-solid fa-clock", "linear-gradient(135deg,#ffa900,#d88200)")}
            ${_title("Đang chờ phê duyệt", `Yêu cầu của <b style="color:#ffa900;">${email}</b> đang chờ Admin xét duyệt.<br><span style="font-size:1.1rem;color:#94a3b8;margin-top:.5rem;display:block;">Vui lòng chờ phản hồi từ <b style="color:#64748b;">${adminLabel}</b></span>`)}
            ${waitHtml}
            <button onclick="window._checkPendingNow()" style="width:100%;background:#f1f5f9;color:#475569;border:none;padding:1rem;border-radius:1rem;font-size:1.3rem;cursor:pointer;margin-bottom:.5rem;transition:background .15s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
              <i class="fa-solid fa-rotate-right"></i> Kiểm tra lại ngay
            </button>
            ${_outBtn()}`));

        // Auto-refresh mỗi 30 giây
        clearInterval(_pendingRefreshTimer);
        _pendingRefreshTimer = setInterval(async () => {
            if (document.visibilityState !== 'visible') return;
            const users = await _api();
            const found = (users || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
            if (found?.status === 'active') {
                clearInterval(_pendingRefreshTimer);
                const pic = _loadPending()?.picture || ''; // capture trước khi clear
                _clearPending();
                _grantAccess({ email: found.email, name: found.name || email, picture: pic, role: found.role, status: 'active' });
            } else if (!found || found.status === 'rejected') {
                clearInterval(_pendingRefreshTimer);
                const p = _loadPending() || { email, name: '', picture: '' }; // capture trước khi clear
                _clearPending();
                _showDenied(p.email, p.name, p.picture);
            }
        }, 30000);
    }

    window._checkPendingNow = async function () {
        const pending = _loadPending();
        if (!pending?.email) return;
        const btn = document.querySelector('[onclick="window._checkPendingNow()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang kiểm tra...'; }
        const users = await _api();
        const found = (users || []).find(u => (u.email || '').toLowerCase() === pending.email.toLowerCase());
        if (found?.status === 'active') {
            clearInterval(_pendingRefreshTimer);
            _clearPending();
            _grantAccess({ email: found.email, name: found.name || pending.email, picture: pending.picture || '', role: found.role, status: 'active' });
        } else if (found?.status === 'request') {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Kiểm tra lại ngay'; }
            if (typeof showToast === 'function') showToast('⏳ Vẫn đang chờ admin duyệt...');
        } else {
            clearInterval(_pendingRefreshTimer);
            _clearPending();
            _showDenied(pending.email, pending.name, pending.picture);
        }
    };


    function _showDenied(email, name, pic) {
        const esc = (s) => (s || "").replace(/'/g, "\\'");
        _html(_card(`
            <div style="display:flex;align-items:center;gap:1.2rem;background:#f8fafc;border-radius:1.2rem;padding:1.2rem 1.6rem;margin-bottom:2rem;border:1.5px solid #e2e8f0;">
                ${pic ? `<img src="${pic}" style="width:4rem;height:4rem;border-radius:50%;">` : `<div style="width:4rem;height:4rem;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user" style="color:#94a3b8;"></i></div>`}
                <div><p style="color:#1e293b;font-size:1.35rem;font-weight:600;margin:0;">${name || email}</p><p style="color:#64748b;font-size:1.2rem;margin:0;">${email}</p></div>
            </div>
            ${_icon("fa-solid fa-ban", "#ef4444")}
            ${_title("Không có quyền truy cập", "Tài khoản của bạn chưa được cấp quyền xem báo cáo này.")}
            <button id="_reqBtn" onclick="window._requestAccess('${esc(email)}','${esc(name)}','${esc(pic)}')" style="width:100%;background:linear-gradient(135deg,#ffa900,#d88200);color:#fff;border:none;padding:1.2rem;border-radius:1rem;font-size:1.4rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.7rem;box-shadow:0 4px 16px rgba(255,169,0,.3);">
                <i class="fa-solid fa-paper-plane"></i> Yêu cầu quyền truy cập</button>
            ${_outBtn()}`));
    }

    function _showRequested() {
        const adminLabel = _maskedAdmin();
        _html(_card(`
            ${_icon("fa-solid fa-paper-plane", "linear-gradient(135deg,#ffa900,#d88200)")}
            ${_title("Đã gửi yêu cầu!", `Yêu cầu đã được ghi nhận. Admin sẽ phê duyệt sớm nhất có thể.<br><span style="font-size:1.1rem;color:#94a3b8;margin-top:.5rem;display:block;">Phê duyệt bởi <b style="color:#64748b;">${adminLabel}</b></span>`)}
            ${_outBtn()}`));
    }

    // ── Auth Actions ──────────────────────────────────────────────────
    async function _handleCredential(resp) {
        console.log("[AUTH] Bat dau xu ly dang nhap Google...");
        const p = _jwt(resp.credential);
        if (!p) { console.error("[AUTH] Token Google khong hop le!"); return; }
        const { email, name, picture = "" } = p;
        console.log(`[AUTH] Email nhan duoc: ${email}`);
        _showLoading();

        // Đã xóa bypass DEFAULT_ADMINS để bắt buộc gọi auth_check lấy token.

        console.log("[AUTH] Dang goi API auth_check...");
        const check = await _saasApi('auth_check', { email });
        console.log("[AUTH] Phan hoi tu auth_check:", check);

        if (check.ok) {
            window._everyoneViewEnabled = check.is_public;
            
            if (check.status === 'active' || check.role === 'admin') {
                console.log(`[AUTH] Dang nhap thanh cong: Quyen ${check.role}. Nap token vao cau hinh.`);
                if (check.meta_token) window.APP_CONFIG.META_TOKEN = check.meta_token;
                if (check.ad_accounts) {
                    try { window.APP_CONFIG.ALLOWED_ACCOUNTS = JSON.parse(check.ad_accounts); } 
                    catch(e) { window.APP_CONFIG.ALLOWED_ACCOUNTS = check.ad_accounts; }
                }
                
                _saveSession(p);
                _grantAccess({ email, name, picture, role: check.role, status: 'active' });
                return;
            }
            
            if (check.is_public) {
                _saveSession(p);
                _grantAccess({ email, name, picture, role: "viewer", status: "active" });
                return;
            }

            if (check.status === 'request') {
                _savePending(p);
                _showPending(email);
                return;
            }

            if (check.status === 'rejected') {
                _showDenied(email, name, picture);
                return;
            }

            // Chưa có trong DB -> Show Denied và cho nút Request
            _savePending(p);
            _showDenied(email, name, picture);
        } else {
            alert("Lỗi xác thực: " + check.error);
        }
    }


    function _grantAccess(user) {
        window._currentUser = user;
        _saveSession(user);
        _hide();
        _authResolve();
        setTimeout(_renderChip, 600);
        setTimeout(_bgFetchUsers, 1200);
        // 🕒 Cập nhật lastLogin mỗi lần truy cập
        _updateLastLogin(user.email);
    }

    function _updateLastLogin(email) {
        if (email === "dev@local") return;  // 🔧 Bỏ qua dev skip session
        const now = new Date().toLocaleString("vi-VN");
        console.log("[auth] _updateLastLogin →", email, now);
        // Note: Không update lastLogin trên saas cho viewer nữa để đơn giản
    }

    // Background fetch — cập nhật cache không block UI
    window._usersCache = null;
    let _autoModalShown = false;  // chỉ auto mở 1 lần sau khi admin load trang
    async function _bgFetchUsers() {
        try {
            const me = window._currentUser;
            if (!me) return;
            if (me.isDevSkip) return;

            const isDefaultAdmin = DEFAULT_ADMINS.some(a => a.toLowerCase() === me.email.toLowerCase());

            const res = await _saasApi('auth_get_users', { admin_email: me.email });
            if (!res.ok && !isDefaultAdmin) {
                // If it's a viewer, we can't fetch users. We just check auth_check periodically.
                const check = await _saasApi('auth_check', { email: me.email });
                if (!check.ok || check.status !== "active") {
                    _clearSession();
                    location.reload();
                }
                return;
            }

            if (res.ok) {
                window._everyoneViewEnabled = res.is_public;
                const users = res.users;
                window._usersCache = users;
                _updateShareBadge(users);

                const isAdmin = me.role === "admin" || isDefaultAdmin;
                if (isAdmin && !_autoModalShown) {
                    const reqs = users.filter(u => u.status === "request");
                    if (reqs.length > 0) {
                        _autoModalShown = true;
                        // Đợi UI sẵn sàng rồi mới mở modal
                        setTimeout(async () => {
                            await window.openShareModal();
                            // Chuyển sang tab Yêu cầu
                            if (typeof window._stab === "function") window._stab("requests");
                        }, 800);
                    } else {
                        // Không có request → đánh dấu đã check để interval sau không mở nữa
                        _autoModalShown = true;
                    }
                }
            }
        } catch (_) { }
    }

    function _updateShareBadge(users) {
        if (window._currentUser?.role !== "admin") return;
        const reqs = (users || []).filter(u => u.status === "request").length;
        // Wrapper bên ngoài Share button (cần overflow:visible)
        const shareBtn = document.getElementById("share_url_btn");
        if (!shareBtn) return;
        // Đảm bảo thẻ wrapper có overflow visible
        const parent = shareBtn.parentElement;
        if (parent) parent.style.overflow = "visible";
        shareBtn.style.position = "relative";
        shareBtn.style.overflow = "visible";
        let badge = shareBtn.querySelector("._share_badge");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "_share_badge";
            badge.style.cssText = [
                "position:absolute", "top:-.55rem", "right:-.55rem",
                "background:#ef4444", "color:#fff", "border-radius:50%",
                "width:1.8rem", "height:1.8rem", "font-size:1rem", "font-weight:800",
                "display:flex", "align-items:center", "justify-content:center",
                "box-shadow:0 2px 6px rgba(239,68,68,.5)",
                "border:2px solid #fff", "z-index:10", "line-height:1",
            ].join(";");
            shareBtn.appendChild(badge);
        }
        badge.textContent = reqs;
        badge.style.display = reqs > 0 ? "flex" : "none";
    }

    // Tự động refresh mỗi 60 giây để cập nhật badge request
    setInterval(() => { if (document.visibilityState === 'visible') _bgFetchUsers(); }, 60000);

    window._requestAccess = async function (email, name, pic) {
        const btn = document.getElementById("_reqBtn");
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang gửi...'; }
        await _saasApi('auth_request', { email, name, picture: pic });
        // Lưu pending session — nhớ trạng thái giữa các lần load
        _savePending({ email, name, picture: pic });
        _showRequested();
    };

    window._signOut = function () {
        _clearSession();
        if (typeof google !== "undefined") google.accounts?.id?.disableAutoSelect();
        location.reload();
    };

    window._skipAuth = function () { _grantAccess({ email: "dev@local", name: "Developer", picture: "", role: "admin", status: "active", isDevSkip: true }); };

    // ── User chip in toolbar ──────────────────────────────────────────
    function _renderChip() {
        const u = window._currentUser; if (!u) return;
        const toolbar = document.querySelector(".dom_toolbar_right"); if (!toolbar) return;
        document.getElementById("_user_chip")?.remove();
        const chip = document.createElement("div");
        chip.id = "_user_chip";
        chip.style.cssText = "display:flex;align-items:center;gap:.8rem;padding:.4rem 1.2rem .4rem .6rem;background:#fff;border-radius:3rem;cursor:pointer;border:1.5px solid #e2e8f0;font-family:'Roboto',sans-serif;position:relative;transition:all .2s;flex-shrink:0;";
        chip.innerHTML = `
            ${u.picture ? `<img src="${u.picture}" style="width:3rem;height:3rem;border-radius:50%;">` : `<div style="width:3rem;height:3rem;border-radius:50%;background:linear-gradient(135deg,#ffa900,#d88200);display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user" style="color:#fff;font-size:1.2rem;"></i></div>`}
            <span style="font-size:1.2rem;font-weight:600;color:#374151;max-width:10rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.name?.split(" ").slice(-1)[0] || u.email.split("@")[0]}</span>
            <span style="padding:.2rem .7rem;border-radius:3rem;font-size:1rem;font-weight:700;background:${u.role === "admin" ? "linear-gradient(135deg,#ffa900,#d88200)" : "#f1f5f9"};color:${u.role === "admin" ? "#fff" : "#64748b"};">${u.role}</span>`;
        chip.addEventListener("click", (e) => {
            e.stopPropagation();
            if (document.getElementById("_chip_dd")) { document.getElementById("_chip_dd")?.remove(); return; }
            const dd = document.createElement("div");
            dd.id = "_chip_dd";
            dd.style.cssText = "position:absolute;top:calc(100% + .8rem);right:0;background:#fff;border-radius:1.2rem;box-shadow:0 12px 40px rgba(0,0,0,.15);border:1.5px solid #e2e8f0;z-index:9999;overflow:hidden;min-width:20rem;font-family:'Roboto',sans-serif;";
            dd.innerHTML = `
                <div style="padding:1.4rem 1.6rem;border-bottom:1px solid #f1f5f9;">
                    <p style="font-weight:700;font-size:1.3rem;color:#1e293b;margin:0;">${u.name || ""}</p>
                    <p style="font-size:1.1rem;color:#64748b;margin:0;">${u.email}</p>
                </div>
                <div onclick="window._signOut()" style="padding:1.1rem 1.6rem;cursor:pointer;display:flex;align-items:center;gap:.8rem;font-size:1.3rem;color:#ef4444;transition:background .15s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background=''">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
                </div>`;
            chip.appendChild(dd);
            setTimeout(() => document.addEventListener("click", function _c(e2) { if (!chip.contains(e2.target)) { dd.remove(); document.removeEventListener("click", _c); } }), 10);
        });
        toolbar.prepend(chip);
    }

    // ── Share Modal ───────────────────────────────────────────────────
    window.openShareModal = async function () {
        _buildShareModal();
        const modal = document.getElementById("_share_modal");
        if (modal) modal.style.display = "flex";
        // Dùng cache tắc thì (nếu có), sau đó refresh ngầm
        if (window._usersCache) {
            _renderUsers(window._usersCache);
            _bgFetchUsers().then(() => { if (window._usersCache) _renderUsers(window._usersCache); });
        } else {
            await _reloadUsers();
        }
    };

    function _buildShareModal() {
        if (document.getElementById("_share_modal")) return;
        const isAdmin = window._currentUser?.role === "admin";
        const evOn = window._everyoneViewEnabled;

        // Xây dựng link chia sẻ cực gọn chuẩn Path Routing (không còn dấu #)
        let basePath = window.location.pathname.replace(/\/$/, '') || "/";
        const params = new URLSearchParams();
        if (typeof startDate !== 'undefined' && startDate) params.set("since", startDate);
        if (typeof endDate !== 'undefined' && endDate) params.set("until", endDate);
        if (typeof CURRENT_CAMPAIGN_FILTER !== 'undefined' && CURRENT_CAMPAIGN_FILTER && CURRENT_CAMPAIGN_FILTER.toUpperCase() !== "RESET") {
            params.set("brand", CURRENT_CAMPAIGN_FILTER);
        }
        let paramStr = params.toString();
        const cleanHref = window.location.origin + basePath + (paramStr ? "?" + paramStr : "");

        const el = document.createElement("div");
        el.id = "_share_modal";
        el.style.cssText = "position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;font-family:'Roboto',sans-serif;";
        el.innerHTML = `
        <div style="background:#fff;border-radius:2rem;box-shadow:0 32px 80px rgba(0,0,0,.25);width:min(96vw,620px);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;animation:_sin .3s ease;">
          <style>
            @keyframes _sin{from{opacity:0;transform:translateY(20px)}}
            ._ev_toggle{position:relative;display:inline-block;width:4.4rem;height:2.4rem;flex-shrink:0;}
            ._ev_toggle input{opacity:0;width:0;height:0;}
            ._ev_slider{position:absolute;cursor:pointer;inset:0;background:#e2e8f0;border-radius:3rem;transition:.25s;}
            ._ev_slider:before{content:"";position:absolute;height:1.8rem;width:1.8rem;left:.3rem;bottom:.3rem;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
            input:checked + ._ev_slider{background:linear-gradient(135deg,#ffa900,#d88200);}
            input:checked + ._ev_slider:before{transform:translateX(2rem);}
            input:disabled + ._ev_slider{opacity:.5;cursor:not-allowed;}
            @keyframes _ev_spin{
              from { transform: translateY(-50%) rotate(0deg); }
              to   { transform: translateY(-50%) rotate(360deg); }
            }
            ._ev_loading ._ev_toggle{opacity:0;pointer-events:none;}
            ._ev_loading::after{
              content:"";position:absolute;right:2.4rem;top:50%;transform:translateY(-50%);
              width:2rem;height:2rem;border-radius:50%;
              border:2.5px solid rgba(255,169,0,.3);border-top-color:#ffa900;
              animation:_ev_spin .7s linear infinite;
            }
          </style>
          <!-- Header -->
          <div style="padding:2rem 2.4rem 1.4rem;border-bottom:1.5px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:1.2rem;">
              <div style="width:3.8rem;height:3.8rem;border-radius:.9rem;background:linear-gradient(135deg,#ffa900,#d88200);display:flex;align-items:center;justify-content:center;">
                <i class="fa-solid fa-users" style="color:#fff;font-size:1.7rem;"></i></div>
              <div>
                <h2 style="font-size:1.7rem;font-weight:800;color:#1e293b;margin:0;">Quản lý truy cập</h2>
                <p style="font-size:1.2rem;color:#64748b;margin:0;margin-top:5px;">Chia sẻ và phân quyền người dùng</p>
              </div>
            </div>
            <i class="fa-solid fa-xmark" onclick="document.getElementById('_share_modal').style.display='none'" style="cursor:pointer;font-size:2rem;color:#94a3b8;padding:.5rem;"></i>
          </div>
          <!-- Copy link -->
          <div style="padding:1.2rem 2.4rem;background:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;gap:.8rem;flex-shrink:0;">
            <input id="_slink" value="${cleanHref}" readonly style="flex:1;padding:.9rem 1.2rem;border:1.5px solid #e2e8f0;border-radius:.9rem;font-size:1.2rem;color:#475569;background:#fff;outline:none;">
            <button onclick="window._copyLink()" style="padding:.9rem 1.6rem;background:linear-gradient(135deg,#ffa900,#d88200);color:#fff;border:none;border-radius:.9rem;font-size:1.2rem;font-weight:700;cursor:pointer;white-space:nowrap;">
              <i class="fa-solid fa-copy"></i> Copy</button>
          </div>
          ${isAdmin ? `
          <!-- Everyone View toggle — chỉ admin thấy -->
          <div id="_ev_row" style="padding:1rem 2.4rem;background:#fffbeb;border-bottom:1.5px solid #fde68a;display:flex;align-items:center;gap:1.2rem;flex-shrink:0;position:relative;transition:opacity .2s,background .25s;">
            <i class="fa-solid fa-globe" style="color:#ffa900;font-size:1.4rem;"></i>
            <div style="flex:1;">
              <p style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0;">Chia sẻ link cho tất cả mọi người</p>
              <p style="font-size:1.1rem;color:#92400e;margin:0;" id="_ev_desc">${evOn ? '🔓 Bất kỳ ai có link đều có thể xem (không cần đăng nhập)' : '🔒 Chỉ tài khoản được cấp quyền mới xem được'}</p>
            </div>
            <label class="_ev_toggle" title="Bật/tắt chia sẻ công khai">
              <input type="checkbox" id="_ev_chk" ${evOn ? 'checked' : ''} onchange="window._toggleEveryoneView(this.checked)">
              <span class="_ev_slider"></span>
            </label>
          </div>
          <!-- Tabs -->
          <div id="_share_tabs" style="display:flex;border-bottom:1.5px solid #f1f5f9;flex-shrink:0;padding:0 2.4rem;">
            <button class="_stab" data-t="members" onclick="window._stab('members')" style="padding:1.1rem 1.8rem;border:none;background:transparent;font-size:1.3rem;font-weight:600;cursor:pointer;color:#ffa900;border-bottom:2.5px solid #ffa900;">
              <i class="fa-solid fa-user-group"></i> Thành viên</button>
            <button class="_stab" data-t="requests" onclick="window._stab('requests')" style="padding:1.1rem 1.8rem;border:none;background:transparent;font-size:1.3rem;font-weight:600;cursor:pointer;color:#94a3b8;border-bottom:2.5px solid transparent;">
              <i class="fa-solid fa-inbox"></i> Yêu cầu <span id="_rbadge" style="display:none;background:#ef4444;color:#fff;border-radius:3rem;padding:0 .6rem;font-size:1rem;margin-left:.3rem;"></span></button>
          </div>` : ""}
          <!-- Body -->
          <div style="flex:1;overflow-y:auto;">
            <div id="_tab_members" style="padding:1.8rem 2.4rem;display:block;">
              ${isAdmin ? `
              <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:1.2rem;padding:1.4rem;margin-bottom:1.6rem;">
                <p style="font-size:1.2rem;font-weight:700;color:#475569;margin-bottom:.9rem;"><i class="fa-solid fa-user-plus" style="color:#ffa900;"></i> Thêm thành viên</p>
                <div style="display:flex;gap:.7rem;align-items:stretch;">
                  <input id="_nadd" type="email" placeholder="email@gmail.com"
                    style="flex:1;padding:.95rem 1.1rem;border:1.5px solid #e2e8f0;border-radius:.8rem;font-size:1.2rem;outline:none;"
                    onfocus="this.style.borderColor='#ffa900'" onblur="this.style.borderColor='#e2e8f0'">
                  <div id="_role_dd_wrap" style="position:relative;flex-shrink:0;">
                    <button id="_role_dd_btn" onclick="window._toggleRoleDD(event)"
                      style="height:100%;min-height:4rem;display:flex;align-items:center;gap:.6rem;padding:.9rem 1.2rem;border:1.5px solid #e2e8f0;border-radius:.8rem;background:#fff;font-size:1.2rem;font-weight:600;cursor:pointer;color:#1e293b;transition:border .15s;white-space:nowrap;min-width:12rem;"
                      onmouseover="this.style.borderColor='#ffa900'" onmouseout="this.style.borderColor='#e2e8f0'">
                      <span id="_role_dd_icon" style="width:2rem;height:2rem;border-radius:.5rem;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">&#128100;</span>
                      <span id="_role_dd_label" style="flex:1;text-align:left;">Viewer</span>
                      <i class="fa-solid fa-chevron-down" style="color:#94a3b8;font-size:.95rem;"></i>
                    </button>
                    <div id="_role_dd_menu" style="display:none;position:absolute;top:calc(100% + .4rem);left:0;right:0;background:#fff;border-radius:1rem;border:1.5px solid #e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,.13);z-index:99999;overflow:hidden;">
                      <div onclick="window._selectRole('viewer')"
                        style="display:flex;align-items:center;gap:.9rem;padding:1rem 1.2rem;cursor:pointer;transition:background .12s;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <span style="width:2.8rem;height:2.8rem;border-radius:.6rem;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">&#128100;</span>
                        <div>
                          <p style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0;">Viewer</p>
                          <p style="font-size:1.05rem;color:#94a3b8;margin:0;">Chỉ xem báo cáo</p>
                        </div>
                      </div>
                      <div style="height:1px;background:#f1f5f9;"></div>
                      <div onclick="window._selectRole('admin')"
                        style="display:flex;align-items:center;gap:.9rem;padding:1rem 1.2rem;cursor:pointer;transition:background .12s;"
                        onmouseover="this.style.background='#fff8e6'" onmouseout="this.style.background=''">
                        <span style="width:2.8rem;height:2.8rem;border-radius:.6rem;background:linear-gradient(135deg,#ffa900,#d88200);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">&#128081;</span>
                        <div>
                          <p style="font-size:1.25rem;font-weight:700;color:#ffa900;margin:0;">Admin</p>
                          <p style="font-size:1.05rem;color:#94a3b8;margin:0;">Quản lý toàn quyền</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onclick="window._addUser()"
                    style="padding:.95rem 1.5rem;background:linear-gradient(135deg,#ffa900,#d88200);color:#fff;border:none;border-radius:.8rem;font-size:1.2rem;font-weight:700;cursor:pointer;white-space:nowrap;">
                    <i class="fa-solid fa-plus"></i> Thêm
                  </button>
                </div>
              </div>` : ""}
              <div id="_ulist"><div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;"></i></div></div>
            </div>
            ${isAdmin ? `<div id="_tab_requests" style="padding:1.8rem 2.4rem;display:none;"><div id="_rlist"><div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;"></i></div></div></div>` : ""}
          </div>
        </div>`;
        document.body.appendChild(el);
        el.addEventListener("click", e => { if (e.target === el) el.style.display = "none"; });
    }

    window._toggleEveryoneView = async function (enabled) {
        const chk = document.getElementById("_ev_chk");
        const desc = document.getElementById("_ev_desc");
        const row = document.getElementById("_ev_row");

        if (chk) chk.disabled = true;
        if (row) {
            row.classList.add("_ev_loading");
            row.style.opacity = ".55";
            row.style.pointerEvents = "none";
        }

        try {
            await _saasApi('auth_toggle_public', { admin_email: window._currentUser?.email, is_public: enabled });
            window._everyoneViewEnabled = enabled;

            if (desc) desc.innerHTML = enabled
                ? '🔓 Bất kỳ ai có link đều có thể xem (không cần đăng nhập)'
                : '🔒 Chỉ tài khoản được cấp quyền mới xem được';

            if (row) row.style.background = enabled ? "#fff7e0" : "#fffbeb";

            if (typeof showToast === "function")
                showToast(enabled ? '🔓 Đã bật chia sẻ link công khai' : '🔒 Đã tắt chia sẻ link công khai');

        } catch (e) {
            if (chk) chk.checked = !enabled;
            if (typeof showToast === "function") showToast('❌ Lỗi lưu cài đặt: ' + e.message);
        } finally {
            if (chk) chk.disabled = false;
            if (row) {
                row.classList.remove("_ev_loading");
                row.style.opacity = "1";
                row.style.pointerEvents = "";
            }
        }
    };

    window._stab = function (t) {
        document.querySelectorAll("._stab").forEach(b => {
            const a = b.dataset.t === t;
            b.style.color = a ? "#ffa900" : "#94a3b8";
            b.style.borderBottom = a ? "2.5px solid #ffa900" : "2.5px solid transparent";
        });
        ["members", "requests"].forEach(id => {
            const el = document.getElementById(`_tab_${id}`);
            if (el) el.style.display = id === t ? "block" : "none";
        });
    };

    window._copyLink = function () {
        navigator.clipboard.writeText(document.getElementById("_slink")?.value || location.href);
        if (typeof showToast === "function") showToast("✅ Đã copy link!");
    };

    async function _reloadUsers() {
        const u = window._currentUser;
        if (!u || u.role !== 'admin') return;
        
        // Hiệu ứng mờ khi đang tải lại
        const ul = document.getElementById("_ulist");
        const rl = document.getElementById("_rlist");
        if (ul) ul.style.opacity = "0.5";
        if (rl) rl.style.opacity = "0.5";
        
        const res = await _saasApi('auth_get_users', { admin_email: u.email });
        const users = res.ok ? res.users : [];
        window._usersCache = users;
        _updateShareBadge(users);
        _renderUsers(users);
        
        if (ul) ul.style.opacity = "1";
        if (rl) rl.style.opacity = "1";
    }

    function _renderUsers(all) {
        const active = all.filter(u => u.status === "active");
        const reqs = all.filter(u => u.status === "request");
        const rejected = all.filter(u => u.status === "rejected");
        const isAdmin = window._currentUser?.role === "admin";

        const badge = document.getElementById("_rbadge");
        if (badge) { badge.textContent = reqs.length; badge.style.display = reqs.length ? "inline" : "none"; }

        const ul = document.getElementById("_ulist");
        if (ul) {
            const list = [...active, ...rejected];
            ul.innerHTML = list.length ? list.map(u => _rowUser(u, isAdmin)).join("") :
                `<p style="text-align:center;color:#94a3b8;padding:2rem;font-size:1.3rem;">Chưa có thành viên</p>`;
        }
        const rl = document.getElementById("_rlist");
        if (rl) {
            rl.innerHTML = reqs.length ? reqs.map(_rowReq).join("") :
                `<div style="text-align:center;padding:3rem;">
                  <div style="font-size:3.5rem;margin-bottom:1rem;">\u2705</div>
                  <p style="font-size:1.4rem;font-weight:700;color:#10b981;margin:0;">Không còn yêu cầu nào!</p>
                  <p style="font-size:1.2rem;color:#94a3b8;margin:.4rem 0 0;">Tất cả yêu cầu đã được xử lý.</p>
                </div>`;
        }
    }

    function _rowUser(u, isAdmin) {
        const rc = u.role === "admin" ? "#ffa900" : "#64748b";
        const rb = u.role === "admin" ? "#fff8e6" : "#f1f5f9";
        const sc = u.status === "active" ? "#10b981" : "#ef4444";
        const sb = u.status === "active" ? "#ecfdf5" : "#fef2f2";
        const isSelf = (u.email || "").toLowerCase() === (window._currentUser?.email || "").toLowerCase();
        
        // Dùng thông tin thật của Google nếu là chính mình (Owner)
        if (isSelf && window._currentUser) {
            u.picture = window._currentUser.picture || u.picture;
            u.name = window._currentUser.name || u.name;
        }

        const initials = (u.name || u.email || "?")[0].toUpperCase();
        const avatarHtml = u.picture
            ? `<img src="${u.picture}" alt="" style="width:3.4rem;height:3.4rem;border-radius:50%;object-fit:cover;border:2px solid #f1f5f9;flex-shrink:0;" onerror="this.style.display='none'">`
            : `<div style="width:3.4rem;height:3.4rem;border-radius:50%;background:linear-gradient(135deg,#ffa900,#d88200);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:#fff;font-weight:800;font-size:1.3rem;">${initials}</span></div>`;
        
        const loginInfo = isSelf
            ? `<span style="font-size:1rem;color:#10b981;white-space:nowrap;"><i class="fa-solid fa-circle" style="font-size:.7rem;"></i> Đang trực tuyến</span>`
            : (u.lastLogin
                ? `<span style="font-size:1rem;color:#94a3b8;white-space:nowrap;"><i class="fa-solid fa-clock" style="font-size:.9rem;"></i> ${u.lastLogin}</span>`
                : `<span style="font-size:1rem;color:#cbd5e1;">Chưa đăng nhập</span>`);
        return `<div style="display:flex;align-items:center;gap:1rem;padding:1.1rem 0;border-bottom:1px solid #f1f5f9;">
          ${avatarHtml}
          <div style="flex:1;min-width:0;">
            <p style="font-size:1.25rem;font-weight:600;color:#1e293b;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.name || u.email}${isSelf ? ' <span style="background:#f1f5f9;color:#94a3b8;font-size:1rem;padding:.1rem .6rem;border-radius:3rem;font-weight:500;">Bạn</span>' : ""}</p>
            <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;">
              <p style="font-size:1.1rem;color:#64748b;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.email}</p>
              ${isAdmin ? loginInfo : ""}
            </div>
          </div>
          <span style="background:${rb};color:${rc};padding:.25rem .8rem;border-radius:3rem;font-size:1.05rem;font-weight:700;flex-shrink:0;">${u.role}</span>
          <span style="background:${sb};color:${sc};padding:.25rem .8rem;border-radius:3rem;font-size:1.05rem;font-weight:600;flex-shrink:0;">${u.status === "active" ? "Active" : "Rejected"}</span>
          ${isAdmin ? `<div style="display:flex;gap:.3rem;">
            ${!isSelf ? `<button onclick="window._toggleRole('${u.email}','${u.role}')" title="Đổi role"
              style="width:3rem;height:3rem;border-radius:.6rem;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;color:#64748b;font-size:1.1rem;"
              onmouseover="this.style.borderColor='#ffa900';this.style.color='#ffa900'"
              onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#64748b'">
              <i class="fa-solid fa-arrows-rotate"></i></button>` : ""}
            <button onclick="window._removeUser('${u.email}',this)" title="Xóa"
              style="width:3rem;height:3rem;border-radius:.6rem;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;color:#ef4444;font-size:1.1rem;"
              onmouseover="this.style.borderColor='#ef4444';this.style.background='#fef2f2'"
              onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#fff'">
              <i class="fa-solid fa-trash"></i></button>
          </div>` : ""}
        </div>`;
    }

    function _rowReq(u) {
        return `<div style="display:flex;align-items:center;gap:1rem;padding:1.3rem;background:#f8fafc;border-radius:1.1rem;margin-bottom:.8rem;border:1.5px solid #e2e8f0;">
          <div style="width:3.4rem;height:3.4rem;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#64748b;font-weight:800;font-size:1.3rem;">${(u.name || u.email || "?")[0].toUpperCase()}</span></div>
          <div style="flex:1;min-width:0;">
            <p style="font-size:1.25rem;font-weight:600;color:#1e293b;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.name || u.email}</p>
            <p style="font-size:1.1rem;color:#64748b;margin:0;">${u.email}</p>
            ${u.requestAt ? `<p style="font-size:1rem;color:#94a3b8;margin:0;">Yêu cầu lúc: ${u.requestAt}</p>` : ""}</div>
          <div style="display:flex;gap:.6rem;flex-shrink:0;">
            <button onclick="window._approveUser('${u.email}',this)"
              style="padding:.65rem 1.4rem;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:.7rem;font-size:1.2rem;font-weight:700;cursor:pointer;min-width:8rem;transition:opacity .2s;">
              <i class="fa-solid fa-check"></i> Duyệt</button>
            <button onclick="window._rejectUser('${u.email}',this)"
              style="padding:.65rem 1.2rem;background:#fef2f2;color:#ef4444;border:1.5px solid #fecaca;border-radius:.7rem;font-size:1.2rem;font-weight:700;cursor:pointer;min-width:8rem;transition:opacity .2s;">
              <i class="fa-solid fa-ban"></i> Từ chối</button>
          </div>
        </div>`;
    }
    // ── Custom role dropdown helpers ──────────────────────────────────
    window._selectedRole = "viewer";
    window._toggleRoleDD = function (e) {
        e.stopPropagation();
        const menu = document.getElementById("_role_dd_menu");
        if (!menu) return;
        const isOpen = menu.style.display === "block";
        menu.style.display = isOpen ? "none" : "block";
        if (!isOpen) {
            setTimeout(() => document.addEventListener("click", function _close() {
                menu.style.display = "none";
                document.removeEventListener("click", _close);
            }), 10);
        }
    };
    window._selectRole = function (role) {
        window._selectedRole = role;
        const lbl = document.getElementById("_role_dd_label");
        const icon = document.getElementById("_role_dd_icon");
        const menu = document.getElementById("_role_dd_menu");
        if (lbl) lbl.textContent = role === "admin" ? "Admin" : "Viewer";
        if (icon) {
            icon.innerHTML = role === "admin" ? "&#128081;" : "&#128100;";
            icon.style.background = role === "admin" ? "linear-gradient(135deg,#ffa900,#d88200)" : "#f1f5f9";
        }
        if (menu) menu.style.display = "none";
    };
    // ── Confirm Modal helper ─────────────────────────────────────────

    function _confirmModal(title, body, onConfirm, opts = {}) {
        document.getElementById("_cm_overlay")?.remove();
        const el = document.createElement("div");
        el.id = "_cm_overlay";
        el.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:'Roboto',sans-serif;";
        const okStyle = opts.danger
            ? "padding:.85rem 2rem;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:.9rem;font-size:1.3rem;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(239,68,68,.35);"
            : "padding:.85rem 2rem;background:linear-gradient(135deg,#ffa900,#d88200);color:#fff;border:none;border-radius:.9rem;font-size:1.3rem;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(255,169,0,.35);";
        const okLabel = opts.danger ? `<i class="fa-solid fa-trash"></i> Xóa` : "Xác nhận";
        el.innerHTML = `
          <div style="background:#fff;border-radius:1.6rem;padding:2.8rem;width:min(90vw,440px);box-shadow:0 24px 64px rgba(0,0,0,.2);animation:_cmin .2s ease;">
            <style>@keyframes _cmin{from{opacity:0;transform:scale(.95)}}</style>
            <h3 style="font-size:1.7rem;font-weight:800;color:#1e293b;margin:0 0 1rem;">${title}</h3>
            <div style="margin-bottom:2rem;">${body}</div>
            <div style="display:flex;gap:.8rem;justify-content:flex-end;">
              <button id="_cm_cancel" style="padding:.85rem 2rem;background:#f1f5f9;color:#64748b;border:none;border-radius:.9rem;font-size:1.3rem;font-weight:600;cursor:pointer;transition:background .15s;"
                onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Huỷ</button>
              <button id="_cm_ok" style="${okStyle}">${okLabel}</button>
            </div>
          </div>`;

        document.body.appendChild(el);
        const close = () => el.remove();
        el.addEventListener("click", e => { if (e.target === el) close(); });
        document.getElementById("_cm_cancel").addEventListener("click", close);
        document.getElementById("_cm_ok").addEventListener("click", async () => {
            const okBtn = document.getElementById("_cm_ok");
            const cancelBtn = document.getElementById("_cm_cancel");
            if (okBtn) {
                okBtn.disabled = true;
                okBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xử lý...`;
                okBtn.style.opacity = ".8";
            }
            if (cancelBtn) { cancelBtn.disabled = true; cancelBtn.style.opacity = ".5"; }
            await onConfirm();
            close();
        });
    }

    window._addUser = async function () {
        const email = document.getElementById("_nadd")?.value.trim();
        const role = window._selectedRole || "viewer";
        if (!email) return;
        // Loading state trên nút Thêm
        const addBtn = document.querySelector("button[onclick='window._addUser()']");
        if (addBtn) _btnLoading(addBtn, true, "Đang thêm...");
        try {
            await _saasApi('auth_update_user', { admin_email: window._currentUser?.email, target_email: email, action_type: 'add', role });
            document.getElementById("_nadd").value = "";
            window._selectRole("viewer");
            await _reloadUsers();
            if (typeof showToast === "function") showToast(`✅ Đã thêm ${email}`);
        } finally {
            if (addBtn) _btnLoading(addBtn, false);
        }
    };

    window._toggleRole = function (email, cur) {
        if (window._currentUser?.role !== "admin") return;
        const newRole = cur === "admin" ? "viewer" : "admin";
        const icon = newRole === "admin" ? "👑" : "👤";
        _confirmModal(
            `${icon} Đổi role thành <b>${newRole}</b>?`,
            `<span style="color:#64748b;font-size:1.25rem;">Tài khoản <b style="color:#1e293b;">${email}</b> sẽ được chuyển sang role <b style="color:${newRole === "admin" ? "#ffa900" : "#64748b"}">${newRole}</b>.</span>`,
            async () => {
                await _saasApi('auth_update_user', { admin_email: window._currentUser?.email, target_email: email, action_type: 'role', role: newRole });
                await _reloadUsers();
                if (typeof showToast === "function") showToast(`✅ Đã đổi ${email} → ${newRole}`);
            }
        );
    };

    window._removeUser = function (email, btnEl) {
        _confirmModal(
            `<span style="color:#ef4444;"><i class="fa-solid fa-trash"></i> Xóa thành viên?</span>`,
            `<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:1rem;padding:1.2rem 1.4rem;margin-bottom:.4rem;">
              <p style="font-size:1.25rem;color:#1e293b;margin:0;font-weight:600;">${email}</p>
              <p style="font-size:1.15rem;color:#94a3b8;margin:.3rem 0 0;">Tài khoản này sẽ bị xóa khỏi danh sách truy cập.</p>
            </div>`,
            async () => {
                _btnLoading(btnEl, true, "Đang xóa...");
                await _saasApi('auth_update_user', { admin_email: window._currentUser?.email, target_email: email, action_type: 'remove' });
                await _reloadUsers();
                if (typeof showToast === "function") showToast(`🗑️ Đã xóa ${email}`);
            },
            { danger: true }
        );
    };

    window._approveUser = async function (email, btnEl) {
        const row = btnEl?.closest("div[style*='padding:1.3rem']");
        const btns = row?.querySelectorAll("button");
        btns?.forEach(b => { b.disabled = true; b.style.opacity = ".5"; b.style.cursor = "not-allowed"; });
        const origHTML = btnEl?.innerHTML;
        if (btnEl) {
            btnEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Đang duyệt...`;
            btnEl.style.minWidth = btnEl.offsetWidth + 'px';
        }
        try {
            await _saasApi('auth_update_user', { admin_email: window._currentUser?.email, target_email: email, action_type: 'approve' });
            await _reloadUsers();
            if (typeof showToast === "function") showToast(`✅ Đã duyệt ${email}`);
        } catch (e) {
            btns?.forEach(b => { b.disabled = false; b.style.opacity = "1"; b.style.cursor = "pointer"; });
            if (btnEl && origHTML) btnEl.innerHTML = origHTML;
            if (typeof showToast === "function") showToast(`❌ Lỗi: ${e.message}`);
        }
    };

    window._rejectUser = async function (email, btnEl) {
        const row = btnEl?.closest("div[style*='padding:1.3rem']");
        const btns = row?.querySelectorAll("button");
        btns?.forEach(b => { b.disabled = true; b.style.opacity = ".5"; b.style.cursor = "not-allowed"; });
        const origHTML = btnEl?.innerHTML;
        if (btnEl) {
            btnEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Đang từ chối...`;
            btnEl.style.minWidth = btnEl.offsetWidth + 'px';
        }
        try {
            await _saasApi('auth_update_user', { admin_email: window._currentUser?.email, target_email: email, action_type: 'reject' });
            await _reloadUsers();
            if (typeof showToast === "function") showToast(`🗑️ Đã từ chối ${email}`);
        } catch (e) {
            btns?.forEach(b => { b.disabled = false; b.style.opacity = "1"; b.style.cursor = "pointer"; });
            if (btnEl && origHTML) btnEl.innerHTML = origHTML;
            if (typeof showToast === "function") showToast(`❌ Lỗi: ${e.message}`);
        }
    };

    function _rowLoading(email, action) {
        const rows = document.querySelectorAll("#_rlist > div");
        rows.forEach(row => {
            const emailEl = row.querySelector("p:nth-child(2)");
            if (!emailEl || emailEl.textContent.trim() !== email) return;
            const btns = row.querySelectorAll("button");
            btns.forEach(b => { b.disabled = true; b.style.opacity = ".5"; b.style.cursor = "not-allowed"; });
            const target = action === "approve"
                ? row.querySelector("button:first-of-type")
                : row.querySelector("button:last-of-type");
            if (target) target.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${action === "approve" ? "Đang duyệt..." : "Đang xóa..."}`;
        });
    }

    function _btnLoading(btn, on, label) {
        if (!btn) return;
        if (on) {
            btn._origHTML = btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = ".55";
            btn.style.cursor = "not-allowed";
            if (label) btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${label}`;
        } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            if (btn._origHTML) { btn.innerHTML = btn._origHTML; delete btn._origHTML; }
        }
    }

    // ── Bootstrap ─────────────────────────────────────────────────────
    async function _boot() {
        if (!CLIENT_ID && !window.APP_CONFIG?.SAAS_API_URL) { _authResolve(); return; }

        // Load public check ngầm
        const slug = _getTenantSlug();
        if (slug) {
            _saasApi('auth_check', { email: '' }).then(s => {
                if (s.ok) {
                    window._everyoneViewEnabled = s.is_public;
                    if (window._everyoneViewEnabled && !window._currentUser) {
                        console.log("[auth] 🌐 everyone_view = ON → bypass auth");
                        _applyEveryoneView();
                    }
                }
            }).catch(() => {});
        }

        const cached = _loadSession();
        if (cached?.status === "active") {
            window._currentUser = cached;
            
            // Phải gọi auth_check để lấy lại token vì ban đầu get_tenant đã giấu nó đi
            try {
                const check = await _saasApi('auth_check', { email: cached.email });
                if (check.ok && (check.status === 'active' || check.role === 'admin')) {
                    if (check.meta_token) window.APP_CONFIG.META_TOKEN = check.meta_token;
                    if (check.ad_accounts) {
                        try { window.APP_CONFIG.ALLOWED_ACCOUNTS = JSON.parse(check.ad_accounts); } 
                        catch(e) { window.APP_CONFIG.ALLOWED_ACCOUNTS = check.ad_accounts; }
                    }
                } else {
                    // Mất quyền truy cập -> xóa session và yêu cầu đăng nhập lại
                    localStorage.removeItem("_dom_auth_session");
                    window._currentUser = null;
                    _overlay(); _showLoading();
                    const tryGSI = () => typeof google !== "undefined" && google.accounts ? _showSignIn() : setTimeout(tryGSI, 100);
                    tryGSI();
                    return;
                }
            } catch(e) {
                console.warn("[AUTH] Loi khi fetch token ngam:", e);
            }
            
            _authResolve();
            setTimeout(_renderChip, 600);
            setTimeout(_bgFetchUsers, 1500);
            return;
        }

        const pending = _loadPending();
        if (pending?.email) {
            _overlay();
            _showLoading();
            try {
                const check = await _saasApi('auth_check', { email: pending.email });
                if (check.ok) {
                    window._everyoneViewEnabled = check.is_public;
                    if (check.status === "active" || check.role === 'admin') {
                        _clearPending();
                        _grantAccess({ email: pending.email, name: pending.name, picture: pending.picture || "", role: check.role, status: "active" });
                        return;
                    }
                    if (check.status === "request") {
                        _showPending(pending.email);
                        return;
                    }
                }
            } catch (_) { }
            _clearPending();
            _showDenied(pending.email, pending.name, pending.picture);
            return;
        }

        if (window._everyoneViewEnabled) {
            _applyEveryoneView();
            return;
        }

        _overlay(); _showLoading();
        const tryGSI = () => typeof google !== "undefined" && google.accounts ? _showSignIn() : setTimeout(tryGSI, 100);
        tryGSI();
    }

    function _applyEveryoneView() {
        if (window._currentUser) return;
        window._currentUser = { email: "", name: "Khách", picture: "", role: "viewer", status: "active", isGuest: true };
        _authResolve();
    }

    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", _boot)
        : _boot();

    document.addEventListener("DOMContentLoaded", () => {
        const btn = document.getElementById("share_url_btn");
        if (btn) { btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.openShareModal(); }; }
    });

})();
