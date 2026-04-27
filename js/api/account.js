async function initAccountSelector() {
  const selectedInfo = document.querySelector(".dom_account_view_block");
  if (!selectedInfo) return;

  let groups = typeof _normalizeAccounts === 'function' ? _normalizeAccounts() : [];
  
  const slug = new URLSearchParams(window.location.search).get('slug') || window.location.pathname.replace(/^\/|\/$/g, '').split('?')[0];
  let savedId = localStorage.getItem(`dom_last_account_${slug}`);
  
  let targetAccount = null;
  let targetToken = null;

  if (savedId) {
      for (const g of groups) {
          const found = (g.accounts || []).find(a => a.id === savedId || a.id.replace('act_', '') === savedId);
          if (found) {
              targetAccount = found;
              targetToken = g.token;
              break;
          }
      }
  }

  if (!targetAccount && groups.length > 0) {
      for (const g of groups) {
          if (g.accounts && g.accounts.length > 0) {
              targetAccount = g.accounts[0];
              targetToken = g.token;
              break;
          }
      }
  }

  if (targetAccount) {
      let cleanId = targetAccount.id.replace('act_', '');
      ACCOUNT_ID = cleanId;
      window.ACCOUNT_ID = cleanId;
      window.APP_CONFIG.META_TOKEN = targetToken;
      // Lưu Global Currency, mặc định là VND nếu tài khoản cũ chưa có field này
      window.GLOBAL_CURRENCY = targetAccount.currency || 'VND';
      updateSelectedAccountUI(targetAccount.name, cleanId, "./assets/dom_avatar.jpg");
  } else {
      window.GLOBAL_CURRENCY = 'VND';
      updateSelectedAccountUI("Chưa có Account", "---", "./assets/dom_avatar.jpg");
  }
}

function updateSelectedAccountUI(name, id, avatarUrl) {
  const selectedInfo = document.querySelector(".dom_account_view_block");
  if (!selectedInfo) return;

  const avatar = selectedInfo.querySelector(".account_item_avatar");
  const nameEl = selectedInfo.querySelector(".account_item_name");
  const idEl   = selectedInfo.querySelector(".account_item_id");

  if (avatar) avatar.src          = avatarUrl || "./assets/dom_avatar.jpg";
  if (nameEl) nameEl.textContent  = name;
  if (idEl)   idEl.textContent    = id;
}
