// Quản lý Modal Tài Khoản (Multi-Token)

window.openAccountManagerModal = function() {
    const modal = document.getElementById("account_manager_modal");
    if (!modal) return;
    modal.style.display = "flex";
    
    // Tắt scroll body
    document.body.style.overflow = "hidden";
    
    // Nếu có window.APP_CONFIG.ALLOWED_ACCOUNTS, render ra
    _renderAccountManagerList();
};

window.closeAccountManagerModal = function() {
    const modal = document.getElementById("account_manager_modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
};

// Chuẩn hóa format accounts:
// Legacy: [ { "id": "123", "name": "MBA" } ]
// New: [ { "token": "EAA...", "accounts": [ { "id": "123", "name": "MBA" } ] } ]
function _normalizeAccounts() {
    let accounts = window.APP_CONFIG?.ALLOWED_ACCOUNTS || [];
    if (accounts.length === 0) return [];

    // Nếu element đầu tiên không có 'token', nghĩa là legacy
    if (!accounts[0].token) {
        // Gói tất cả vào token hiện tại của tenant
        return [{
            token: window.APP_CONFIG?.META_TOKEN || "",
            token_name: "Tài khoản Meta Mặc định",
            accounts: accounts.map(a => typeof a === 'string' ? { id: a, name: `Tài khoản ${a}` } : a)
        }];
    }
    
    return accounts;
}

function _renderAccountManagerList() {
    const body = document.getElementById("account_manager_body");
    if (!body) return;
    
    const groups = _normalizeAccounts();
    const isAdmin = window._currentUser?.role === 'admin';
    
    if (groups.length === 0 || !groups[0].token) {
        body.innerHTML = `
            <div style="text-align: center; padding: 4rem 0; color: #94a3b8;">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                <p style="font-size: 1.2rem; margin: 0;">Chưa có tài khoản nào được kết nối.</p>
                ${isAdmin ? '<p style="font-size: 1rem; margin: 0.5rem 0 0;">Hãy thêm Token Mới để bắt đầu.</p>' : ''}
            </div>
        `;
        return;
    }

    let html = "";
    
    groups.forEach((group, index) => {
        const tokenName = group.token_name || `Kết nối #${index + 1}`;
        // Lấy 8 ký tự đầu/cuối của token để hiển thị preview
        const tokenPreview = group.token.length > 20 ? 
            `${group.token.substring(0, 8)}...${group.token.substring(group.token.length - 8)}` : 
            'Không có Token';

        html += `
        <div style="margin-bottom: 2rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: #f8fafc; padding: 1.2rem 1.6rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div style="width: 40px; height: 40px; background: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-brands fa-meta" style="font-size: 1.2rem;"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1.4rem; color: #1e293b; font-weight: 700;">${tokenName}</h4>
                        <p style="margin: 0; font-size: 1.15rem; color: #64748b; font-family: monospace;">${tokenPreview}</p>
                    </div>
                </div>
                ${isAdmin ? `
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="_fetchAccountsForToken('${group.token}')" style="background: transparent; border: none; color: #3b82f6; font-size: 1.4rem; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='transparent'" title="Tải danh sách Ad Accounts">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <button onclick="_removeTokenGroup(${index})" style="background: transparent; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'" title="Xóa kết nối này">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                ` : ''}
            </div>
            
            <div style="padding: 1.6rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.2rem;">
        `;
        
        const accounts = group.accounts || [];
        if (accounts.length === 0) {
            html += `<p style="color: #94a3b8; font-style: italic; margin: 0; font-size: 1.2rem; grid-column: 1 / -1;">Không có Ad Account nào.</p>`;
        } else {
            accounts.forEach(acc => {
                const isActive = (acc.id === window.ACCOUNT_ID || acc.id.replace('act_', '') === window.ACCOUNT_ID);
                const avatarUrl = acc.avatar || "./assets/dom_avatar.jpg";
                html += `
                <div onclick="_switchAccount('${acc.id}', '${group.token}')" style="border: 2px solid ${isActive ? '#f59e0b' : '#e2e8f0'}; background: ${isActive ? '#fffbeb' : '#fff'}; border-radius: 12px; padding: 1.4rem; cursor: pointer; transition: all 0.2s; position: relative;" onmouseover="if(!${isActive}) this.style.borderColor='#cbd5e1'" onmouseout="if(!${isActive}) this.style.borderColor='#e2e8f0'">
                    ${isActive ? '<div style="position: absolute; top: -14px; right: -14px; background: #f59e0b; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; border: 2px solid #fff;"><i class="fa-solid fa-check"></i></div>' : ''}
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem;">
                        <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.src='./assets/dom_avatar.jpg'" />
                        <h5 style="margin: 0; font-size: 1.4rem; color: #1e293b; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${acc.name}">${acc.name}</h5>
                    </div>
                    <p style="margin: 0; font-size: 1.2rem; color: #64748b; font-family: monospace;">ID: ${acc.id}</p>
                </div>
                `;
            });
        }
        
        html += `
            </div>
        </div>
        `;
    });
    
    body.innerHTML = html;
    
    // Ẩn nút Thêm Token nếu không phải admin
    const btn = document.getElementById("am_add_token_btn");
    if (btn) {
        btn.style.display = isAdmin ? "flex" : "none";
    }
}

window._switchAccount = function(accountId, token) {
    let cleanId = accountId.replace('act_', '');
    if (window.ACCOUNT_ID === cleanId) {
        closeAccountManagerModal();
        return; // Đã đang xem acc này
    }
    
    // Cập nhật biến global
    window.ACCOUNT_ID = cleanId;
    window.APP_CONFIG.META_TOKEN = token;
    
    // Cập nhật GLOBAL_CURRENCY từ account được chọn
    const groups = _normalizeAccounts();
    for (const g of groups) {
        const found = (g.accounts || []).find(a => a.id === accountId || a.id.replace('act_', '') === cleanId);
        if (found) {
            window.GLOBAL_CURRENCY = found.currency || 'VND';
            break;
        }
    }
    
    // Lưu vào localStorage để lần sau load lại
    const slug = new URLSearchParams(window.location.search).get('slug') || window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0];
    localStorage.setItem(`dom_last_account_${slug}`, cleanId);
    
    // Cập nhật UI
    _renderAccountManagerList(); // Render lại để hiện dấu check
    
    // Reload dashboard
    closeAccountManagerModal();
    if (typeof showToast === 'function') showToast("🔄 Đang chuyển tài khoản...");
    setTimeout(() => {
        location.reload();
    }, 500);
};

// --- ADD TOKEN VIEW ---

window.openAddTokenView = function() {
    const view = document.getElementById("am_add_view");
    if (view) view.style.display = "flex";
    document.getElementById("am_new_token_input").value = "";
    document.getElementById("am_fetched_accounts_container").style.display = "none";
    document.getElementById("am_save_token_btn").disabled = true;
    document.getElementById("am_save_token_btn").style.opacity = "0.5";
    window._am_fetched_accounts = [];
};

window._fetchAccountsForToken = function(token) {
    if (!token) return;
    openAddTokenView();
    document.getElementById("am_new_token_input").value = token;
    fetchAccountsFromNewToken();
};

window.closeAddTokenView = function() {
    const view = document.getElementById("am_add_view");
    if (view) view.style.display = "none";
};

window.fetchAccountsFromNewToken = async function() {
    const token = document.getElementById("am_new_token_input").value.trim();
    if (!token) return;
    
    const btn = document.getElementById("am_fetch_accounts_btn");
    const origHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    btn.disabled = true;
    
    try {
        // Fetch user profile picture and ad accounts concurrently
        const meUrl = `https://graph.facebook.com/v20.0/me?fields=name,picture.width(200).height(200)&access_token=${token}`;
        const accUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=name,account_id,currency,business{profile_picture_uri}&limit=100&access_token=${token}`;
        
        const [meRes, accRes] = await Promise.all([fetch(meUrl), fetch(accUrl)]);
        const meData = await meRes.json();
        const data = await accRes.json();
        
        if (data.error) {
            throw new Error(data.error.message || "Lỗi Token không hợp lệ");
        }
        
        const defaultAvatar = meData.picture && meData.picture.data && meData.picture.data.url ? meData.picture.data.url : "";
        
        window._am_fetched_accounts = data.data || [];
        // Gắn default avatar cho các account không có avatar
        window._am_fetched_accounts.forEach(acc => {
            acc._default_avatar = defaultAvatar;
        });
        
        _renderFetchedAccounts();
        
    } catch (e) {
        alert("Lỗi: " + e.message);
    } finally {
        btn.innerHTML = origHTML;
        btn.disabled = false;
    }
};

function _renderFetchedAccounts() {
    const container = document.getElementById("am_fetched_accounts_container");
    const list = document.getElementById("am_fetched_accounts_list");
    const count = document.getElementById("am_fetched_count");
    
    container.style.display = "block";
    count.textContent = `${window._am_fetched_accounts.length} tìm thấy`;
    
    if (window._am_fetched_accounts.length === 0) {
        list.innerHTML = `<p style="color: #64748b;">Không tìm thấy Ad Account nào trong Token này.</p>`;
        return;
    }
    
    let html = "";
    window._am_fetched_accounts.forEach(acc => {
        // Loại bỏ act_ prefix nếu có
        const accId = acc.account_id || acc.id.replace('act_', '');
        const avatarUri = (acc.business && acc.business.profile_picture_uri) ? acc.business.profile_picture_uri : (acc._default_avatar || "");
        html += `
        <label style="display: flex; align-items: center; gap: 1rem; padding: 1.2rem; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#e2e8f0'">
            <input type="checkbox" value="${accId}" data-name="${acc.name || `Account ${accId}`}" data-currency="${acc.currency || 'VND'}" data-avatar="${avatarUri}" onchange="this.parentElement.style.borderColor = this.checked ? '#3b82f6' : '#e2e8f0'; this.parentElement.style.background = this.checked ? '#eff6ff' : 'transparent'; _checkAmSaveBtn()" style="width: 1.2rem; height: 1.2rem; margin-top: 0.2rem; accent-color: #3b82f6; cursor: pointer;">
            <img src="${avatarUri || './assets/dom_avatar.jpg'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.src='./assets/dom_avatar.jpg'" />
            <div>
                <p style="margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 600;">${acc.name || `Tài khoản ${accId}`}</p>
                <p style="margin: 0.2rem 0 0; font-size: 0.95rem; color: #64748b; font-family: monospace;">ID: ${accId} • ${acc.currency || 'VND'}</p>
            </div>
        </label>
        `;
    });
    
    list.innerHTML = html;
}

window._checkAmSaveBtn = function() {
    const checked = document.querySelectorAll("#am_fetched_accounts_list input:checked");
    const btn = document.getElementById("am_save_token_btn");
    if (checked.length > 0) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
};

window.saveSelectedAccounts = async function() {
    const token = document.getElementById("am_new_token_input").value.trim();
    const checked = document.querySelectorAll("#am_fetched_accounts_list input:checked");
    if (!token || checked.length === 0) return;
    
    const btn = document.getElementById("am_save_token_btn");
    const origHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Đang lưu...`;
    btn.disabled = true;
    
    const selectedAccounts = Array.from(checked).map(cb => ({
        id: cb.value,
        name: cb.dataset.name,
        currency: cb.dataset.currency,
        avatar: cb.dataset.avatar
    }));
    
    let groups = _normalizeAccounts();
    
    // Kiểm tra xem token này đã có trong groups chưa
    const existingGroupIndex = groups.findIndex(g => g.token === token);
    if (existingGroupIndex >= 0) {
        // Gộp các account mới vào group cũ, tránh trùng lặp
        const existingIds = new Set(groups[existingGroupIndex].accounts.map(a => a.id));
        selectedAccounts.forEach(acc => {
            if (!existingIds.has(acc.id)) {
                groups[existingGroupIndex].accounts.push(acc);
            }
        });
    } else {
        // Thêm group mới
        groups.push({
            token: token,
            token_name: `Tài khoản Meta ${groups.length + 1}`,
            accounts: selectedAccounts
        });
    }
    
    // Gọi API để lưu `groups` vào DB
    try {
        const adminEmail = window._currentUser?.email;
        const slug = new URLSearchParams(window.location.search).get('slug') || window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0];
        
        const res = await fetch(`${window.APP_CONFIG.SAAS_API_URL}?action=auth_update_accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: slug,
                admin_email: adminEmail,
                ad_accounts: groups
            })
        });
        
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        
        // Cập nhật local
        window.APP_CONFIG.ALLOWED_ACCOUNTS = groups;
        
        if (typeof showToast === 'function') showToast("✅ Cập nhật tài khoản thành công!");
        
        // Reset view
        closeAddTokenView();
        _renderAccountManagerList();
        
    } catch (e) {
        alert("Lỗi lưu tài khoản: " + e.message);
    } finally {
        btn.innerHTML = origHTML;
        btn.disabled = false;
    }
};

window._removeTokenGroup = async function(index) {
    if (!confirm("Bạn có chắc chắn muốn xóa Token này và toàn bộ Ad Accounts bên trong khỏi Workspace?")) return;
    
    let groups = _normalizeAccounts();
    groups.splice(index, 1);
    
    try {
        const adminEmail = window._currentUser?.email;
        const slug = new URLSearchParams(window.location.search).get('slug') || window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0];
        
        const res = await fetch(`${window.APP_CONFIG.SAAS_API_URL}?action=auth_update_accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: slug,
                admin_email: adminEmail,
                ad_accounts: groups
            })
        });
        
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        
        window.APP_CONFIG.ALLOWED_ACCOUNTS = groups;
        
        // Kiểm tra nếu đang xóa token đang dùng -> tải lại trang
        const currentGroupHasActiveAccount = groups.every(g => !g.accounts.find(a => a.id === window.ACCOUNT_ID));
        if (currentGroupHasActiveAccount) {
            alert("Tài khoản đang xem đã bị xóa. Trang sẽ được tải lại.");
            localStorage.removeItem(`dom_last_account_${slug}`);
            location.reload();
            return;
        }
        
        if (typeof showToast === 'function') showToast("🗑️ Đã xóa Token");
        _renderAccountManagerList();
        
    } catch (e) {
        alert("Lỗi xóa: " + e.message);
    }
};
