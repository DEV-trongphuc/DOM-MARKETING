/**
 * DOM META SAAS - ROUTER
 * Handles tenant identification from the URL hash.
 */

window.SAAS_ROUTER = {
    tenant: null,
    isAdmin: false,
    adminToken: null,

    init: async function() {
        let hash = window.location.pathname.replace(/^\/|\/$/g, '');
        hash = hash.split('?')[0]; // Tách bỏ query string nếu có
        
        if (hash === 'admin') {
            this.isAdmin = true;
            this.adminToken = localStorage.getItem('dom_admin_token');
            if (this.adminToken) {
                this.renderAdminDashboard();
            } else {
                this.showAdminLogin();
            }
            return false; // Stop normal execution
        }

        if (!hash) {
            window.location.href = "/workspaces";
            return false;
        }

        // Fetch tenant config
        try {
            const adminToken = localStorage.getItem('dom_admin_token');
            const headers = {};
            if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;

            const res = await fetch(`${window.APP_CONFIG.SAAS_API_URL}?action=get_tenant&slug=${encodeURIComponent(hash)}`, { headers });
            const data = await res.json();

            if (!data.ok) {
                document.title = `404 — Workspace Not Found · Domation`;
                document.body.innerHTML = `
                    <div style="display:flex; height:100vh; align-items:center; justify-content:center; background:#f8fafc; font-family:'Roboto', sans-serif;">
                        <div style="text-align:center; background:#fff; padding:4rem 3rem; border-radius:24px; box-shadow:0 10px 40px -10px rgba(0,0,0,0.1); max-width:450px; border:1px solid #f1f5f9;">
                            <div style="width:80px; height:80px; background:#fef2f2; border-radius:24px; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem;">
                                <i class="fa-solid fa-folder-open" style="font-size:2.5rem; color:#ef4444;"></i>
                            </div>
                            <h2 style="color:#0f172a; margin:0 0 1rem; font-weight:800; font-size:2rem; letter-spacing:-0.02em;">Workspace Not Found</h2>
                            <p style="color:#64748b; margin:0 0 2rem; font-size:1.1rem; line-height:1.5;">Workspace <b style="color:#334155;">${hash}</b> không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại đường link.</p>
                            <a href="/register" style="display:inline-block; padding:1rem 2rem; background:#f59e0b; color:#fff; text-decoration:none; border-radius:12px; font-weight:700; box-shadow:0 4px 10px rgba(245,158,11,0.2);">Tạo Workspace Mới</a>
                        </div>
                    </div>
                `;
                return false;
            }

            this.tenant = data.tenant;

            // --- KIỂM TRA HẾT HẠN ---
            if (this.tenant.is_expired) {
                window.selectPlan = function(plan) {
                    document.getElementById('rn_plan').value = plan;
                    const card1 = document.getElementById('card_1_month');
                    const card2 = document.getElementById('card_1_year');
                    if (plan === '1_month') {
                        card1.style.border = '2px solid #f59e0b';
                        card1.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.1)';
                        card1.querySelector('.plan-price').style.color = '#f59e0b';
                        
                        card2.style.border = '2px solid #e2e8f0';
                        card2.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                        card2.querySelector('.plan-price').style.color = '#1e293b';
                    } else {
                        card2.style.border = '2px solid #f59e0b';
                        card2.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.1)';
                        card2.querySelector('.plan-price').style.color = '#f59e0b';
                        
                        card1.style.border = '2px solid #e2e8f0';
                        card1.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                        card1.querySelector('.plan-price').style.color = '#1e293b';
                    }
                };

                document.body.innerHTML = `
                    <div style="display:flex; height:100vh; align-items:center; justify-content:center; background:rgba(15,23,42,0.95); font-family:'Roboto', sans-serif; backdrop-filter: blur(10px);">
                        <div style="background:#fff; width:100%; max-width:1050px; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); overflow:hidden; display:flex;">
                            <!-- Bên trái: Bảng giá -->
                            <div style="flex:1.2; padding:3.5rem; background:#f8fafc; border-right:1px solid #e2e8f0;">
                                <div style="display:flex; align-items:center; gap:0.5rem; color:#f59e0b; font-weight:800; margin-bottom:1rem;">
                                    <i class="fa-solid fa-clock" style="font-size:1.2rem;"></i> WORKSPACE ĐANG TẠM DỪNG
                                </div>
                                <h2 style="margin:0 0 1rem; font-size:2.2rem; font-weight:800; color:#0f172a; line-height:1.2;">Nâng cấp gói để tiếp tục sử dụng</h2>
                                <p style="color:#64748b; margin-bottom:2.5rem; font-size:1.1rem; line-height:1.6;">Thời gian dùng thử của <b>${this.tenant.name}</b> đã kết thúc. Vui lòng chọn gói để duy trì hệ thống báo cáo tự động.</p>
                                
                                <div style="display:grid; gap:1.2rem;">
                                    <div id="card_1_month" onclick="selectPlan('1_month')" style="background:#fff; border:2px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); border-radius:16px; padding:1.5rem 2rem; cursor:pointer; transition:all 0.2s;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                            <h3 style="margin:0; font-size:1.4rem; color:#1e293b;">Gói 1 Tháng</h3>
                                            <div class="plan-price" style="font-size:1.8rem; font-weight:800; color:#1e293b;">690,000<span style="font-size:1rem; color:#64748b; font-weight:500;">đ/tháng</span></div>
                                        </div>
                                        <div style="color:#64748b; font-size:1.05rem;">Duy trì hệ thống báo cáo hàng ngày.</div>
                                    </div>
                                    <div id="card_1_year" onclick="selectPlan('1_year')" style="background:#fff; border:2px solid #f59e0b; box-shadow:0 10px 15px -3px rgba(245, 158, 11, 0.1); border-radius:16px; padding:1.5rem 2rem; position:relative; cursor:pointer; transition:all 0.2s;">
                                        <div style="position:absolute; top:-12px; right:20px; background:#f59e0b; color:#fff; font-size:0.8rem; font-weight:800; padding:0.3rem 1rem; border-radius:20px; text-transform:uppercase;">Phổ Biến</div>
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                            <h3 style="margin:0; font-size:1.4rem; color:#1e293b;">Gói 1 Năm <span style="font-size:0.9rem; background:#10b981; color:#fff; padding:0.25rem 0.6rem; border-radius:10px; margin-left:0.5rem; font-weight:700;">Tiết kiệm 29%</span></h3>
                                            <div class="plan-price" style="font-size:1.8rem; font-weight:800; color:#f59e0b;">5,880,000<span style="font-size:1rem; color:#64748b; font-weight:500;">đ/năm</span></div>
                                        </div>
                                        <div style="color:#64748b; font-size:1.05rem;">Thanh toán 1 lần, yên tâm sử dụng cả năm.</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Bên phải: Form Gia Hạn -->
                            <div style="flex:0.8; padding:3.5rem; display:flex; flex-direction:column; justify-content:center;">
                                <h3 style="margin:0 0 1.5rem; font-size:1.5rem; color:#1e293b;">Thông tin liên hệ</h3>
                                
                                <input type="hidden" id="rn_plan" value="1_year">
                                
                                <label style="display:block; font-size:0.9rem; font-weight:700; color:#475569; margin-bottom:0.5rem; text-transform:uppercase;">Số Điện Thoại Zalo</label>
                                <input type="text" id="rn_phone" placeholder="0987.654.321" style="width:100%; padding:1.2rem; border:2px solid #e2e8f0; border-radius:10px; margin-bottom:1.5rem; outline:none; font-family:'Roboto'; font-size:1.1rem; box-sizing:border-box; transition:all 0.2s;" onfocus="this.style.borderColor='#f59e0b'; this.style.boxShadow='0 0 0 3px rgba(245, 158, 11, 0.2)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                                
                                <label style="display:block; font-size:0.9rem; font-weight:700; color:#475569; margin-bottom:0.5rem; text-transform:uppercase;">Email</label>
                                <input type="email" id="rn_email" placeholder="Ví dụ: ceo@company.com" value="${this.tenant.google_email || ''}" style="width:100%; padding:1.2rem; border:2px solid #e2e8f0; border-radius:10px; margin-bottom:2rem; outline:none; font-family:'Roboto'; font-size:1.1rem; box-sizing:border-box; transition:all 0.2s;" onfocus="this.style.borderColor='#f59e0b'; this.style.boxShadow='0 0 0 3px rgba(245, 158, 11, 0.2)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                                
                                <button onclick="SAAS_ROUTER.submitRenewal('${hash}')" id="btn_submit_renewal" style="width:100%; padding:1.4rem; background:#f59e0b; color:#fff; border:none; border-radius:10px; font-weight:800; font-size:1.2rem; cursor:pointer; margin-bottom:1rem; transition:all 0.2s; box-shadow:0 4px 6px rgba(245,158,11,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(245,158,11,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(245,158,11,0.3)'"><i class="fa-solid fa-paper-plane"></i> Yêu Cầu Gia Hạn</button>
                                
                                <div style="text-align:center; position:relative; margin:1.5rem 0;">
                                    <hr style="border:none; border-top:1px solid #e2e8f0;">
                                    <span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); background:#fff; padding:0 10px; color:#94a3b8; font-size:0.9rem;">Hoặc</span>
                                </div>
                                
                                <a href="https://zalo.me/0378859736" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; width:100%; padding:1.4rem; background:#0068ff; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1.1rem; cursor:pointer; text-decoration:none; transition:all 0.2s; box-shadow:0 4px 6px rgba(0,104,255,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,104,255,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0,104,255,0.3)'"><i class="fa-solid fa-comment-dots"></i> Chat Zalo Hỗ Trợ</a>
                            </div>
                        </div>
                    </div>
                `;
                return false;
            }
            
            // Override settings with tenant settings
            window.APP_CONFIG.ACCOUNT_ID = this.tenant.ad_account_id;
            window.APP_CONFIG.META_TOKEN = this.tenant.meta_token;
            window.APP_CONFIG.BRAND_FILTER_ENABLED = this.tenant.brand_filter_enabled == 1;
            
            try {
                window.APP_CONFIG.ALLOWED_ACCOUNTS = JSON.parse(this.tenant.ad_accounts || "[]");
            } catch(e) {
                window.APP_CONFIG.ALLOWED_ACCOUNTS = [];
            }
            
            return true; // Continue execution

        } catch (e) {
            alert("Could not connect to server.");
            return false;
        }
    },

    showAdminLogin: function() {
        document.body.innerHTML = `
            <div style="display:flex; height:100vh; align-items:center; justify-content:center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); font-family: 'Roboto', sans-serif;">
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); padding: 4rem 3.5rem; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: 420px; text-align: center;">
                    <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ffa900, #f59e0b); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 10px 20px rgba(245, 158, 11, 0.3);">
                        <i class="fa-solid fa-shield-halved" style="color: #fff; font-size: 2rem;"></i>
                    </div>
                    <h2 style="margin: 0 0 0.5rem; color: #fff; font-size: 2rem; font-weight: 700; letter-spacing: -0.02em;">DOM Admin</h2>
                    <p style="margin: 0 0 2.5rem; color: #94a3b8; font-size: 1rem;">Sign in to manage workspaces</p>
                    
                    <div style="text-align: left; margin-bottom: 1.2rem;">
                        <label style="display: block; color: #cbd5e1; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Username</label>
                        <input type="text" id="admin_user" placeholder="Enter username" style="width: 100%; padding: 1.2rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #fff; font-size: 1rem; outline: none; transition: all 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='#f59e0b'; this.style.boxShadow='0 0 0 3px rgba(245, 158, 11, 0.2)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.boxShadow='none'">
                    </div>
                    
                    <div style="text-align: left; margin-bottom: 2rem;">
                        <label style="display: block; color: #cbd5e1; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Password</label>
                        <input type="password" id="admin_pass" placeholder="••••••••" style="width: 100%; padding: 1.2rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #fff; font-size: 1rem; outline: none; transition: all 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='#f59e0b'; this.style.boxShadow='0 0 0 3px rgba(245, 158, 11, 0.2)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.boxShadow='none'" onkeydown="if(event.key === 'Enter') SAAS_ROUTER.doAdminLogin()">
                    </div>
                    
                    <button onclick="SAAS_ROUTER.doAdminLogin()" style="width: 100%; padding: 1.2rem; background: #f59e0b; color: #fff; border: none; border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);" onmouseover="this.style.background='#d97706'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#f59e0b'; this.style.transform='translateY(0)'">Sign In</button>
                    <p id="admin_error" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); text-align: center; display: none; margin-top: 1.5rem; font-weight: 500; font-size: 0.9rem;"><i class="fa-solid fa-triangle-exclamation" style="margin-right:0.5rem;"></i> Invalid credentials!</p>
                </div>
            </div>
        `;
    },

    doAdminLogin: async function() {
        const u = document.getElementById('admin_user').value;
        const p = document.getElementById('admin_pass').value;
        
        try {
            const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'admin_login', username: u, password: p})
            });
            const data = await res.json();
            
            if (data.ok) {
                this.adminToken = data.token;
                localStorage.setItem('dom_admin_token', data.token);
                this.renderAdminDashboard();
            } else {
                const err = document.getElementById('admin_error');
                err.textContent = "Invalid login!";
                err.style.display = 'block';
            }
        } catch (e) {
        }
    },

    adminLogout: function() {
        this.adminToken = null;
        localStorage.removeItem('dom_admin_token');
        this.showAdminLogin();
    },

    renderAdminDashboard: async function() {
        document.body.innerHTML = `
            <div style="display:flex; height:100vh; align-items:center; justify-content:center; background:#0f172a; font-family:'Roboto', sans-serif;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:1rem;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size:3rem; color:#f59e0b;"></i>
                    <h2 style="color:#f8fafc; margin:0; font-weight:600;">Loading Admin...</h2>
                </div>
            </div>
        `;
        try {
            const res = await fetch(`${window.APP_CONFIG.SAAS_API_URL}?action=admin_get_tenants`, {
                headers: {'Authorization': 'Bearer ' + this.adminToken}
            });
            const data = await res.json();
            
            const reqRes = await fetch(`${window.APP_CONFIG.SAAS_API_URL}?action=admin_get_renewal_requests`, {
                headers: {'Authorization': 'Bearer ' + this.adminToken}
            });
            const reqData = await reqRes.json();
            
            let html = `
                <div style="min-height: 100vh; background: #0f172a; color: #f1f5f9; font-family: 'Roboto', sans-serif;">
                    <!-- Top Navbar -->
                    <div style="background: rgba(30,41,59,0.8); backdrop-filter: blur(12px); padding: 1.2rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2);">
                                <i class="fa-solid fa-shield-halved" style="color: #fff; font-size: 1.2rem;"></i>
                            </div>
                            <h2 style="margin: 0; color: #f8fafc; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.02em;">DOM <span style="color:#f59e0b; font-weight:800;">ADMIN</span></h2>
                        </div>
                        <button onclick="SAAS_ROUTER.adminLogout()" style="padding: 0.6rem 1.2rem; background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff'"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 3rem 2rem; max-width: 1400px; margin: 0 auto;">
                        
                        <!-- CREATE NEW TENANT CARD -->
                        <div style="background: rgba(30,41,59,0.5); padding: 2rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 2.5rem; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);">
                            <div style="display:flex; align-items:center; gap:0.8rem; margin-bottom:1.5rem;">
                                <div style="background:rgba(245, 158, 11, 0.2); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#f59e0b;"><i class="fa-solid fa-plus"></i></div>
                                <h3 style="margin: 0; color: #f8fafc; font-size: 1.2rem; font-weight: 700;">Tạo Mới Workspace</h3>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1rem; align-items: end;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#94a3b8; margin-bottom:0.4rem; text-transform:uppercase;">Tên Workspace (Slug)</label>
                                    <input type="text" id="new_slug" placeholder="vd: domation" style="width:100%; padding: 0.8rem 1rem; background:rgba(15,23,42,0.6); color:#fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.95rem; outline: none; transition: all 0.2s; box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#94a3b8; margin-bottom:0.4rem; text-transform:uppercase;">Tên Khách Hàng</label>
                                    <input type="text" id="new_name" placeholder="Domation" style="width:100%; padding: 0.8rem 1rem; background:rgba(15,23,42,0.6); color:#fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.95rem; outline: none; transition: all 0.2s; box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#94a3b8; margin-bottom:0.4rem; text-transform:uppercase;">Ad Account ID</label>
                                    <input type="text" id="new_ad_account" placeholder="123456789" style="width:100%; padding: 0.8rem 1rem; background:rgba(15,23,42,0.6); color:#fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.95rem; outline: none; transition: all 0.2s; box-sizing:border-box;" onfocus="this.style.borderColor='#f59e0b'">
                                </div>
                                <button onclick="SAAS_ROUTER.createTenant()" style="height: 44px; padding: 0 1.5rem; background: #10b981; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; display:flex; align-items:center; gap:0.5rem;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fa-solid fa-bolt"></i> Tạo Nhanh</button>
                            </div>
                        </div>

                        <!-- RENEWAL REQUESTS -->
                        <div style="background: rgba(30,41,59,0.5); border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 2.5rem; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);">
                            <div style="padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:0.8rem; background:rgba(245, 158, 11, 0.05); border-radius:16px 16px 0 0;">
                                <div style="background:rgba(245, 158, 11, 0.2); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#f59e0b;"><i class="fa-solid fa-bell"></i></div>
                                <h3 style="margin: 0; color: #fcd34d; font-size: 1.2rem; font-weight: 800;">Yêu Cầu Gia Hạn <span style="background:#f59e0b; color:#fff; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:20px; margin-left:0.5rem;">${reqData.requests?.filter(r=>r.status==='pending').length || 0}</span></h3>
                            </div>
                            <div style="padding: 1rem 2rem;">
                                ${(!reqData.requests || reqData.requests.length === 0) ? '<p style="color:#64748b; font-style:italic;">Không có yêu cầu nào.</p>' : `
                                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 1rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Khách hàng</th>
                                            <th style="padding: 1rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Gói yêu cầu</th>
                                            <th style="padding: 1rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Liên hệ</th>
                                            <th style="padding: 1rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Trạng thái</th>
                                            <th style="padding: 1rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; text-align:right;">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reqData.requests.map(r => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 1rem; font-weight:600; color:#f1f5f9;">${r.tenant_name} <br><span style="font-size:0.85rem; color:#94a3b8; font-weight:400;">${r.tenant_slug}</span></td>
                                                <td style="padding: 1rem; font-weight:700; color:#f59e0b;">${r.plan === '1_year' ? '1 Năm' : '1 Tháng'}</td>
                                                <td style="padding: 1rem; color:#cbd5e1;">${r.phone} <br><span style="font-size:0.85rem; color:#64748b;">${r.email}</span></td>
                                                <td style="padding: 1rem;">
                                                    <span style="background:${r.status==='pending'?'rgba(245,158,11,0.2)':'rgba(16,185,129,0.2)'}; color:${r.status==='pending'?'#fcd34d':'#6ee7b7'}; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">${r.status}</span>
                                                </td>
                                                <td style="padding: 1rem; text-align:right;">
                                                    ${r.status === 'pending' ? `<button onclick="SAAS_ROUTER.resolveRenewal(${r.id})" style="padding:0.4rem 0.8rem; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem;">Đã Xử Lý</button>` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                `}
                            </div>
                        </div>

                        <!-- WORKSPACES TABLE -->
                        <div style="background: rgba(30,41,59,0.5); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);">
                            <div style="padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:0.8rem;">
                                <div style="background:rgba(255,255,255,0.1); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i class="fa-solid fa-users"></i></div>
                                <h3 style="margin: 0; color: #f8fafc; font-size: 1.2rem; font-weight: 800;">Quản Lý Workspaces <span style="background:rgba(255,255,255,0.1); color:#94a3b8; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:20px; margin-left:0.5rem;">${data.tenants.length}</span></h3>
                            </div>
                            
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                    <thead>
                                        <tr style="background: rgba(15,23,42,0.4);">
                                            <th style="padding: 1rem 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Workspace / Khách hàng</th>
                                            <th style="padding: 1rem 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Trạng thái</th>
                                            <th style="padding: 1rem 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Ngày hết hạn</th>
                                            <th style="padding: 1rem 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; text-align: right;">Gia hạn / Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;
            
            data.tenants.forEach((t, i) => {
                const bg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                
                // Determine Status UI
                let stColor = '#94a3b8', stBg = 'rgba(255,255,255,0.1)', stIcon = 'circle-info';
                if (t.status === 'active') { stColor = '#6ee7b7'; stBg = 'rgba(16,185,129,0.2)'; stIcon = 'check-circle'; }
                if (t.status === 'trial') { stColor = '#fcd34d'; stBg = 'rgba(245,158,11,0.2)'; stIcon = 'clock'; }
                if (t.status === 'expired') { stColor = '#fca5a5'; stBg = 'rgba(239,68,68,0.2)'; stIcon = 'xmark-circle'; }
                if (t.status === 'locked') { stColor = '#94a3b8'; stBg = 'rgba(255,255,255,0.1)'; stIcon = 'lock'; }

                const expDate = t.expires_at ? new Date(t.expires_at).toLocaleString('vi-VN') : 'Không giới hạn';

                html += `
                    <tr style="background: ${bg}; transition: background 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.05)'" onmouseout="this.style.background='${bg}'">
                        <td style="padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-weight: 700; color: #f8fafc; font-size:1.05rem;">${t.name}</div>
                            <div style="margin-top:0.3rem;"><a href="/${t.slug}" target="_blank" style="color: #f59e0b; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-link" style="font-size:0.8rem;"></i> ${t.slug}</a></div>
                            <div style="margin-top:0.3rem; font-size:0.85rem; color:#64748b;"><i class="fa-brands fa-google"></i> ${t.google_email || 'Không có email'}</div>
                        </td>
                        <td style="padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <span style="background:${stBg}; color:${stColor}; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; display:inline-flex; align-items:center; gap:0.4rem;">
                                <i class="fa-solid fa-${stIcon}"></i> ${t.status.toUpperCase()}
                            </span>
                        </td>
                        <td style="padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-weight: 600; font-family:monospace; font-size:0.95rem;">
                            ${expDate}
                        </td>
                        <td style="padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">
                            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                                <button onclick="SAAS_ROUTER.updateTenantStatus('${t.slug}', 'active', 30)" title="Cộng 1 tháng" style="padding:0.5rem 0.8rem; background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); border-radius:6px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#3b82f6'; this.style.color='#fff'"><i class="fa-solid fa-plus"></i> 1M</button>
                                <button onclick="SAAS_ROUTER.updateTenantStatus('${t.slug}', 'active', 365)" title="Cộng 1 năm" style="padding:0.5rem 0.8rem; background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.3); border-radius:6px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#10b981'; this.style.color='#fff'"><i class="fa-solid fa-plus"></i> 1Y</button>
                                <button onclick="SAAS_ROUTER.updateTenantStatus('${t.slug}', '${t.status==='locked'?'active':'locked'}', 0)" title="Khóa/Mở Khóa" style="padding:0.5rem 0.8rem; background:${t.status==='locked'?'rgba(255,255,255,0.1)':'rgba(239,68,68,0.2)'}; color:${t.status==='locked'?'#cbd5e1':'#f87171'}; border:1px solid ${t.status==='locked'?'rgba(255,255,255,0.2)':'rgba(239,68,68,0.3)'}; border-radius:6px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='${t.status==='locked'?'rgba(255,255,255,0.2)':'#ef4444'}'; this.style.color='#fff'"><i class="fa-solid fa-${t.status==='locked'?'unlock':'lock'}"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.innerHTML = html;
        } catch (e) {
            document.body.innerHTML = `
                <div style="display:flex; height:100vh; align-items:center; justify-content:center; background:#f8fafc; font-family:'Roboto', sans-serif;">
                    <div style="text-align:center; background:#fff; padding:3rem; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.05); max-width:400px;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:#ef4444; margin-bottom:1rem;"></i>
                        <h2 style="color:#1e293b; margin:0 0 1rem; font-weight:700;">Connection Error</h2>
                        <p style="color:#64748b; margin:0 0 2rem;">Could not connect to the SaaS backend.</p>
                        <button onclick="window.location.reload()" style="padding:0.8rem 1.5rem; background:#ffa900; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">Try Again</button>
                    </div>
                </div>
            `;
        }
    },

    createTenant: async function() {
        const slug = document.getElementById('new_slug').value.trim();
        const name = document.getElementById('new_name').value.trim();
        const ad_account = document.getElementById('new_ad_account').value.trim();

        if (!slug || !name) {
            alert("Slug and Name are required");
            return;
        }

        try {
            const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.adminToken
                },
                body: JSON.stringify({
                    action: 'admin_create_tenant',
                    slug: slug,
                    name: name,
                    ad_account_id: ad_account
                })
            });
            const data = await res.json();
            
            if (data.ok) {
                alert("Tenant created successfully!");
                this.renderAdminDashboard(); // Reload the list
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Failed to create tenant");
        }
    },

    updateTenantStatus: async function(slug, status, addDays) {
        if (!confirm(`Xác nhận cập nhật cho [${slug}]:\nTrạng thái mới: ${status}\nSố ngày cộng thêm: ${addDays}`)) return;
        try {
            const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.adminToken
                },
                body: JSON.stringify({
                    action: 'admin_update_tenant_status',
                    slug: slug,
                    status: status,
                    add_days: addDays
                })
            });
            const data = await res.json();
            if (data.ok) {
                this.renderAdminDashboard();
            } else {
                alert("Error: " + data.error);
            }
        } catch(e) { console.error(e); }
    },

    resolveRenewal: async function(id) {
        if (!confirm("Đánh dấu yêu cầu này là Đã Xử Lý?")) return;
        try {
            const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.adminToken
                },
                body: JSON.stringify({
                    action: 'admin_resolve_renewal',
                    id: id,
                    status: 'resolved'
                })
            });
            const data = await res.json();
            if (data.ok) {
                this.renderAdminDashboard();
            }
        } catch(e) { console.error(e); }
    },

    submitRenewal: async function(slug) {
        const plan = document.getElementById('rn_plan').value;
        const phone = document.getElementById('rn_phone').value;
        const email = document.getElementById('rn_email').value;

        if (!phone) return alert("Vui lòng nhập Số Điện Thoại Zalo để Admin liên hệ!");

        const btn = document.getElementById('btn_submit_renewal');
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang Gửi...';
        btn.disabled = true;

        try {
            const res = await fetch(window.APP_CONFIG.SAAS_API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'submit_renewal',
                    slug: slug,
                    plan: plan,
                    phone: phone,
                    email: email
                })
            });
            const data = await res.json();
            if (data.ok) {
                alert("Yêu cầu đã được gửi! Admin sẽ liên hệ lại với bạn qua Zalo sớm nhất.");
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã Gửi Thành Công';
            } else {
                alert("Lỗi: " + data.error);
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Yêu Cầu';
                btn.disabled = false;
            }
        } catch (e) {
            alert("Lỗi kết nối");
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Yêu Cầu';
            btn.disabled = false;
        }
    }
};
