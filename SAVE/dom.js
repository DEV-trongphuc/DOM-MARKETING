let globalDataCache = null;
const goalMapping = {
  "Lead Form": ["LEAD_GENERATION", "QUALITY_LEAD"],
  Awareness: ["REACH", "AD_RECALL_LIFT", "IMPRESSIONS"],
  Engagement: ["POST_ENGAGEMENT", "THRUPLAY", "EVENT_RESPONSES"],
  Message: ["REPLIES"],
  Traffic: [
    "OFFSITE_CONVERSIONS",
    "LINK_CLICKS",
    "PROFILE_VISIT",
    "LANDING_PAGE_VIEWS",
  ],
  Pagelike: ["PAGE_LIKES"],
};
const resultMapping = {
  REACH: "reach",
  LEAD_GENERATION: "lead",
  QUALITY_LEAD: "lead",
  THRUPLAY: "video_view",
  POST_ENGAGEMENT: "post_engagement",
  PROFILE_VISIT: "link_click",
  LINK_CLICKS: "link_click",
  LADING_PAGE_VIEWS: "link_click",
  REPLIES: "messenger_start",
  IMPRESSIONS: "impressions",
  PAGE_LIKES: "follows",
};
const sumFields = [
  "spend",
  "reach",
  "impressions",
  "result",
  "-",
  "-",
  "-",
  "follows",
  "reactions",
  "messenger_start",
  "lead",
  "-",
  "post_engagement",
  "page_engagement",
  "video_view",
  "photo_view",
  "comments",
  "post_save",
  "share",
  "link_click",
];
// VARIABLE DATA
let globalData = {}; // Biến global
let startDate = "";
let endDate = "";
let query = "";
let dataFullAdset = [];
let dataCampaignNow = [];
let tableDataGlobal = [];
let dataAdsetNow = [];
let listHighCPM = [];
let allDatasets = [];
let allMonthlysets = [];
let isViewPerformance = false;
let isViewHighCPM = false;
let quickID = 0;
let activeCampaignID = 0;
let year = 2025;
let campaignNOW = "";
let adsetNOW = "";
let date_preset = "";
let accessTokenView = "";
let adAccountIdView = "";
let selectedViewMonthly = "Spend";
// CHART VAR
let chartSpentType = null;
let dailyChartInstance = null;
let hourlyChartInstance = null;
let genderChartInstance = null;
let ageGenderChartInstance = null;
let regionChartInstance = null;
let reachChartInstance = null; // Biến lưu trữ biểu đồ

let businessID = "1455833788582384";
const actionTypes = {
  follows: "like",
  lead: "onsite_conversion.lead_grouped",
  reactions: "post_reaction",
  comments: "comment",
  share: "post",
  link_click: "link_click",
  messenger_start: "onsite_conversion.messaging_conversation_started_7d",
  post_engagement: "post_engagement",
  page_engagement: "page_engagement",
  photo_view: "photo_view",
  video_view: "video_view",
  post_save: "onsite_conversion.post_save",
};
// VARIAVLE DOM
const menuItems = document.querySelectorAll(".dom_main_menu li");
const menu = document.querySelector(".dom_main_menu");
const demoTitleCampaign = document.querySelector(
  ".dom_demographic_title_item.campaign"
);
const demoTitleAdset = document.querySelector(
  ".dom_demographic_title_item.adset"
);
const impression_chart_ul = document.querySelector(".dom_toplist.device");
const loading = document.querySelector(".loading");
const dom_payment_block = document.querySelector(".dom_payment_block");
const dom_account_view_block = document.querySelector(
  ".dom_account_view_block"
);
const dom_account_viewUl = document.querySelector(".dom_account_view ul");
const dom_warning = document.querySelector(".dom_warning");
const fixapp = document.querySelector("#fixapp");
const dom_sidebar = document.querySelector("#dom_sidebar");
const domPayment = document.querySelector("#dom_payment");
const domContent = document.querySelector("#dom_content");
const dom_demographic_back = document.querySelector(".dom_demographic_title i");
const dom_demographic = document.querySelector(".dom_demographic");
const menuQuick = document.querySelector(".dom_sub_menu");
const blockSpentChart = document.querySelector(".spent_chart");
const dom_filter_head_title = document.querySelector(".dom_filter_head h2");
const timeItems = document.querySelectorAll(".dom_select_show.time li");
const switchBtns = document.querySelectorAll(".dom_switch_btns p");
const selecItemTime = document.querySelector(".dom_selected.time");
const selecItemDaily = document.querySelector(".dom_selected.daily");
const selecItemMonthly = document.querySelector(".dom_selected.monthly");
const selecItemYearly = document.querySelector(".dom_selected.yearly");
const selecItemYearlyUl = document.querySelector(".dom_select_show.yearly");

const selecItemDailyText = document.querySelector(
  ".dom_selected.daily .dom_selected_text"
);
const selecItemMonthlyText = document.querySelector(
  ".dom_selected.monthly .dom_selected_text"
);
const selecItemYearlyText = document.querySelector(
  ".dom_selected.yearly .dom_selected_text"
);
const zoomBtn = document.querySelector(".dom_logo > i");
const barBtn = document.querySelector(".dom_navbar");
const dom_total = document.querySelector(".dom_total");
const dom_totalDemographic = document.querySelector(".dom_total.demographic");
const table = document.getElementById("main_table");
const tableBody = document.querySelector("#main_table > tbody");
const tableHead = document.querySelector("#main_table > thead");
const tableFooter = document.querySelector("#main_table > tfoot");
const dom_toplist = document.querySelector(".dom_toplist");
const dom_toplist_event = document.querySelector(".dom_toplist.event");
const searchInput = document.querySelector(".dom_search");
const dom_rpr = document.querySelector(".dom_rpr");
const dom_cpm = document.querySelector(".dom_cpm");
const dom_userP = document.querySelector(".dom_user p");
const dom_userIMG = document.querySelector(".dom_user img");
const custom_item = document.querySelector(".custom_item");
const dom_time_show = document.querySelector("#dom_time_show");
const dom = document.querySelector("#dom");
const dom_alert = document.querySelector(".dom_alert");
const dom_checked = document.querySelector("#dom_checked");
const dom_alert_content = document.querySelector(".dom_alert_content");
const dom_alert_title = document.querySelector(".dom_alert_title");
const dom_export_main = document.querySelector(".dom_export_main");
const apply_custom_date = document.querySelector(".apply_custom_date");
const selectCampaignList = document.querySelector(
  ".dom_selected.campaign .dom_select_show"
);
const selectAdsetList = document.querySelector(
  ".dom_selected.adset .dom_select_show"
);
const selectCampaign = document.querySelector(".dom_selected.campaign");
const selectAdset = document.querySelector(".dom_selected.adset");
const frequency_impression = document.querySelector(
  ".dom_frequency_label_impression"
);
const frequency_reach = document.querySelector(".dom_frequency_label_reach");
const selecedTextTime = document.querySelector(
  ".dom_selected.time .dom_selected_text"
);
const selecedTextCampaign = document.querySelector(
  ".dom_selected.campaign .dom_selected_text"
);
const selecedTextAdset = document.querySelector(
  ".dom_selected.adset .dom_selected_text"
);

const dom_accounts_btn_add = document.querySelector(".dom_accounts_btn_add");
const dom_accounts_btn_close = document.querySelector(
  ".dom_accounts_btn_close"
);
const accounts_btn = document.querySelector("#accounts_btn");
const dom_close = document.querySelectorAll(".dom_close");
const dom_close_edit = document.querySelector(".dom_close_edit");
const dom_accounts = document.querySelector(".dom_accounts");
const dom_sidebar_overlay = document.querySelector(".dom_sidebar_overlay");
const dom_accounts_list = document.querySelector(".dom_accounts_list");
const view_report = document.querySelector("#view_report");
const dom_edit_info = document.querySelector(".dom_edit_info");
const dom_accounts_overlay = document.querySelector(".dom_accounts_overlay");
const key_check = document.querySelector("#key_check");
const key_adset = document.querySelector("#key_adset");
const confirm_keyword = document.querySelector("#confirm_keyword");
const dom_key_checkLabel = document.querySelector(".dom_key_check ~ label");
const dom_accounts_p = document.querySelector(".dom_accounts_p");
const dom_accounts_btn_qr = document.querySelector(".dom_accounts_btn_qr");
// RENDER

async function shortenURL(longUrl) {
  loading.classList.add("active");
  const response = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  );
  loading.classList.remove("active");
  return response.text();
}

dom_accounts_btn_qr.addEventListener("click", async () => {
  // 🛠 Thêm async ở đây
  // 🔥 Mã hóa dữ liệu thành Base64
  const encodedAccounts = LZString.compressToEncodedURIComponent(
    JSON.stringify(accounts)
  );
  // 🔥 Tạo URL chứa `?sync=`
  const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${encodedAccounts}`;

  // 🔥 Rút gọn link (chờ kết quả)
  const shortUrl = await shortenURL(syncUrl);

  // 🔥 Copy URL vào clipboard
  const title = "Scan QR to sync phone";
  const content = `
       <p class="dom_connect">
          <i class="fa-solid fa-qrcode title_icon"></i> <span>Quét mã QR và <b>mở bằng trình duyệt</b> </span>
để đồng bộ tài khoản quảng cáo.
        </p>
        <p>
        <img class="dom_alert_qr" src=${`https://api.qrserver.com/v1/create-qr-code/?data=${shortUrl}`}/>
        </p>
      `;
  renderAlert(title, content);
});

dom_close.forEach((item) => {
  item.addEventListener("click", () => {
    if (accounts.length) {
      handleBackRemove();
    }
  });
});
function handleBackRemove() {
  dom_accounts.classList.remove("add");
  dom_accounts.classList.remove("edit");
}
let accounts = (() => {
  try {
    let localData = localStorage.getItem("accounts");
    let localAccounts = localData ? JSON.parse(localData) : [];

    // 🟢 Lấy tham số từ URL, bỏ tracking `utm_*` và `zarsrc`
    const urlParams = new URLSearchParams(window.location.search);
    const encodedSync = urlParams.get("sync")?.split("&")[0].replace(/\/$/, "");

    if (encodedSync) {
      try {
        // 🔥 Giải mã đúng cách bằng LZString
        const decodedString =
          LZString.decompressFromEncodedURIComponent(encodedSync);
        const syncAccounts = JSON.parse(decodedString);

        if (Array.isArray(syncAccounts) && syncAccounts.length) {
          const existingIds = new Set(localAccounts.map((acc) => acc.id));
          const newAccounts = syncAccounts.filter(
            (acc) => !existingIds.has(acc.id)
          );

          if (newAccounts.length) {
            dom_accounts.classList.add("active");
            localAccounts = [...localAccounts, ...newAccounts];
            localStorage.setItem("accounts", JSON.stringify(localAccounts));

            const title = "Sync Advertising Accounts";

            // 🔥 Danh sách tài khoản mới được thêm
            const addedNamesHTML = newAccounts
              .map(
                (item) => `
                <p><i class="fa-solid fa-rectangle-ad title_icon"></i> ${item.name}</p>
              `
              )
              .join("");

            const content = `
              <p class="dom_connect">
                <i class="fa-solid fa-link"></i> <span>Successfully connected </span>
                <b>[${newAccounts.length}]</b> advertising accounts
              </p>
              ${addedNamesHTML}
               <p>
              <i class="fa-solid fa-award title_icon"></i>DOM cam kết ID và
              Token của bạn chỉ được lưu trữ ở trình duyệt - Local. Chúng tôi
              <b>KHÔNG THU THẬP</b> bất kỳ thông tin nào về tài khoản quảng cáo
              của bạn. Mọi API được gửi và nhận đều thuộc Marketing API chính
              thức của Meta. DOM sẽ chịu hoàn toàn trách nhiệm nếu phát hiện thu
              thập thông tin liên quan đến ID và Token của bạn.
            </p>
            <p>
              <i class="fa-solid fa-award title_icon"></i>DOM commits that your
              ID and Token are only stored in the Local browser. We DO NOT
              COLLECT any information about your advertising account. All APIs
              sent and received are part of Meta's official Marketing API. DOM
              will take full responsibility if discovered about collecting your
              ID and Access Token.
            </p>
            `;

            renderAlert(title, content);
          } else {
            const title = "Sync accounts";
            const content = `
 <p class="dom_connect">
        <i class="fa-solid fa-triangle-exclamation title_icon"></i> There are no new accounts to sync
      </p>
`;
            renderAlert(title, content);
          }
        }
      } catch (error) {
        console.error("Lỗi giải mã sync:", error);
        const title = "Something Error";
        const content = `
       <p class="dom_connect">
              <i class="fa-solid fa-triangle-exclamation title_icon"></i> Access Token is wrong or Meta API server is interrupted, please try again!
            </p>
      `;
        renderAlert(title, content);
      }
    }

    return localAccounts;
  } catch (error) {
    console.error("Lỗi parse accounts:", error);
    return [];
  }
})();

// 🟢 Nếu không có accounts thì chuyển hướng sang login hoặc hiển thị giao diện thêm tài khoản
if (!accounts.length) {
  // window.location.href = "/login.html";
  dom_accounts.classList.add("active");
  dom_accounts.classList.add("add");
}

// 🟢 Lấy ID từ localStorage (mặc định là 0 nếu không hợp lệ)
let accountViewID = parseInt(localStorage.getItem("account_view"), 10);
if (
  isNaN(accountViewID) ||
  accountViewID < 0 ||
  accountViewID >= accounts.length
) {
  accountViewID = 0;
  localStorage.setItem("account_view", "0");
}

// 🟢 Kiểm tra URL xem có `act` không
const urlParams = new URLSearchParams(window.location.search);
const encodedAct = urlParams.get("act");

let viewMaster = accounts[accountViewID] || accounts[0] || null;

if (encodedAct) {
  try {
    // 🔥 Giải mã dữ liệu từ `act`
    const decodedString =
      LZString.decompressFromEncodedURIComponent(encodedAct);
    const actObject = JSON.parse(decodedString);

    if (actObject && actObject.id) {
      // 🔍 Tìm tài khoản có ID trùng khớp
      const existingAccount = accounts.find((acc) => acc.id === actObject.id);

      if (existingAccount) {
        viewMaster = existingAccount;
      } else {
        accounts.push(actObject);
        localStorage.setItem("accounts", JSON.stringify(accounts));
        viewMaster = actObject;
        handleBackRemove();
        dom_accounts.classList.remove("active");
      }
    }
  } catch (error) {
    console.error("Lỗi giải mã act từ URL:", error);
  }
}

console.log("viewMaster:", viewMaster);

// EVENT
view_report.addEventListener("click", () => {
  const add_id = document.querySelector("#add_id");
  console.log(add_id.checked);
  const accessToken = document.getElementById("access_token").value.trim();
  if (add_id.checked) {
    const adId = document.getElementById("ad_id").value.trim();

    if (!adId || !accessToken) {
      const title = "Wrong input";
      const content = `
   <p class="dom_connect">
          <i class="fa-solid fa-keyboard title_icon"></i> Please enter full Ad ID and Access Token!
        </p>
  `;
      renderAlert(title, content);
      return;
    }

    // Kiểm tra xem có tồn tại trong accounts không
    const isExist = accounts.some((item) => item.id === adId);
    if (isExist) {
      const title = "Already exists";
      const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-rectangle-ad title_icon"></i> Ad ID already exists in the accounts list!
          </p>
    `;
      renderAlert(title, content);
      return;
    }
    fetchAdAccountActivities(adId, accessToken);
  } else {
    if (!accessToken) {
      const title = "Wrong input";
      const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-keyboard title_icon"></i> Please enter an Access Token!
          </p>
    `;
      renderAlert(title, content);
      return;
    }
    const title = "Connect all Accounts";
    const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-link"></i> <span>Connected to </span
            ><b>[Connect ALL the accounts you manage]</b>
          </p>
          <p>
            <i class="fa-solid fa-award title_icon"></i>DOM cam kết ID và
            Token của bạn chỉ được lưu trữ ở trình duyệt - Local. Chúng tôi
            <b>KHÔNG THU THẬP</b> bất kỳ thông tin nào về tài khoản quảng cáo
            của bạn. Mọi API được gửi và nhận đều thuộc Marketing API chính
            thức của Meta. DOM sẽ chịu hoàn toàn trách nhiệm nếu phát hiện thu
            thập thông tin liên quan đến ID và Token của bạn.
          </p>
          <p>
            <i class="fa-solid fa-award title_icon"></i>DOM commits that your
            ID and Token are only stored in the Local browser. We DO NOT
            COLLECT any information about your advertising account. All APIs
            sent and received are part of Meta's official Marketing API. DOM
            will take full responsibility if discovered about collecting your
            ID and Access Token.
          </p>
    `;
    renderAlertWithCallback(title, content, () => fetchAdAccounts(accessToken));
  }
  return;
});

dom_accounts_btn_add.addEventListener("click", () => {
  dom_accounts.classList.add("add");
});
accounts_btn.addEventListener("click", () => {
  dom_accounts.classList.add("active");
});
dom_accounts_btn_close.addEventListener("click", () => {
  accounts.length && dom_accounts.classList.remove("active");
});
dom_accounts_overlay.addEventListener("click", () => {
  accounts.length && dom_accounts.classList.remove("active");
});

document.getElementById("key_check").addEventListener("change", function () {
  document
    .querySelector(".dom_key_check ~ label")
    .classList.toggle("active", this.checked);
});
document.getElementById("add_id").addEventListener("change", function () {
  document
    .querySelector(".dom_add_id ~ label")
    .classList.toggle("active", this.checked);
});

dom_account_view_block.addEventListener("click", () => {
  dom_account_view_block.classList.toggle("active");
});
dom_export_main.addEventListener("click", () => {
  let table = document.getElementById("main_table"); // Lấy bảng
  let wb = XLSX.utils.book_new(); // Tạo workbook
  let ws = XLSX.utils.table_to_sheet(table); // Chuyển bảng thành sheet

  XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); // Thêm sheet vào workbook

  // Xuất file Excel
  XLSX.writeFile(wb, "table_data.xlsx");
});

fixapp.addEventListener("click", () => {
  // Xóa toàn bộ dữ liệu trong localStorage
  localStorage.clear();

  // Reload lại trang
  location.reload();
});

const toggleClass = (element, className) => {
  element.classList.toggle(className);
};

const removeClass = (element, className) => {
  element.classList.remove(className);
};

barBtn.addEventListener("click", () => toggleClass(dom_sidebar, "active"));
dom_sidebar.addEventListener("click", () => removeClass(dom_sidebar, "active"));
dom_sidebar_overlay.addEventListener("click", () =>
  removeClass(dom_sidebar, "active")
);

const cpmThresholds = {
  Awareness: 7000,
  "Lead Form": 120000,
  Message: 150000,
  Engagement: 100000,
};

// Tạo Set cho từng nhóm mục tiêu
const goalSets = Object.fromEntries(
  Object.entries(goalMapping)
    .filter(([key]) => cpmThresholds[key]) // Lọc chỉ lấy các nhóm có ngưỡng CPM
    .map(([key, values]) => [key, new Set(values)])
);
dom_warning.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  isViewHighCPM = true;
  listHighCPM = dataFullAdset.filter(
    ({ spend, impressions, optimization_goal }) => {
      if (!impressions || impressions <= 0) return false; // Tránh lỗi chia cho 0

      const cpm = (spend * 1000) / impressions;

      return Object.entries(goalSets).some(
        ([goal, set]) => set.has(optimization_goal) && cpm > cpmThresholds[goal]
      );
    }
  );
  console.log(listHighCPM);

  blockSpentChart.classList.remove("none");
  showPerformanceTab();
  dom.classList.add("isViewPerformance");
  isViewPerformance = true;
  localStorage.viewPerformance = "1";
  activeCampaignID = 0;
  dom_filter_head_title.textContent = `High CPM`;
  selecedTextCampaign.textContent = "Data for all campaigns";
  campaignNOW = "";
  adsetNOW = "";
  renderCampaignRadioBox(listHighCPM);
  viewFilter(listHighCPM);
  selectAdset.classList.remove("show");
  blockSpentChart.classList.remove("none");
  removeActiveOnly(".dom_sub_menu li.active");
  removeActiveOnly(".dom_main_menu li.active");
});

zoomBtn.addEventListener("click", () => {
  toggleClass(dom, "zoom");
  if (window.innerWidth <= 768) removeClass(dom, "zoom");
});

selectCampaign.addEventListener("click", () => {
  removeActiveFrom(".dom_selected.adset.active");
  toggleClass(selectCampaign, "active");
});

dom_demographic_back.addEventListener("click", () =>
  removeClass(dom_demographic, "active")
);

tableBody.addEventListener("click", (event) => {
  const target = event.target.closest(".view_insights");
  if (!target) return;

  const row = target.closest("tr");
  if (!row) return;

  handleViewDemographic(
    row.dataset.campaign || "Unknown",
    row.dataset.adset || "Unknown",
    row.dataset.id || 0
  );
});

selectAdset.addEventListener("click", () => {
  removeActiveFrom(".dom_selected.campaign.active");
  toggleClass(selectAdset, "active");
});

function removeActiveFrom(selector) {
  const activeItem = document.querySelector(selector);
  if (activeItem) {
    activeItem.classList.remove("active");
  }
}

// Gọi hàm này khi DOM đã load
const debouncedFilter = useDebounce((e) => {
  filterTableByCampaign(e.target.value);
}, 1000);

searchInput.addEventListener("input", debouncedFilter);

switchBtns.forEach((item, index) => {
  item.addEventListener("click", () => {
    setActiveOnly(item, ".dom_switch_btns p.active");
    index === 0
      ? renderTopCampaign(dataCampaignNow)
      : renderTopAdset(dataAdsetNow);
  });
});

document.addEventListener("change", function (event) {
  if (event.target.id === "dom_select_all") {
    const isChecked = event.target.checked;
    document.querySelectorAll(".dom_select_row").forEach((checkbox) => {
      checkbox.checked = isChecked;
      const row = checkbox.closest("tr");
      if (row) {
        row.classList.toggle("checked", isChecked);
      }
    });
    updateFooterOnCheck(tableDataGlobal);
  } else if (event.target.classList.contains("dom_select_row")) {
    const row = event.target.closest("tr");
    if (row) {
      row.classList.toggle("checked", event.target.checked);
    }

    // Kiểm tra nếu tất cả đều được check thì check luôn "Select All"
    const allCheckboxes = document.querySelectorAll(".dom_select_row");
    const checkedBoxes = document.querySelectorAll(".dom_select_row:checked");
    document.getElementById("dom_select_all").checked =
      allCheckboxes.length > 0 && allCheckboxes.length === checkedBoxes.length;
    updateFooterOnCheck(tableDataGlobal);
  }
});
apply_custom_date.addEventListener("click", () => {
  const startDateIp = document.getElementById("start").value;
  const endDateIp = document.getElementById("end").value;

  if (!startDateIp || !endDateIp) {
    const title = "Custome date";
    const content = `
   <p class="dom_connect">
          <i class="fa-solid fa-calendar-days title_icon"></i> Please select both start and end dates.
        </p>
  `;
    renderAlert(title, content);

    return;
  }

  const startDateObj = new Date(startDateIp);
  const endDateObj = new Date(endDateIp);
  const currentDate = new Date();
  const maxPastDate = new Date();
  maxPastDate.setMonth(currentDate.getMonth() - 37); // Lùi lại 37 tháng

  if (startDateObj > endDateObj) {
    const title = "Custome date";
    const content = `
   <p class="dom_connect">
          <i class="fa-solid fa-calendar-days title_icon"></i> Start date cannot be later than the end date.
        </p>
  `;
    renderAlert(title, content);
    return;
  }

  if (startDateObj < maxPastDate) {
    const title = "Custome date";
    const content = `
   <p class="dom_connect">
          <i class="fa-solid fa-calendar-days title_icon"></i> Start date cannot be older than 37 months from TODAY.
        </p>
  `;
    renderAlert(title, content);
    return;
  }

  startDate = startDateIp;
  endDate = endDateIp;
  setActiveOnly(custom_item, ".dom_select_show.time li.active");
  selecedTextTime.textContent = "Custom Range";
  date_preset = "custom_date";
  mainApp();
});

selecItemTime.addEventListener("click", (event) => {
  if (event.target === selecItemTime) {
    selecItemTime.classList.toggle("active");
  }
});

timeItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (index != timeItems.length - 1) {
      if (item.classList.contains("active")) {
        selecItemTime.classList.remove("active");
        return;
      }

      setActiveOnly(item, ".dom_select_show.time li.active");
      selecedTextTime.textContent = item.textContent.trim();
      date_preset = item.dataset.date;
      mainApp();
      if (
        !isViewPerformance &&
        !document
          .querySelector(".dom_main_menu li")
          ?.classList.contains("active")
      ) {
        showPerformanceTab();
        removeActiveOnly(".dom_main_menu li.active");
        document.querySelector(".dom_main_menu li").classList.add("active");
        removeActiveOnly(".dom_sub_menu li.active");
        blockSpentChart.classList.remove("none");
        localStorage.removeItem("viewPerformance");
      }
    } else {
      return;
    }
  });
});

selecItemDaily.addEventListener("click", (event) => {
  selecItemDaily.classList.toggle("active");

  const clickedItem = event.target.closest("li");
  if (clickedItem && !clickedItem.classList.contains("active")) {
    setActiveOnly(clickedItem, ".dom_select_show.daily li.active");
    const dataView = clickedItem.dataset.view;
    selecItemDailyText.textContent = dataView;
    updateChart(dataView);
  }
});

selecItemMonthly.addEventListener("click", (event) => {
  selecItemMonthly.classList.toggle("active");

  const clickedItem = event.target.closest("li");
  if (clickedItem && !clickedItem.classList.contains("active")) {
    setActiveOnly(clickedItem, ".dom_select_show.monthly li.active");
    const dataView = clickedItem.dataset.view;
    selecItemMonthlyText.textContent = dataView;
    updateChartMonthly(dataView);
  }
});

selecItemYearly.addEventListener("click", (event) => {
  selecItemYearly.classList.toggle("active");
  const clickedItem = event.target.closest("li");

  if (clickedItem && !clickedItem.classList.contains("active")) {
    setActiveOnly(clickedItem, ".dom_select_show.yearly li.active");
    const dataView = clickedItem.dataset.view;
    selecItemYearlyText.textContent = dataView;
    fetchDataMonthly(dataView, true);
  }
});

// RENDER WHEN LOADED

// MENU LOGIC
menu.addEventListener("click", (event) => {
  const item = event.target.closest("li");
  if (!item || item.classList.contains("active")) return;

  setActiveOnly(item, ".dom_main_menu li.active");

  isViewPerformance = false;
  isViewHighCPM = false;
  dom.classList.remove("isViewPerformance");

  const index = Array.from(item.parentElement.children).indexOf(item);
  window.scrollTo({ top: 0, behavior: "smooth" });
  switch (index) {
    case 0:
      showPerformanceTab();
      useData(dataFullAdset, true);
      removeActiveOnly(".dom_sub_menu li.active");
      blockSpentChart.classList.remove("none");
      switchBtns[0].click();
      localStorage.removeItem("viewPerformance");
      break;

    case 1:
      handleViewPerformance();
      break;
    case 2:
      showPaymentTab();
      break;
  }
});
function showPerformanceTab() {
  domContent.classList.remove("none");
  domPayment.classList.add("none");
}
menuQuick.addEventListener("click", (event) => {
  const listItem = event.target.closest("li");
  if (!listItem) return;
  isViewHighCPM = false;
  quickID = Number(listItem.dataset.index);
  handleViewPerformance(listItem);

  updateUIForQuickFilter(listItem);
});
function showPaymentTab() {
  domContent.classList.add("none");
  domPayment.classList.remove("none");
}
// FUNCTION
// Fetch Function

async function getUserId(accessToken) {
  const url = `https://graph.facebook.com/v22.0/me?fields=id&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Lỗi API: ${response.status} - ${response.statusText}`);

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Lỗi khi lấy User ID:", error.message);
    return null;
  }
}

async function fetchAdAccounts(accessToken) {
  loading.classList.add("active");
  const userId = await getUserId(accessToken);
  if (!userId) {
    loading.classList.remove("active");
    renderAlert(
      "Error",
      "<p>Access Token không hợp lệ hoặc hết hạn. Vui lòng kiểm tra lại.</p>"
    );
    return [];
  }

  const url = `https://graph.facebook.com/v22.0/${userId}/adaccounts?fields=id&access_token=${accessToken}`;
  let addedAccounts = []; // Danh sách tài khoản mới thêm

  try {
    const response = await fetch(url);
    if (!response.ok) {
      loading.classList.remove("active");
      renderAlert(
        "Error",
        `<p>Access Token không hợp lệ hoặc hết hạn. Vui lòng kiểm tra lại.</p>`
      );
      throw new Error(`Lỗi API: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const adAccounts = data.data || [];

    const newAccounts = adAccounts.filter(
      (acc) => !accounts.some((item) => item.id === acc.id.replace("act_", ""))
    );

    const fetchPromises = newAccounts.map((acc) =>
      fetchAdAccountInfoAndAdd(acc.id.replace("act_", ""), accessToken)
    );

    // Chờ tất cả request hoàn thành
    const results = await Promise.all(fetchPromises);
    loading.classList.remove("active");
    addedAccounts = results.filter((acc) => acc !== null);

    if (addedAccounts.length > 0) {
      const title = "Sync Advertising Accounts";

      // 🔥 Danh sách tài khoản mới được thêm
      const addedNamesHTML = addedAccounts
        .map(
          (item) => `
          <p><i class="fa-solid fa-rectangle-ad title_icon"></i> ${item.name}</p>
        `
        )
        .join("");

      const content = `
        <p class="dom_connect">
          <i class="fa-solid fa-link"></i> <span>Successfully connected </span>
          <b>[${addedAccounts.length}]</b> advertising accounts
        </p>
        ${addedNamesHTML}
        <p>
          <i class="fa-solid fa-award title_icon"></i>DOM cam kết ID và
          Token của bạn chỉ được lưu trữ ở trình duyệt - Local. Chúng tôi
          <b>KHÔNG THU THẬP</b> bất kỳ thông tin nào về tài khoản quảng cáo
          của bạn. Mọi API được gửi và nhận đều thuộc Marketing API chính
          thức của Meta. DOM sẽ chịu hoàn toàn trách nhiệm nếu phát hiện thu
          thập thông tin liên quan đến ID và Token của bạn.
        </p>
        <p>
          <i class="fa-solid fa-award title_icon"></i>DOM commits that your
          ID and Token are only stored in the Local browser. We DO NOT
          COLLECT any information about your advertising account. All APIs
          sent and received are part of Meta's official Marketing API. DOM
          will take full responsibility if discovered about collecting your
          ID and Access Token.
        </p>
      `;

      renderAlert(title, content);
      renderListAccounts();
      renderMasterView();
    } else {
      renderAlert(
        "Sync Advertising Accounts",
        "<p>Không có tài khoản mới nào được thêm.</p>"
      );
    }
  } catch (error) {
    loading.classList.remove("active");
    console.error("Lỗi khi fetch Ad Accounts:", error.message);
  }
}

async function fetchData(start, end) {
  loading.classList.add("active");
  const apiUrl = `https://graph.facebook.com/v22.0/act_${adAccountIdView}/insights?level=adset&fields=campaign_name,adset_name,adset_id,spend,impressions,reach,actions,optimization_goal&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&time_range={"since":"${start}","until":"${end}"}&access_token=${accessTokenView}&limit=1000`;

  let allData = [];
  let nextUrl = apiUrl;

  try {
    while (nextUrl) {
      const res = await fetch(nextUrl);
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      allData.push(...(data.data || []));
      nextUrl = data.paging?.next || null;
    }

    // ⚡️ Tạo mảng promise để chạy song song
    const promises = allData.map((item) =>
      fetchAdPostsByAdset(item.adset_id, accessTokenView)
    );

    // ⚡️ Đợi tất cả cùng lúc
    const results = await Promise.allSettled(promises);

    // ⚡️ Gắn dữ liệu vào item tương ứng
    for (let i = 0; i < allData.length; i++) {
      const res = results[i];
      if (res.status === "fulfilled") {
        allData[i].posts = res.value.posts;
        allData[i].status = res.value.status;
      } else {
        allData[i].posts = [];
        allData[i].status = "Unknown";
      }
    }

    console.log("✅ All data ready:", allData);
    return allData;
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  } finally {
    loading.classList.remove("active");
  }
}
async function fetchDataDaily(start, end) {
  let apiDaily = `https://graph.facebook.com/v22.0/act_${adAccountIdView}/insights?fields=spend,reach,actions,date_start&time_increment=1&time_range={"since":"${start}","until":"${end}"}&access_token=${accessTokenView}&limit=1000`;

  let allData = [];
  let nextUrl = apiDaily;
  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);

      if (!response.ok) {
        throw new Error(`Network error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        document.querySelector(".loading").classList.remove("active");
        console.error("Error from API:", data.error.message);
        return;
      }
      allData = [...allData, ...(data.data || [])];
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }
    return allData;
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function fetchDataMonthly(year, isUpdate) {
  console.log(year);

  if (isUpdate) {
    loading.classList.add("active");
  }

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const apiMonthly = `https://graph.facebook.com/v22.0/act_${adAccountIdView}/insights?fields=spend,reach,actions,date_start&time_increment=monthly&time_range={"since":"${start}","until":"${end}"}&access_token=${accessTokenView}&limit=1000`;

  let allData = [];
  let nextUrl = apiMonthly;
  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);

      if (!response.ok) {
        throw new Error(`Network error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        document.querySelector(".loading").classList.remove("active");
        console.error("Error from API:", data.error.message);
        return;
      }
      allData = [...allData, ...(data.data || [])];
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }
    console.log(allData);

    handleMonthly(allData);
    if (isUpdate) {
      loading.classList.remove("active");
    }

    // return allData;
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function handleViewPerformance(item) {
  showPerformanceTab();
  dom.classList.add("isViewPerformance");
  isViewPerformance = true;
  localStorage.viewPerformance = "1";

  if (item) return;
  const quickItem = document.querySelector(
    `.dom_sub_menu li[data-index="${quickID}"]`
  );
  if (quickItem) quickItem.click();
}
function renderQuickFilter() {
  const fragment = document.createDocumentFragment();

  quickFilter.forEach((item, index) => {
    const li = document.createElement("li");
    li.dataset.filter = item;
    li.dataset.index = index;
    li.innerHTML = `<i class="fa-solid fa-bolt"></i><span>${item}</span>`;
    fragment.appendChild(li);
  });

  menuQuick.innerHTML = ""; // Clear trước khi thêm mới
  menuQuick.appendChild(fragment);
}

function updateUIForQuickFilter(listItem) {
  setActiveOnly(listItem, ".dom_sub_menu li.active");
  activeCampaignID = 0;

  const filterKey = quickFilter[quickID];
  dom_filter_head_title.textContent = `Report for ${filterKey}`;
  selecedTextCampaign.textContent = "Data for all campaigns";

  campaignNOW = "";
  adsetNOW = "";

  const dataFilter = quickFilterData(filterKey);
  renderCampaignRadioBox(dataFilter);
  viewFilter(dataFilter);

  selectAdset.classList.remove("show");
  localStorage.quickID = quickID;
  blockSpentChart.classList.remove("none");
}

function viewFilter(dataFilter) {
  if (!menuItems[1].classList.contains("active")) {
    document
      .querySelector(".dom_main_menu li.active")
      ?.classList.remove("active");
    menuItems[1].classList.add("active");
  }

  useData(dataFilter);
  switchBtns[Number(!!campaignNOW)].click(); // 1 nếu có campaignNOW, 0 nếu không
}

function quickFilterData(goal, campaign, adset) {
  const sourceData = isViewHighCPM ? listHighCPM : dataFullAdset;

  if (!isViewHighCPM && !isBrand && (!goal || !goalMapping[goal])) {
    throw new Error("Invalid or missing goal");
  }

  return sourceData.filter(
    (item) =>
      (isViewHighCPM || // Nếu đang xem HighCPM thì bỏ qua goal
        (isBrand
          ? item.campaign_name.toLowerCase().includes(goal.toLowerCase())
          : goalMapping[goal].includes(item.optimization_goal))) &&
      (!campaign || item.campaign_name === campaign) &&
      (!adset || item.adset_name === adset)
  );
}

function renderTopCampaign(data) {
  if (!data || typeof data !== "object" || !dom_toplist) return;
  if (typeof formatCurrency !== "function") {
    console.warn("formatCurrency is not defined");
    return;
  }

  const campaignArray = [];
  let maxValue = 0;

  // Duyệt data 1 lần, vừa lọc vừa tìm max
  for (const [name, value] of Object.entries(data)) {
    const numValue = parseFloat(value) || 0;
    if (numValue > 0) {
      campaignArray.push([name, numValue]);
      if (numValue > maxValue) maxValue = numValue;
    }
  }

  if (!campaignArray.length) {
    dom_toplist.replaceChildren();
    return;
  }

  // Sắp xếp giảm dần
  campaignArray.sort((a, b) => b[1] - a[1]);

  const fragment = document.createDocumentFragment();

  for (let i = 0, len = campaignArray.length; i < len; i++) {
    const [name, value] = campaignArray[i];

    const listItem = document.createElement("li");

    const title = document.createElement("p");
    title.innerHTML = `<span>${name}</span><span>${formatCurrency(
      value
    )}</span>`;

    const barContainer = document.createElement("p");
    const bar = document.createElement("span");
    bar.classList.add("progress-bar");
    bar.style.width = `${((value / maxValue) * 100).toFixed(2)}%`;

    barContainer.appendChild(bar);
    listItem.appendChild(title);
    listItem.appendChild(barContainer);
    fragment.appendChild(listItem);
  }

  dom_toplist.replaceChildren(fragment);
}

function getUniqueCampaignNames(data) {
  if (!Array.isArray(data)) return [];

  return [...new Set(data.map((item) => item.campaign_name).filter(Boolean))];
}

function renderCampaignRadioBox(data) {
  if (!data || typeof data !== "object" || !selectCampaignList) return;

  const campaignArray = getUniqueCampaignNames(data);

  selectCampaignList.innerHTML = [
    `<li class="campaign-item active" data-index="0">
      <span class="radio_box"></span>
      <span>Data for all campaigns</span>
    </li>`,
    ...campaignArray.map(
      (name, index) => `
      <li class="campaign-item" data-index="${index + 1}" data-name="${name}">
        <span class="radio_box"></span>
        <span>${name}</span>
      </li>
    `
    ),
  ].join("");
}

selectCampaignList.addEventListener("click", (event) => {
  const item = event.target.closest(".campaign-item");
  if (!item) return;

  const index = Number(item.dataset.index);
  if (index === activeCampaignID) return; // Nếu click lại chính nó thì bỏ qua

  const selectedCampaign = item.dataset.name || "Data for all campaigns";

  // Cập nhật class active chỉ khi cần
  const activeItem = document.querySelector(".campaign-item.active");
  if (activeItem) activeItem.classList.remove("active");
  item.classList.add("active");

  // Cập nhật biến trạng thái
  activeCampaignID = index;
  if (selecedTextCampaign.textContent !== selectedCampaign) {
    selecedTextCampaign.textContent = selectedCampaign;
  }

  adsetNOW = "";
  campaignNOW = index > 0 ? selectedCampaign : "";

  selectAdset.classList.toggle("show", index > 0);

  if (index > 0) {
    const sourceData = isViewHighCPM ? listHighCPM : dataFullAdset;

    const filteredAdsets = sourceData.filter(
      (adset) => adset.campaign_name === selectedCampaign
    );

    renderAdsetinCampaign(filteredAdsets);

    if (selecedTextAdset?.textContent !== "Data for all adsets") {
      selecedTextAdset.textContent = "Data for all adsets";
    }
  }

  blockSpentChart.classList.remove("none");

  // Lọc và cập nhật giao diện
  const dataFilter = quickFilterData(
    quickFilter[quickID],
    campaignNOW,
    adsetNOW
  );
  viewFilter(dataFilter);
});

function renderAdsetinCampaign(filteredAdsets) {
  selectAdsetList.innerHTML = ""; // Xóa danh sách cũ

  if (!filteredAdsets?.length) return; // Nếu không có adset thì thoát luôn

  const selectFragment = document.createDocumentFragment();

  // 🟢 Hàm tạo item `<li>`
  const createListItem = (name, index, isActive = false) => {
    const li = document.createElement("li");
    li.classList.add("adset-item");
    if (isActive) li.classList.add("active");
    li.dataset.index = index;
    if (name) li.dataset.name = name;
    li.innerHTML = `
      <span class="radio_box"></span>
      <span>${name || "Data for all adsets"}</span>
    `;
    return li;
  };

  // 🟢 Thêm item "Data for all adsets"
  selectFragment.appendChild(createListItem(null, 0, true));

  // 🔵 Thêm danh sách adset
  filteredAdsets.forEach((item, index) => {
    selectFragment.appendChild(createListItem(item.adset_name, index + 1));
  });

  selectAdsetList.appendChild(selectFragment);
}

selectAdsetList.addEventListener("click", (event) => {
  const item = event.target.closest(".adset-item");
  if (!item || item.classList.contains("active")) return; // Nếu không click vào item hoặc đã active thì bỏ qua

  // Cập nhật class active
  document.querySelector(".adset-item.active")?.classList.remove("active");
  item.classList.add("active");

  const selectedAdset = item.dataset.name || "Data for all adsets";
  if (selecedTextAdset.textContent !== selectedAdset) {
    selecedTextAdset.textContent = selectedAdset;
  }

  adsetNOW = item.dataset.index > 0 ? selectedAdset : "";
  blockSpentChart.classList.toggle("none", adsetNOW !== "");

  // Lọc và cập nhật giao diện
  const dataFilter = quickFilterData(
    quickFilter[quickID],
    campaignNOW,
    adsetNOW
  );
  viewFilter(dataFilter);
});

function renderTopEvent(data) {
  if (!data || typeof data !== "object") return;

  dom_toplist_event.innerHTML = "";

  if (data.result) {
    dom_rpr.textContent = formatNumber((data.reach / data.result).toFixed(0));
  }
  if (data.impressions) {
    dom_cpm.textContent = formatCurrency(
      ((data.spent * 1000) / data.impressions).toFixed(0)
    );
    renderFrequency(data.impressions, data.reach);
  }

  // Lọc và sắp xếp dữ liệu
  const campaignArray = Object.entries(data)
    .filter(
      ([name]) => !["spent", "impressions", "reach", "result"].includes(name)
    )
    .map(([name, value]) => ({ name, value: value || 0 }))
    .sort((a, b) => b.value - a.value);

  if (campaignArray.length === 0) return; // Nếu không có dữ liệu thì thoát luôn

  const maxValue = campaignArray[0].value;
  const fragment = document.createDocumentFragment();

  campaignArray.forEach(({ name, value }) => {
    const listItem = document.createElement("li");

    const title = document.createElement("p");
    const spanName = document.createElement("span");
    spanName.textContent = formatMetricName(name);
    const spanValue = document.createElement("span");
    spanValue.textContent = formatNumber(value);

    title.appendChild(spanName);
    title.appendChild(spanValue);

    const barContainer = document.createElement("p");
    const bar = document.createElement("span");
    bar.style.width = `${((value / maxValue) * 100).toFixed(2)}%`;

    barContainer.appendChild(bar);
    listItem.appendChild(title);
    listItem.appendChild(barContainer);

    fragment.appendChild(listItem);
  });

  dom_toplist_event.appendChild(fragment);
}

function renderFrequency(impressions, reach) {
  const frequency = reach > 0 ? (impressions / reach).toFixed(2) : "0";

  // Cập nhật số Frequency
  document.querySelector(".frequency_number").textContent = frequency;

  // Cập nhật thanh phần trăm
  document.querySelector(".semi-donut").style.setProperty(
    "--percentage",
    Math.min((frequency / 4) * 100, 100) // Giới hạn max 100%
  );

  // Cập nhật Impression & Reach
  frequency_impression.textContent = impressions.toLocaleString();
  frequency_reach.textContent = reach.toLocaleString();
}
function renderTopAdset(data) {
  if (!Array.isArray(data) || data.length === 0) {
    dom_toplist.replaceChildren(); // Xóa sạch nếu không có data
    return;
  }

  // Duyệt 1 lần tính giá trị & lọc luôn dữ liệu hợp lệ
  let maxValue = 0;
  const adsetArray = [];
  for (let i = 0, len = data.length; i < len; i++) {
    const spend = parseFloat(data[i].spend) || 0;
    if (spend > 0) {
      adsetArray.push({
        name: data[i].adset_name || "Unknown",
        value: spend,
      });
      if (spend > maxValue) maxValue = spend; // Cập nhật max luôn
    }
  }

  // Sắp xếp giảm dần theo giá trị chi tiêu
  adsetArray.sort((a, b) => b.value - a.value);

  const fragment = document.createDocumentFragment();

  for (let i = 0, len = adsetArray.length; i < len; i++) {
    const { name, value } = adsetArray[i];

    const listItem = document.createElement("li");

    const title = document.createElement("p");
    title.innerHTML = `<span>${name}</span><span>${formatCurrency(
      value
    )}</span>`;

    const barContainer = document.createElement("p");
    const bar = document.createElement("span");
    bar.classList.add("progress-bar");
    bar.style.width = `${((value / maxValue) * 100).toFixed(2)}%`;

    barContainer.appendChild(bar);
    listItem.appendChild(title);
    listItem.appendChild(barContainer);
    fragment.appendChild(listItem);
  }

  dom_toplist.replaceChildren(fragment); // Cập nhật DOM 1 lần duy nhất
}

function renderTableHead() {
  const columns = [
    '<input type="checkbox" id="dom_select_all">',
    "Campaign Name",
    "Adset Name",
    "Status",
    "Post Link",
    "Insights",
    "Cost Spent",
    "Reach",
    "Impression",
    "Result",
    "CPR",
    "Optimization Goal",
    "Frequency",
    "Follows",
    "Reaction",
    "Messenger Start",
    "Lead",
    "CPM",
    "Post Engagement",
    "Page Engagement",
    "Video view",
    "Photo view",
    "Comments",
    "Post Save",
    "Share",
    "Link Click",
  ];
  if (!tableHead) return;
  tableHead.innerHTML = `<tr>${columns
    .map((col) => `<th>${col}</th>`)
    .join("")}</tr>`;
}
function measureExecutionTime(fn, ...args) {
  const start = performance.now(); // Bắt đầu đo thời gian
  const result = fn(...args); // Gọi hàm cần đo
  const end = performance.now(); // Kết thúc đo
  console.log(`⏳ Execution time: ${(end - start).toFixed(4)} ms`);
  return result; // Trả về kết quả của hàm gốc
}
function processData(data, isCache) {
  const campaignTotal = Object.create(null);
  const optimizationTotal = Object.create(null);
  const brandTotal = Object.create(null);
  const quickFilterSet = new Set(quickFilter);
  const goalMappingMap = new Map(Object.entries(goalMapping));
  const tableData = new Array(data.length);
  const tbodyRows = new Array(data.length);

  // 🔹 Chuẩn bị tổng hợp ban đầu
  for (const key of goalMappingMap.keys()) optimizationTotal[key] = 0;

  // 🔹 Duyệt toàn bộ data
  for (let index = 0, len = data.length; index < len; index++) {
    const item = data[index];
    const {
      campaign_name = "Unknown",
      spend: rawSpend = 0,
      optimization_goal = "Unknown",
      adset_name = "N/A",
      reach = 0,
      impressions = 0,
      actions = [],
      posts = [],
      status = "UNKNOWN", // ⬅️ Lấy status có sẵn từ API
    } = item;

    const spend = +rawSpend || 0;
    campaignTotal[campaign_name] = (campaignTotal[campaign_name] || 0) + spend;

    // 🔹 Tổng hợp theo brand hoặc goal
    if (isBrand && isCache) {
      for (const brand of quickFilterSet) {
        if (campaign_name.toLowerCase().includes(brand.toLowerCase())) {
          brandTotal[brand] = (brandTotal[brand] || 0) + spend;
          break;
        }
      }
    } else {
      for (const [goalName, goalValues] of goalMappingMap) {
        if (goalValues.includes(optimization_goal)) {
          optimizationTotal[goalName] += spend;
          break;
        }
      }
    }

    // 🔹 Ánh xạ hành động
    const actionMap = new Map(
      actions.map((a) => [a.action_type, a.value || 0])
    );

    // 🔹 Chuẩn hóa dữ liệu từng dòng
    const row = {
      id: index,
      campaign_name,
      adset_name,
      optimization_goal,
      spend,
      reach,
      impressions,
      ...Object.keys(actionTypes).reduce(
        (acc, key) => ((acc[key] = actionMap.get(actionTypes[key]) || 0), acc),
        {}
      ),
    };

    // 🔹 Tính các chỉ số
    row.result = resultMapping[optimization_goal]
      ? row[resultMapping[optimization_goal]] || 0
      : 0;

    const result = row.result;
    row.frequency = reach > 0 ? (impressions / reach).toFixed(2) : "0";
    row.cpm = impressions > 0 ? ((spend * 1000) / impressions) | 0 : "0";
    row.cpr = (spend / (result || 1)).toFixed(
      spend / (result || 1) > 50 ? 0 : 1
    );

    // 🔹 Hiển thị status nguyên văn, chỉ ACTIVE mới thêm class
    const statusText = status || "UNKNOWN";
    const statusClass = statusText === "ACTIVE" ? "active" : "";
    row.status = statusText;

    // 🔹 Render HTML cho từng dòng
    const fbPost = posts.find((p) => p.facebook_post_url);
    const igPost = posts.find((p) => p.instagram_post_url);
    const postLinkHTML = fbPost
      ? `<a href="${fbPost.facebook_post_url}" target="_blank" class="btn-view fb" title="Xem bài trên Facebook">
            <i class="fa-solid fa-eye"></i></a>`
      : igPost
      ? `<a href="${igPost.instagram_post_url}" target="_blank" class="btn-view ig" title="Xem bài trên Instagram">
            <i class="fa-solid fa-eye"></i></a>`
      : `<span style="opacity:.5;">Không có bài</span>`;

    tbodyRows[index] = `
      <tr data-id="${index}" data-campaign="${campaign_name}" data-adset="${adset_name}">
        <td><input type="checkbox" class="dom_select_row" data-id="${index}"></td>
        <td>${campaign_name}</td>
        <td>${adset_name}</td>
        <td class="status ${statusClass}">${statusText}</td>
        <td class="post_links">${postLinkHTML}</td>
        <td class="view_insights"><i class="fa-solid fa-magnifying-glass-chart"></i></td>
        <td>${formatNumber(row.spend)} ₫</td>
        <td>${formatNumber(row.reach)}</td>
        <td>${formatNumber(row.impressions)}</td>
        <td>${formatNumber(row.result)}</td>
        <td>${formatNumber(row.cpr)} ₫</td>
        <td>${formatMetricName(row.optimization_goal)}</td>
        <td>${row.frequency}</td>
        <td>${formatNumber(row.follows) || 0}</td>
        <td>${formatNumber(row.reactions) || 0}</td>
        <td>${row.messenger_start || 0}</td>
        <td>${row.lead || 0}</td>
        <td>${formatNumber(row.cpm)} ₫</td>
        <td>${formatNumber(row.post_engagement) || 0}</td>
        <td>${formatNumber(row.page_engagement) || 0}</td>
        <td>${formatNumber(row.video_view) || 0}</td>
        <td>${formatNumber(row.photo_view) || 0}</td>
        <td>${row.comments || 0}</td>
        <td>${row.post_save || 0}</td>
        <td>${row.share || 0}</td>
        <td>${formatNumber(row.link_click) || 0}</td>
      </tr>`;

    tableData[index] = row;
  }

  return {
    dataFilter: data,
    campaignTotal,
    optimizationTotal,
    brandTotal,
    tableData,
    tbodyHTML: tbodyRows.join(""),
  };
}

async function getPostsFromAdset(adsetId, accessToken) {
  const adsRes = await fetch(
    `https://graph.facebook.com/v22.0/${adsetId}/ads?fields=id,name,creative{effective_object_story_id,object_story_spec{page_id,link_data,message,link}},status&access_token=${accessToken}
`
  );
  const adsData = await adsRes.json();

  const posts = [];
  for (const ad of adsData.data || []) {
    const storyId = ad.creative?.effective_object_story_id;
    if (storyId) {
      const postRes = await fetch(
        `https://graph.facebook.com/v21.0/${storyId}?fields=id,permalink_url,message,created_time&access_token=${accessToken}`
      );
      const postData = await postRes.json();
      posts.push({ ad_id: ad.id, ...postData });
    }
  }

  return posts;
}

function updateFooterOnCheck(tableData) {
  if (!tableFooter) return;
  const checkedRows = document.querySelectorAll(".dom_select_row:checked");
  const allRows = document.querySelectorAll(".dom_select_row");
  const isAllSelected = checkedRows.length === 0;
  const rowsToProcess = isAllSelected ? allRows : checkedRows;
  const tableDataMap = new Map(tableData.map((item) => [item.id, item]));
  const totals = new Float64Array(sumFields.length);

  for (let i = 0, len = rowsToProcess.length; i < len; i++) {
    const rowId = rowsToProcess[i].dataset.id | 0;
    const rowData = tableDataMap.get(rowId);
    if (rowData) {
      for (let j = 0; j < sumFields.length; j++) {
        if (sumFields[j] !== "-") totals[j] += +rowData[sumFields[j]] || 0;
      }
    }
  }

  let footerHTML = `<tr><td colspan="6"><strong>${
    isAllSelected
      ? `Total ${allRows.length} Row`
      : `Total x${checkedRows.length} Selected Row`
  }</strong></td>`;

  for (let j = 0; j < sumFields.length; j++) {
    footerHTML += `<td>${
      sumFields[j] === "-"
        ? "-"
        : sumFields[j] === "spend"
        ? `${totals[j].toLocaleString()} đ`
        : totals[j].toLocaleString()
    }</td>`;
  }

  tableFooter.innerHTML = footerHTML;

  const metricTotal = {
    spent: totals[0],
    reach: totals[1],
    impressions: totals[2],
    post_engagement: totals[12],
    lead: totals[10],
    message: totals[9],
    link_click: totals[19],
    reactions: totals[8],
    likepage: totals[7],
    post_save: totals[17],
    page_engagement: totals[13],
    video_view: totals[14],
    photo_view: totals[15],
    comments: totals[16],
    share: totals[18],
    result: totals[3],
  };
  console.log(metricTotal);

  const filteredData = Array.from(rowsToProcess, (row) =>
    tableDataMap.get(row.dataset.id | 0)
  );
  const metricByGoal = calculateMetricByGoal(filteredData);
  renderMetricTotal(dom_total, metricTotal, metricByGoal);
  if (isViewPerformance) renderTopEvent(metricTotal);
}

function calculateMetricByGoal(data) {
  const metricByGoal = Object.create(null);
  for (let i = 0, len = data.length; i < len; i++) {
    const item = data[i];
    const goal = item.optimization_goal || "Unknown";
    if (!metricByGoal[goal]) {
      metricByGoal[goal] = {
        spent: 0,
        reach: 0,
        impressions: 0,
        post_engagement: 0,
        lead: 0,
        message: 0,
        link_click: 0,
        reactions: 0,
        likepage: 0,
      };
    }

    const goalData = metricByGoal[goal];
    goalData.spent += +item.spend || 0;
    goalData.reach += +item.reach || 0;
    goalData.impressions += +item.impressions || 0;
    goalData.post_engagement += +item.post_engagement || 0;
    goalData.lead += +item.lead || 0;
    goalData.message += +item.messenger_start || 0;
    goalData.link_click += +item.link_click || 0;
    goalData.reactions += +item.reactions || 0;
    goalData.likepage += +item.follows || 0;
  }

  return metricByGoal;
}

function calculateUnit(goalKeys, metricByGoal, divisorKey, multiplier = 1) {
  const { spent, totalDivisor } = goalKeys.reduce(
    (acc, key) => {
      const goalMetrics = metricByGoal[key];
      if (goalMetrics) {
        acc.spent += goalMetrics.spent || 0;
        acc.totalDivisor += goalMetrics[divisorKey] || 0;
      }
      return acc;
    },
    { spent: 0, totalDivisor: 0 }
  );

  return totalDivisor > 0 ? ((spent / totalDivisor) * multiplier) | 0 : "-";
}
function filterTableByCampaign(searchText) {
  const searchValue = searchText.toLowerCase().trim();

  // Lọc dữ liệu theo campaign_name hoặc adset_name
  const filteredData = dataFullAdset.filter(
    (item) =>
      item.campaign_name.toLowerCase().includes(searchValue) ||
      item.adset_name.toLowerCase().includes(searchValue)
  );

  useData(filteredData);
}

function renderMetricTotal(item, metricTotal, metricByGoal) {
  const renderTotal = [
    {
      name: "Total Spent",
      icon: "fa-solid fa-sack-dollar",
      type: "Total Spent",
      value: metricTotal.spent || metricTotal.spend,
      unit: "Spent",
    },
    {
      name: "Total Reach",
      icon: "fa-solid fa-street-view",
      type: "Cost per 1000 Reach",
      value: metricTotal.reach,
      unit: calculateUnit(["REACH"], metricByGoal, "reach", 1000),
    },
    {
      name: "Total Message",
      icon: "fa-brands fa-facebook-messenger",
      type: "Cost per Message",
      value: metricTotal.message || metricTotal.messenger_start,
      unit: calculateUnit(["REPLIES"], metricByGoal, "message"),
    },
    {
      name: "Likepage/Follows",
      icon: "fa-solid fa-thumbs-up",
      type: "Cost per LikePage",
      value: metricTotal.likepage || metricTotal.follows,
      unit: calculateUnit(["PAGE_LIKES"], metricByGoal, "likepage"),
    },
    {
      name: "Engagements",
      icon: "fa-solid fa-photo-film",
      type: "Cost per Engagement",
      value: metricTotal.post_engagement,
      unit: calculateUnit(["POST_ENGAGEMENT"], metricByGoal, "post_engagement"),
    },
    {
      name: "Total Impressions",
      icon: "fa-solid fa-eye",
      type: "Awareness CPM",
      value: metricTotal.impressions,
      unit: calculateUnit(["REACH"], metricByGoal, "impressions", 1000),
    },
    {
      name: "Total Leads",
      icon: "fa-solid fa-bullseye",
      type: "Cost per Lead",
      value: metricTotal.lead,
      unit: calculateUnit(
        ["QUALITY_LEAD", "LEAD_GENERATION"],
        metricByGoal,
        "lead"
      ),
    },
    {
      name: "Total Reactions",
      icon: "fa-solid fa-heart",
      type: "Cost per Reaction",
      value: metricTotal.reactions,
      unit: calculateUnit(["POST_ENGAGEMENT"], metricByGoal, "reactions"),
    },
  ];

  // Build HTML bằng map và join nhanh hơn append từng node
  item.innerHTML = renderTotal
    .map(
      ({ name, icon, type, value, unit }) => `
      <div class="dom_total_item">
        <div>
          <p class="dom_total_type">${name}</p>
        <p class="dom_total_number">
  ${
    unit === "Spent"
      ? `${isNaN(value) ? "0" : formatNumber(value)} ₫`
      : `${isNaN(value) ? "0" : formatNumber(value)}`
  }
</p>
        </div>
        <div class="dom_total_unit">
          ${
            unit === "Spent"
              ? `<a class="dom_unit_number">Excludes +5% VAT</a>`
              : `<p class="dom_unit_number">${
                  unit !== "-" ? `${formatNumber(unit)} ₫` : unit
                }</p>`
          }
          <p class="dom_unit_text">${type}</p>
        </div>
        <i class="${icon}"></i>
      </div>`
    )
    .join("");
}

// FORMAT & REGEX FUNCTION
function formatCurrency(value) {
  return `${(value * 1).toLocaleString()} ₫`;
}
function formatNumber(value) {
  return `${(value * 1).toLocaleString()}`;
}
function formatCurrencyText(value) {
  let unit = "",
    num = value;

  if (value >= 1_000_000_000) (num = value / 1_000_000_000), (unit = "B");
  else if (value >= 1_000_000) (num = value / 1_000_000), (unit = "M");
  else if (value >= 1_000) (num = value / 1_000), (unit = "K");

  return (num % 1 === 0 ? num : num.toFixed(1)) + unit;
}

function formatMetricName(metric) {
  return metric
    .toLowerCase() // Chuyển hết về chữ thường
    .replace(/_/g, " ") // Thay dấu _ thành khoảng trắng
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Viết hoa chữ cái đầu mỗi từ
}
function getFormattedDateRange(date_preset) {
  const today = new Date();
  let startDateFormat, endDateFormat;

  switch (date_preset) {
    case "today":
      startDateFormat = endDateFormat = today;
      break;
    case "yesterday":
      startDateFormat = new Date(today);
      startDateFormat.setDate(today.getDate() - 1);
      endDateFormat = startDateFormat;
      break;
    case "this%5fmonth":
      startDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), 1, 7)
      );
      endDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 7)
      );
      break;

    case "last%5fmonth":
      startDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth() - 1, 1, 7)
      );
      endDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), 0, 7)
      );
      break;

    case "this%5fquarter":
      startDateFormat = new Date(
        Date.UTC(
          today.getFullYear(),
          Math.floor(today.getMonth() / 3) * 3,
          1,
          7
        )
      );
      endDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 7)
      );
      break;

    case "last%5fquarter":
      endDateFormat = new Date(
        Date.UTC(
          today.getFullYear(),
          Math.floor(today.getMonth() / 3) * 3,
          0,
          7
        )
      );
      startDateFormat = new Date(
        Date.UTC(
          today.getFullYear(),
          Math.floor(today.getMonth() / 3) * 3 - 3,
          1,
          7
        )
      );
      break;

    case "this_year":
      startDateFormat = new Date(Date.UTC(today.getFullYear(), 0, 1, 7));
      endDateFormat = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 7)
      );
      break;

    case "custom_date":
      startDateFormat = new Date(startDate);
      endDateFormat = new Date(endDate);
      break;
    default:
      return "";
  }

  startDate = formatApiDate(startDateFormat);
  endDate = formatApiDate(endDateFormat);
  if (date_preset === "custom_date") {
    const query = `?start=${formatDateForQuery(
      startDate
    )}&end=${formatDateForQuery(endDate)}`;
    history.pushState(null, "", query);
  } else {
    history.pushState(null, "", window.location.pathname);
  }

  return startDateFormat.getTime() === endDateFormat.getTime()
    ? formatDate(startDateFormat)
    : `${formatDate(startDateFormat)} - ${formatDate(endDateFormat)}`;
}
function formatDateForQuery(dateString) {
  if (!dateString || typeof dateString !== "string") {
    console.error("formatDateForQuery: Invalid date string!", dateString);
    return "";
  }
  const [year, month, day] = dateString.split("-");
  return `${day}-${month}-${year}`;
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}
function formatApiDate(date) {
  const dateFormat = date.toISOString().split("T")[0];
  return dateFormat;
}
// CHART
function drawBarChart(data) {
  const campaignNames = Object.keys(data);
  const totalSpends = Object.values(data);

  if (!chartSpentType) {
    // Nếu chưa có chart thì tạo mới
    const ctx = document.getElementById("chartSpentType").getContext("2d");
    chartSpentType = new Chart(ctx, {
      type: "bar",
      data: {
        labels: campaignNames,
        datasets: [
          {
            label: "Spent",
            data: totalSpends,
            backgroundColor: "#ffb421",
            barPercentage: 0.8, // ✅ Giảm độ rộng cột (0.5 = 50% độ rộng)
            categoryPercentage: 0.7, // ✅ Điều chỉnh khoảng cách giữa các cột
          },
        ],
      },
      options: {
        responsive: true,
        borderRadius: 3,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            anchor: "end",
            align: "top",
            color: "#7c7c7c",
            font: { size: 11 },
            formatter: (value) => formatCurrencyText(value),
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 10 } },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 11 },
              callback: (value) => formatCurrencyText(value),
            },
            afterDataLimits: (scale) => {
              scale.max *= 1.1;
            },
            border: { display: false },
          },
        },
      },
      plugins: [ChartDataLabels],
    });
  } else {
    // ✅ Nếu đã có chart thì chỉ cập nhật data
    chartSpentType.data.labels = campaignNames;
    chartSpentType.data.datasets[0].data = totalSpends;
    chartSpentType.update(); // "none" để tắt animation
  }
}

function drawDailyChart(
  dates,
  spendValues,
  reachValues,
  messagingConversations,
  postReactions,
  pageLikes,
  postEngagement,
  linkClicks,
  lead
) {
  const ctx = document.getElementById("chartDaily").getContext("2d");
  const gradientSpend = ctx.createLinearGradient(0, 0, 0, 400);
  gradientSpend.addColorStop(0, "rgba(255, 171, 0,0.7)");
  gradientSpend.addColorStop(1, "rgba(255, 171, 0, 0.1)");
  // Destroy existing chart instance if any
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
  }

  // Save all datasets for future use
  allDatasets = [
    {
      label: "Post Engagement",
      data: postEngagement,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Leads",
      data: lead,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Link Click",
      data: linkClicks,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Spend",
      data: spendValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Reach",
      data: reachValues,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Message Start",
      data: messagingConversations,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Post Reactions",
      data: postReactions,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
    {
      label: "Page Likes",
      data: pageLikes,
      backgroundColor: gradientSpend,
      borderColor: "rgba(255, 171, 0, 1)",
      fill: true,
      tension: 0.1,
    },
  ];

  // Default chart view with "Spend"
  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: allDatasets.filter((dataset) => dataset.label === "Spend"),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 12,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 12,
            },
            callback: function (value) {
              return formatCurrencyText(value); // Format lại số tiền hiển thị trên cột Y
            },
          },
        },
      },
    },
  });
}
let monthlyChartInstance;
function drawMonthlyChart(
  dates,
  spendValues,
  reachValues,
  messagingConversations,
  postReactions,
  pageLikes,
  postEngagement,
  linkClicks,
  lead
) {
  const ctx = document.getElementById("chartMonthly").getContext("2d");

  // Định nghĩa 12 tháng
  const fullMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Tạo mảng dữ liệu mặc định có 12 phần tử = 0
  const spendValuesFixed = Array(12).fill(0);
  const reachValuesFixed = Array(12).fill(0);
  const messagingConversationsFixed = Array(12).fill(0);
  const postReactionsFixed = Array(12).fill(0);
  const pageLikesFixed = Array(12).fill(0);
  const postEngagementFixed = Array(12).fill(0);
  const linkClicksFixed = Array(12).fill(0);
  const leadFixed = Array(12).fill(0);

  // Định nghĩa danh sách dataset cần map dữ liệu
  const datasets = [
    { data: spendValues, fixed: spendValuesFixed },
    { data: reachValues, fixed: reachValuesFixed },
    { data: messagingConversations, fixed: messagingConversationsFixed },
    { data: postReactions, fixed: postReactionsFixed },
    { data: pageLikes, fixed: pageLikesFixed },
    { data: postEngagement, fixed: postEngagementFixed },
    { data: linkClicks, fixed: linkClicksFixed },
    { data: lead, fixed: leadFixed },
  ];

  // Đổ dữ liệu vào đúng tháng
  dates.forEach((date, index) => {
    const monthIndex = new Date(date).getMonth();
    datasets.forEach(({ data, fixed }) => {
      fixed[monthIndex] = data[index] || 0;
    });
  });

  // Hủy chart cũ nếu có
  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  // Tạo dataset cho biểu đồ
  allMonthlysets = [
    {
      label: "Post Engagement",
      data: postEngagementFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Leads",
      data: leadFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Link Click",
      data: linkClicksFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Spend",
      data: spendValuesFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Reach",
      data: reachValuesFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Message Start",
      data: messagingConversationsFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Post Reactions",
      data: postReactionsFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
    {
      label: "Page Likes",
      data: pageLikesFixed,
      backgroundColor: "rgba(255, 171, 0, 1)",
    },
  ];

  // Render biểu đồ
  monthlyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: fullMonths,
      datasets: allMonthlysets.filter(
        (dataset) => dataset.label === selectedViewMonthly
      ),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      borderRadius: 5,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#7c7c7c",
          font: { size: 11, weight: "bold" },
          formatter: (value) => formatCurrencyText(value),
        },
      },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11 },
            callback: (value) => formatCurrencyText(value),
          },
          afterDataLimits: (scale) => {
            scale.max *= 1.1; // Tăng 10% so với max hiện tại
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function updateChart(selectedView) {
  if (dailyChartInstance) {
    // Filter the dataset based on the selected view
    const filter = [...allDatasets];
    const filteredDataset = filter.filter(
      (dataset) => dataset.label === selectedView
    );

    if (filteredDataset.length > 0) {
      // Update chart with the selected dataset
      dailyChartInstance.data.datasets = filteredDataset;
      dailyChartInstance.update();
    } else {
      console.error("Dataset không tồn tại:", selectedView);
    }
  }
}
function updateChartMonthly(selectedView) {
  selectedViewMonthly = selectedView;
  if (monthlyChartInstance) {
    // Filter the dataset based on the selected view
    const filter = [...allMonthlysets];
    const filteredDataset = filter.filter(
      (dataset) => dataset.label === selectedView
    );
    if (filteredDataset.length > 0) {
      // Update chart with the selected dataset
      monthlyChartInstance.data.datasets = filteredDataset;
      monthlyChartInstance.update();
    } else {
      console.error("Dataset không tồn tại:", selectedView);
    }
  }
}

function handleDailyDate(data) {
  let dates = [];
  let spendValues = [];
  let reachValues = [];
  let messagingConversations = [];
  let postReactions = [];
  let pageLikes = [];
  let postEngagement = [];
  let linkClicks = [];
  let leads = [];
  // No data to process
  if (data.length === 0) {
    drawDailyChart(
      dates,
      spendValues,
      reachValues,
      messagingConversations,
      postReactions,
      pageLikes,
      postEngagement,
      linkClicks,
      leads
    );
    console.warn("No data available to draw the chart.");
    return;
  }

  data.forEach((entry) => {
    const date = entry?.date_start || "Unknown Date";
    const spend = parseFloat(entry?.spend) || 0;
    const reach = parseFloat(entry?.reach) || 0;
    let messaging = 0;
    let reactions = 0;
    let likes = 0;
    let engagement = 0;
    let linkclick = 0;
    let lead = 0;

    // Check if actions exists and is an array
    if (entry.actions && Array.isArray(entry.actions)) {
      entry.actions.forEach((action) => {
        if (
          action?.action_type ===
          "onsite_conversion.messaging_conversation_started_7d"
        ) {
          messaging = action?.value || 0;
        }
        if (action?.action_type === "post_reaction") {
          reactions = action?.value || 0;
        }
        if (action?.action_type === "like") {
          likes = action?.value || 0;
        }
        if (action?.action_type === "post_engagement") {
          engagement = action?.value || 0;
        }
        if (action?.action_type === "link_click") {
          linkclick = action?.value || 0;
        }
        if (action?.action_type === "onsite_conversion.lead_grouped") {
          lead = action?.value || 0;
        }
      });
    }

    dates.push(date);
    spendValues.push(spend);
    reachValues.push(reach);
    messagingConversations.push(messaging);
    postReactions.push(reactions);
    pageLikes.push(likes);
    postEngagement.push(engagement);
    linkClicks.push(linkclick);
    leads.push(lead);
  });
  drawDailyChart(
    dates,
    spendValues,
    reachValues,
    messagingConversations,
    postReactions,
    pageLikes,
    postEngagement,
    linkClicks,
    leads
  );
}
function handleMonthly(data) {
  let dates = [];
  let spendValues = [];
  let reachValues = [];
  let messagingConversations = [];
  let postReactions = [];
  let pageLikes = [];
  let postEngagement = [];
  let linkClicks = [];
  let leads = [];
  // No data to process
  if (data.length === 0) {
    drawMonthlyChart(
      dates,
      spendValues,
      reachValues,
      messagingConversations,
      postReactions,
      pageLikes,
      postEngagement,
      linkClicks,
      leads
    );
    console.warn("No data available to draw the chart.");
    return;
  }

  data.forEach((entry) => {
    const date = entry?.date_start || "Unknown Date";
    const spend = parseFloat(entry?.spend) || 0;
    const reach = parseFloat(entry?.reach) || 0;
    let messaging = 0;
    let reactions = 0;
    let likes = 0;
    let engagement = 0;
    let linkclick = 0;
    let lead = 0;

    // Check if actions exists and is an array
    if (entry.actions && Array.isArray(entry.actions)) {
      entry.actions.forEach((action) => {
        if (
          action?.action_type ===
          "onsite_conversion.messaging_conversation_started_7d"
        ) {
          messaging = action?.value || 0;
        }
        if (action?.action_type === "post_reaction") {
          reactions = action?.value || 0;
        }
        if (action?.action_type === "like") {
          likes = action?.value || 0;
        }
        if (action?.action_type === "post_engagement") {
          engagement = action?.value || 0;
        }
        if (action?.action_type === "link_click") {
          linkclick = action?.value || 0;
        }
        if (action?.action_type === "onsite_conversion.lead_grouped") {
          lead = action?.value || 0;
        }
      });
    }

    dates.push(date);
    spendValues.push(spend);
    reachValues.push(reach);
    messagingConversations.push(messaging);
    postReactions.push(reactions);
    pageLikes.push(likes);
    postEngagement.push(engagement);
    linkClicks.push(linkclick);
    leads.push(lead);
  });

  drawMonthlyChart(
    dates,
    spendValues,
    reachValues,
    messagingConversations,
    postReactions,
    pageLikes,
    postEngagement,
    linkClicks,
    leads
  );
}
async function fetchHourlyData(api) {
  try {
    const response = await fetch(api);
    const data = await response.json();

    processHourlyData(data.data);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu theo giờ:", error);
  }
}
function processHourlyData(data) {
  const hours = [];
  const impressions = [];
  const spend = [];

  data.forEach((item) => {
    // Lấy phần giờ từ timestamp và chuyển sang định dạng 12 giờ
    const hour =
      item.hourly_stats_aggregated_by_advertiser_time_zone.split(":")[0];
    hours.push(`${hour * 1}h`); // Chỉ cần phần giờ
    impressions.push(item.impressions);
    spend.push(item.spend);
  });

  drawHourlyChart(hours, impressions, spend);
  loading.classList.remove("active");
}
function drawHourlyChart(hours, impressions, spend) {
  const ctx = document.getElementById("hourlyChart").getContext("2d");

  // Tạo gradient cho background
  const gradientImpressions = ctx.createLinearGradient(0, 0, 0, 400);
  gradientImpressions.addColorStop(0, "rgba(48, 51, 86, 0.7)");
  gradientImpressions.addColorStop(1, "rgba(48, 51, 86, 0.1)");

  const gradientSpend = ctx.createLinearGradient(0, 0, 0, 400);
  gradientSpend.addColorStop(0, "rgba(255, 171, 0,0.7)");
  gradientSpend.addColorStop(1, "rgba(255, 171, 0, 0.1)");

  // Hủy chart cũ nếu có
  if (window.hourlyChartInstance) {
    window.hourlyChartInstance.destroy();
  }

  // Vẽ biểu đồ mới
  window.hourlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: hours, // Xử lý giờ, giờ chỉ hiển thị phần giờ
      datasets: [
        {
          label: "Impressions",
          data: impressions,
          backgroundColor: gradientImpressions,
          borderColor: "rgba(48, 51, 86, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Spend",
          data: spend,
          backgroundColor: gradientSpend,
          borderColor: "rgba(255, 171, 0, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
        },
      },
      scales: {
        x: {
          title: {
            display: false,
            text: "Giờ trong ngày",
          },
          ticks: {
            min: 0, // Giới hạn từ 0 giờ
            max: 23, // Giới hạn đến 23 giờ
            stepSize: 1, // Mỗi bước là 1 giờ
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: false,
            text: "Số lượng",
          },
        },
      },
    },
  });
}
// Function General
function useDebounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
function setActiveOnly(el, activeEl) {
  if (activeEl) {
    const removeActive = document.querySelector(activeEl);
    if (removeActive) {
      removeActive.classList.remove("active");
    }
  }
  el.classList.add("active");
}
function removeActiveOnly(activeEl) {
  document.querySelector(activeEl) &&
    document.querySelector(activeEl).classList.remove("active");
}
function renderTable(tbodyHTML) {
  const fragment = document.createDocumentFragment();
  const tempContainer = document.createElement("tbody");

  tempContainer.innerHTML = tbodyHTML;
  while (tempContainer.firstChild) {
    fragment.appendChild(tempContainer.firstChild);
  }

  if (tableBody.hasChildNodes()) {
    tableBody.replaceChildren(fragment); // Tối ưu hơn innerHTML = ""
  } else {
    tableBody.appendChild(fragment);
  }
}

function useData(data, isCache) {
  let result = isCache
    ? (globalDataCache ??= processData(data, true)) // Dùng cache nếu có
    : processData(data);
  // measureExecutionTime(processData, data);
  renderTable(result.tbodyHTML);
  if (!isCache || tableDataGlobal !== result.tableData) {
    tableDataGlobal = result.tableData;
    updateFooterOnCheck(tableDataGlobal);
  }

  const chartData =
    isBrand && isCache ? result.brandTotal : result.optimizationTotal;
  drawBarChart(chartData);

  renderTopCampaign(result.campaignTotal);

  // Cập nhật bộ nhớ cache nếu cần
  if (!isCache || dataAdsetNow !== result.dataFilter) {
    dataAdsetNow = result.dataFilter;
    dataCampaignNow = result.campaignTotal;
  }
}

async function mainApp() {
  try {
    globalDataCache = null;
    selecItemTime.classList.remove("active");
    dom_time_show.textContent = getFormattedDateRange(date_preset);

    const [fetchedAdset, dataDaily] = await Promise.all([
      fetchData(startDate, endDate).catch((err) => {
        console.error("Lỗi khi fetchData:", err);
        return [];
      }),
      fetchDataDaily(startDate, endDate).catch((err) => {
        console.error("Lỗi khi fetchDataDaily:", err);
        return [];
      }),
    ]);

    dataFullAdset = Array.isArray(fetchedAdset) ? fetchedAdset : [];

    handleDailyDate(dataDaily);
    useData(dataFullAdset, true);
    loading.classList.remove("active");

    if (localStorage.getItem("viewPerformance") === "1") {
      handleViewPerformance();
    }
  } catch (error) {
    console.error("Lỗi trong mainApp:", error);
  } finally {
  }
}

function getStartEndFromURL() {
  const params = new URLSearchParams(window.location.search);
  let start = params.get("start");
  let end = params.get("end");

  if (start && end) {
    const [startDay, startMonth, startYear] = start.split("-").map(Number);
    const [endDay, endMonth, endYear] = end.split("-").map(Number);

    // Dùng Date.UTC để đảm bảo ngày không bị lệch do múi giờ
    start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      startDate = start;
      endDate = end;
      date_preset = "custom_date";
      selecedTextTime.textContent = "Custom Range";
      setActiveOnly(custom_item, ".dom_select_show.time li.active");
      return;
    }
  }
  date_preset = "this%5fmonth";
}
function createApiUrl(baseField, filtering) {
  return `https://graph.facebook.com/v22.0/act_${adAccountIdView}/insights?fields=${baseField}&filtering=${filtering}&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessTokenView}&limit=1000`;
}

async function fetchDataFlat(api) {
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    let platformReach = {};
    data.data.forEach((entry) => {
      const platform = entry.publisher_platform || "Unknown";
      const reach = entry.reach || 0;
      if (!platformReach[platform]) {
        platformReach[platform] = 0;
      }
      platformReach[platform] += reach;
    });

    drawChart2(platformReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function drawChart2(platformReach) {
  const ctx = document.getElementById("reachChart").getContext("2d");

  // Sắp xếp các nền tảng theo thứ tự mong muốn
  const platformOrder = [
    "audience_network",
    "facebook",
    "instagram",
    "messenger",
  ];

  // Sắp xếp lại dữ liệu platformReach theo đúng thứ tự yêu cầu
  const sortedPlatformReach = platformOrder.reduce((acc, platform) => {
    if (platformReach[platform]) {
      acc[platform] = platformReach[platform];
    }
    return acc;
  }, {});

  const platforms = Object.keys(sortedPlatformReach).map((platform) =>
    capitalizeFirstLetter(platform)
  );
  const reachValues = Object.values(sortedPlatformReach);

  // Kiểm tra và hủy biểu đồ cũ nếu đã tồn tại
  if (reachChartInstance) {
    reachChartInstance.destroy();
  }

  // Tạo biểu đồ mới
  reachChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "Total Reach",
          data: reachValues,
          backgroundColor: [
            "#ffab00",
            "#262a53", // Messenger
            "#cccccc", // Audience Network
            "#ffc756", // Instagram
          ],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
        title: {
          display: false, // Ẩn tiêu đề nếu không cần
        },
      },
    },
  });
}

async function fetchRegionData(api) {
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    if (data.error) {
      console.error("Error from API:", data.error.message);
      return;
    }

    let regionReach = {};
    data.data.forEach((entry) => {
      const region = entry.region || "Unknown";
      const reach = entry.reach || 0;
      if (!regionReach[region]) {
        regionReach[region] = 0;
      }
      regionReach[region] += reach;
    });

    drawRegionChart(regionReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function drawAgeGenderChart(ageLabels, maleData, femaleData) {
  const ctx = document.getElementById("ageGenderChart").getContext("2d");
  if (ageGenderChartInstance) {
    ageGenderChartInstance.destroy();
  }
  ageGenderChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ageLabels,
      datasets: [
        {
          label: "Male",
          data: maleData,
          backgroundColor: "#202449ed", // Màu xanh dương
        },
        {
          label: "Female",
          data: femaleData,
          backgroundColor: "#ffab00e3", // Màu hồng
        },
      ],
    },
    options: {
      borderRadius: 5,
      responsive: true,
      plugins: {
        legend: {
          position: "top", // Đặt chú thích ở dưới
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          stacked: false, // Hiển thị cột cạnh nhau
        },
        y: {
          beginAtZero: true,
        },
      },
      barPercentage: 0.8, // Kích thước cột nhỏ lại (0.1 - 1)
    },
  });
}

function drawRegionChart(regionReach) {
  const ctx = document.getElementById("regionChart").getContext("2d");

  // Tính tổng reach để lọc region có tỷ lệ quá thấp
  const totalReach = Object.values(regionReach).reduce(
    (sum, value) => sum + value * 1,
    0
  );

  const minThreshold = totalReach * 0.015; // Ngưỡng tối thiểu là 5% tổng reach

  // Lọc bỏ các region có reach quá thấp
  const filteredRegions = Object.entries(regionReach).filter(
    ([, value]) => value >= minThreshold
  );

  if (filteredRegions.length === 0) {
    console.warn("Không có khu vực nào đủ điều kiện để hiển thị.");
    return;
  }

  const regions = filteredRegions.map(([region]) =>
    region.replace(/\s*(Province|City)$/i, "").trim()
  );

  const reachValues = filteredRegions.map(([, value]) => value);

  if (regionChartInstance) {
    regionChartInstance.destroy();
  }

  regionChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: regions,
      datasets: [
        {
          data: reachValues,
          backgroundColor: [
            "#ffb524",
            "#ffb524",
            "#ffb524",
            "#ffb524",
            "#ffb524",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      borderRadius: 5,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      barPercentage: 0.6, // Kích thước cột nhỏ lại (0.1 - 1)
    },
  });
}

async function fetchGenderData(api) {
  try {
    const response = await fetch(api);
    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const data = await response.json();
    let genderReach = {};
    data.data.forEach((entry) => {
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;
      if (!genderReach[gender]) {
        genderReach[gender] = 0;
      }
      genderReach[gender] += reach;
    });

    drawGenderChart(genderReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function drawGenderChart(genderReach) {
  const ctx = document.getElementById("genderChart").getContext("2d");

  // Chuyển đổi các giới tính và giá trị reach
  const genders = Object.keys(genderReach).map((gd) =>
    capitalizeFirstLetter(gd)
  );
  const reachValues = Object.values(genderReach);

  // Nếu biểu đồ đã tồn tại, hủy đi trước khi vẽ lại
  if (genderChartInstance) {
    genderChartInstance.destroy();
  }

  // Vẽ lại biểu đồ tròn
  genderChartInstance = new Chart(ctx, {
    type: "pie", // Biểu đồ tròn
    data: {
      labels: genders, // Các nhãn giới tính
      datasets: [
        {
          label: "Lượt Reach theo giới tính", // Tiêu đề cho dữ liệu
          data: reachValues, // Dữ liệu reach theo giới tính
          backgroundColor: [
            "#ffab00", // Màu cho Nữ
            "#262a53", // Màu cho Nam
            "#cccccc", // Màu cho Unknown nếu có
          ],
          hoverOffset: 4, // Hiệu ứng khi hover
        },
      ],
    },
    options: {
      responsive: true, // Đảm bảo biểu đồ linh hoạt với kích thước màn hình
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
      },
    },
  });
}
async function fetchImpressionData(api) {
  try {
    const response = await fetch(api); // Fetch dữ liệu từ API
    const result = await response.json(); // Chuyển dữ liệu thành JSON

    // Kiểm tra dữ liệu trả về
    if (!result.data || !Array.isArray(result.data)) {
      console.error("Dữ liệu không hợp lệ:", result);
      return;
    }

    // Tự động tổng hợp số lượt hiển thị cho từng loại thiết bị
    const impressionsData = result.data.reduce((acc, entry) => {
      const device = entry.impression_device; // Lấy loại thiết bị từ impression_device
      const impressions = parseInt(entry.impressions, 10); // Đảm bảo impressions là số
      acc[device] = (acc[device] || 0) + impressions; // Cộng dồn số liệu
      return acc;
    }, {});

    // Vẽ biểu đồ với dữ liệu đã xử lý
    handleImpressionDevide(impressionsData);
    // drawDoughnutChart(impressionsData);
  } catch (error) {
    console.error("Lỗi khi fetch dữ liệu từ API:", error);
  }
}
function handleImpressionDevide(data) {
  if (data) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sắp xếp giảm dần theo impression
    let render = "";

    const maxImpression = entries.length > 0 && entries[0][1]; // Lấy giá trị impression lớn nhất để tính % độ dài thanh

    entries.forEach(([label, impression]) => {
      const widthPercentage = (impression / maxImpression) * 100; // Tính phần trăm chiều rộng của thanh
      render += `<li>
                  <p><span>${formatLabel(label)}</span> <span>${formatNumber(
        impression
      )}</span></p>
                  <p><span style="width: ${widthPercentage}%"></span></p>
                </li>`;
    });

    impression_chart_ul.innerHTML = render;
  }
}

const formatLabel = (label) => {
  return label
    .split("_") // Tách các từ bằng dấu "_"
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Viết hoa chữ cái đầu, các chữ còn lại viết thường
    .join(" "); // Ghép lại thành chuỗi có khoảng trắng
};
async function fetchDataAge(api) {
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    if (data.error) {
      console.error("Error from API:", data.error.message);
      return;
    }

    let ageGenderReach = {};

    data.data.forEach((entry) => {
      const ageRange = entry.age || "Unknown";
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;

      // Tạo key kết hợp tuổi và giới tính (ví dụ: "18-24_male")
      const key = `${ageRange}_${gender}`;
      if (!ageGenderReach[key]) {
        ageGenderReach[key] = 0;
      }
      ageGenderReach[key] += reach;
    });

    // Chuyển đổi dữ liệu thành dạng phù hợp cho biểu đồ
    const ageLabels = [...new Set(data.data.map((entry) => entry.age))].sort();
    const maleData = ageLabels.map((age) => ageGenderReach[`${age}_male`] || 0);
    const femaleData = ageLabels.map(
      (age) => ageGenderReach[`${age}_female`] || 0
    );

    // Gọi hàm vẽ biểu đồ
    drawAgeGenderChart(ageLabels, maleData, femaleData);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}
function handleViewDemographic(campaign, adset, id) {
  loading.classList.add("active");
  demoTitleAdset.textContent = adset;
  demoTitleCampaign.textContent = campaign;
  dom_demographic.classList.add("active");
  const metricByGoal = calculateMetricByGoal([tableDataGlobal[id]]);

  renderMetricTotal(dom_totalDemographic, tableDataGlobal[id], metricByGoal);
  const filters = [
    {
      field: "campaign.name",
      operator: "EQUAL",
      value: campaign,
    },
    { field: "adset.name", operator: "EQUAL", value: adset },
  ];

  const filtering = JSON.stringify(filters);

  // API endpoints
  const breakdowns = {
    platform: "campaign_name,reach&breakdowns=publisher_platform",
    age: "campaign_name,reach&breakdowns=age,gender",
    region: "campaign_name,reach&breakdowns=region",
    gender: "campaign_name,reach&breakdowns=gender",
    device: "campaign_name,impressions&breakdowns=impression_device",
    hourly:
      "campaign_name,impressions,spend&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone",
  };

  const fetchFunctions = {
    platform: fetchDataFlat,
    age: fetchDataAge,
    region: fetchRegionData,
    gender: fetchGenderData,
    device: fetchImpressionData,
    hourly: fetchHourlyData,
  };

  // Tự động gọi các API
  Object.entries(breakdowns).forEach(([key, breakdown]) => {
    const apiUrl = createApiUrl(breakdown, filtering);
    fetchFunctions[key](apiUrl);
  });
}
async function fetchAdAccount() {
  let apiUrl = `https://graph.facebook.com/v22.0/act_${adAccountIdView}?fields=balance,age,created_time,id,name,currency,amount_spent,funding_source_details,spend_cap,business,owner,timezone_name&access_token=${accessTokenView}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Kiểm tra nếu có business.id thì fetch avatar của BM
    if (data.business && data.business.id) {
      const apiBM = `https://graph.facebook.com/v22.0/${data.business.id}?fields=picture&access_token=${accessTokenView}`;
      const bmResponse = await fetch(apiBM);
      const bmData = await bmResponse.json();

      // Gán avatar vào data
      data.avatar = bmData.picture?.data?.url || null;
    } else {
      data.avatar = null;
    }
    console.log(data);

    renderDomPayment(data);
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}
// 🧩 Hàm mở rộng để lấy link bài quảng cáo trong adset_id
async function fetchCreativePostsFromAdset(adsetId, accessToken) {
  try {
    // 1️⃣ Lấy danh sách ads trong adset
    const adsUrl = `https://graph.facebook.com/v22.0/${adsetId}/ads?fields=id,name,creative{effective_object_story_id,object_story_id,name}&access_token=${accessToken}`;
    const adsRes = await fetch(adsUrl);
    const adsData = await adsRes.json();

    if (!adsData.data || adsData.data.length === 0) {
      console.warn("Không tìm thấy quảng cáo nào trong adset này.");
      return [];
    }

    const results = [];

    // 2️⃣ Với mỗi ad, lấy bài post tương ứng (nếu có story_id)
    for (const ad of adsData.data) {
      const storyId =
        ad.creative?.effective_object_story_id ||
        ad.creative?.object_story_id ||
        null;

      if (!storyId) continue;

      const postUrl = `https://graph.facebook.com/v22.0/${storyId}?fields=id,permalink_url,message,created_time&access_token=${accessToken}`;
      const postRes = await fetch(postUrl);
      const postData = await postRes.json();

      results.push({
        ad_id: ad.id,
        ad_name: ad.name,
        story_id: storyId,
        post_url: postData.permalink_url || null,
        message: postData.message || "",
        created_time: postData.created_time || "",
      });
    }

    return results;
  } catch (err) {
    console.error("❌ Lỗi khi lấy creative posts:", err);
    return [];
  }
}

function renderMonthlyinYear() {
  const currentYear = new Date().getFullYear();
  const yearsArray = [currentYear, currentYear - 1, currentYear - 2];

  selecItemYearlyText.textContent = currentYear;
  selecItemYearlyUl.innerHTML = "";

  yearsArray.forEach((year) => {
    const li = document.createElement("li");
    li.setAttribute("data-view", year);
    li.innerHTML = `<span class="radio_box"></span><span>${year}</span>`;

    if (year === currentYear) {
      li.classList.add("active"); // Thêm class active cho năm hiện tại
    }

    selecItemYearlyUl.appendChild(li);
  });
}
function renderAccountInfo(data) {
  document.title = `DOM Report - Meta - ${data.name}`;
  dom_userP.textContent = data.name;
  dom_userIMG.src = data.avatar;
  console.log(data.avatar);

  dom_account_view_block.innerHTML = `
    <div class="account_item">
     <div>
      <img class="account_item_avatar" src="${data.avatar}">
      <div class="account_item_info">
        <p class="account_item_name">${data.name}</p>
        <p class="account_item_id">${adAccountIdView}</p>
      </div>
     </div>
    ${accounts.length > 1 ? `<i class="fa-solid fa-sort"></i>` : ""}
    </div>
  `;
}

async function fetchAdAccountInfoAndAdd(adId, accessToken) {
  let apiUrl = `https://graph.facebook.com/v22.0/act_${adId}?fields=id,name,account_status,currency,amount_spent,business&access_token=${accessToken}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.name) return null; // Nếu không có name thì token sai hoặc tài khoản không hợp lệ

    // Lấy avatar nếu có Business Manager
    let avatar = "https://dom-marketing.netlify.app/img/dom_avatar.jpg";
    if (data.business?.id) {
      const apiBM = `https://graph.facebook.com/v22.0/${data.business.id}?fields=picture&access_token=${accessToken}`;
      const bmResponse = await fetch(apiBM);
      const bmData = await bmResponse.json();
      avatar = bmData.picture?.data?.url || avatar;
    }

    // Tạo object tài khoản
    const item = {
      brand: false,
      quick: [
        "Lead Form",
        "Awareness",
        "Engagement",
        "Message",
        "Traffic",
        "Pagelike",
      ],
      avatar: avatar,
      name: data.name,
      id: adId,
      access: accessToken,
    };

    // Lưu vào danh sách
    accounts.push(item);
    localStorage.accounts = JSON.stringify(accounts);

    return item; // Trả về tài khoản vừa thêm
  } catch (error) {
    console.error(`Lỗi khi fetch thông tin tài khoản ${adId}:`, error.message);
    return null; // Lỗi khi thêm
  }
}

async function fetchAdAccountActivities(adId, accessToken) {
  loading.classList.add("active");
  let apiUrl = `https://graph.facebook.com/v22.0/act_${adId}?fields=balance,age,created_time,fb_entity,tax_id,id,name,account_status,currency,amount_spent,funding_source_details,spend_cap,business,owner,timezone_name,disable_reason&access_token=${accessToken}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.business && data.business.id) {
      const apiBM = `https://graph.facebook.com/v22.0/${data.business.id}?fields=picture&access_token=${accessToken}`;
      const bmResponse = await fetch(apiBM);
      const bmData = await bmResponse.json();

      // Gán avatar vào data
      data.avatar =
        bmData.picture?.data?.url ||
        "https://dom-marketing.netlify.app/img/dom_avatar.jpg";
    } else {
      data.avatar = "https://dom-marketing.netlify.app/img/dom_avatar.jpg";
    }
    if (data.name) {
      const item = {
        brand: false,
        quick: [
          "Lead Form",
          "Awareness",
          "Engagement",
          "Message",
          "Traffic",
          "Pagelike",
        ],
        avatar: data.avatar,
        name: data.name,
        id: adId,
        access: accessToken,
      };
      accounts = [...accounts, item];
      localStorage.accounts = JSON.stringify(accounts);

      const viewMaster = item;
      isBrand = viewMaster.brand;
      accessTokenView = viewMaster.access;
      adAccountIdView = viewMaster.id;
      accAvatar = viewMaster.avatar;
      quickFilter = viewMaster.quick;
      firstLoad();
      renderListAccounts();
      renderMasterView();
      accountViewID = accounts.length - 1;
      localStorage.account_view = JSON.stringify(accountViewID);
      const title = "Terms of use";
      const content = `
       <p class="dom_connect">
              <i class="fa-solid fa-link"></i> <span>Connected to </span
              ><b>[${data.name}]</b>
            </p>
            <p>
              <i class="fa-solid fa-award title_icon"></i>DOM cam kết ID và
              Token của bạn chỉ được lưu trữ ở trình duyệt - Local. Chúng tôi
              <b>KHÔNG THU THẬP</b> bất kỳ thông tin nào về tài khoản quảng cáo
              của bạn. Mọi API được gửi và nhận đều thuộc Marketing API chính
              thức của Meta. DOM sẽ chịu hoàn toàn trách nhiệm nếu phát hiện thu
              thập thông tin liên quan đến ID và Token của bạn.
            </p>
            <p>
              <i class="fa-solid fa-award title_icon"></i>DOM commits that your
              ID and Token are only stored in the Local browser. We DO NOT
              COLLECT any information about your advertising account. All APIs
              sent and received are part of Meta's official Marketing API. DOM
              will take full responsibility if discovered about collecting your
              ID and Access Token.
            </p>
      `;
      renderAlert(title, content);
    } else {
      const title = "Invalid";
      const content = `
 <p class="dom_connect">
        <i class="fa-solid fa-triangle-exclamation title_icon"></i> Invalid ID or Token
      </p>
`;
      renderAlert(title, content);
    }
  } catch (error) {
    const title = "Invalid";
    const content = `
 <p class="dom_connect">
        <i class="fa-solid fa-triangle-exclamation title_icon"></i> Invalid ID or Token
      </p>
`;
    renderAlert(title, content);
    console.error("Fetch error:", error.message);
  }
  loading.classList.remove("active");
}
const btnOk = document.querySelector("#confirm_ok");
const btnCancel = document.querySelector("#confirm_close");

function renderAlertWithCallback(
  title,
  contentHTML,
  onConfirm,
  confirm_close,
  confirm_ok
) {
  dom_alert.classList.add("active");
  dom_alert.classList.add("confirm");
  dom_alert_title.textContent = title;
  dom_alert_content.innerHTML = contentHTML;

  btnOk.onclick = null;
  btnCancel.onclick = null;

  btnOk.onclick = () => {
    if (typeof onConfirm === "function") onConfirm();
    dom_alert.classList.remove("active");
    dom_alert.classList.remove("confirm");
  };

  btnCancel.onclick = () => {
    dom_alert.classList.remove("active");
    dom_alert.classList.remove("confirm");
  };
  if (confirm_close) {
    btnCancel.textContent = confirm_close;
  }
  if (confirm_ok) {
    btnOk.textContent = confirm_ok;
  }
}

function renderAlert(title, contentHTML) {
  dom_alert.classList.add("active");
  dom_alert_title.textContent = title;
  dom_alert_content.innerHTML = contentHTML;
}

dom_checked.addEventListener("click", () => {
  dom_alert.classList.remove("active");
  dom_accounts.classList.remove("add");
});

const dom_accounts_btn_coppy = document.querySelector(
  ".dom_accounts_btn_coppy"
);

dom_accounts_btn_coppy.addEventListener("click", async () => {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(accounts)
  );
  const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${compressed}`;

  const shortUrl = await shortenURL(syncUrl);
  const title = "Share all Accounts";
  const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-copy title_icon"></i> <span>Copied short link to share <b>[${accounts.length}]</b> Accounts report.</span>
            </p>
            <p> <i class="fa-solid fa-link title_icon"></i><span>${shortUrl}</span></p>
  `;
  renderAlert(title, content);
});

function renderMasterView() {
  if (!accounts?.length || accounts?.length < 2) return;
  console.log(accounts);

  dom_account_viewUl.innerHTML = accounts
    .map(
      (item, index) => `
        <li data-id="${index}">
          <img src="https://dom-marketing.netlify.app/img/dom_avatar.jpg" />
          <p><span>${item.name}</span> <span>${item.id}</span></p>
        </li>
      `
    )
    .join("");
}
function renderListAccounts() {
  dom_accounts_p.textContent = `Your Ad Account: ${accounts.length}`;
  dom_accounts_list.innerHTML = accounts
    .map(
      (item, index) => `
      <div class="dom_accounts_list_item"  data-id="${index}">
            <div>
              <img
                src=${item.avatar}
              />
              <p>
                <span>${item.name}</span>
                <span>${item.id}</span>
              </p>
            </div>
            <div >
              <i class="fa-solid fa-pen-to-square account_edit" title="Edit Ad Accout"></i>
              <i class="fa-solid fa-share-nodes account_share" title="Share Report Account"></i>
              <i class="fa-solid fa-trash-can account_remove" title="Stop connecting Account"></i>
            </div>
          </div>
      `
    )
    .join("");
}
renderListAccounts();

// Lắng nghe sự kiện xóa và chỉnh sửa
dom_accounts_list.addEventListener("click", async (event) => {
  const target = event.target;

  // Nếu click vào nút xóa
  if (target.classList.contains("account_remove")) {
    const parentItem = target.closest(".dom_accounts_list_item");
    const index = parseInt(parentItem.dataset.id);

    const title = "Stop connecting";
    const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-link-slash"></i> <span> Stop connecting to  </span
            ><b>[${accounts[index].name}]</b> account
          </p>
    `;
    renderAlertWithCallback(
      title,
      content,
      () => {
        accounts.splice(index, 1); // Xóa khỏi mảng
        localStorage.accounts = JSON.stringify(accounts); // Cập nhật localStorage
        renderListAccounts(); // Render lại danh sách
        renderMasterView();
      },
      "Cancel",
      "Disconnect"
    );

    return;
  }

  // Nếu click vào nút chỉnh sửa
  if (target.classList.contains("account_edit")) {
    dom_accounts.classList.add("edit");
    const parentItem = target.closest(".dom_accounts_list_item");
    const index = parseInt(parentItem.dataset.id);
    const item = accounts[index];

    dom_edit_info.innerHTML = `
      <img src=${item.avatar} />
      <p>
        <span>${item.name}</span>
        <span>${item.id}</span>
      </p>
    `;

    // Cập nhật trạng thái ô checkbox và input từ khóa
    key_check.checked = !!item.brand;
    dom_key_checkLabel.classList.toggle("active", item.brand);
    key_adset.value =
      Array.isArray(item.quick) && item.brand ? item.quick.join(", ") : "";

    confirm_keyword.dataset.index = index;
    return;
  }
  if (target.classList.contains("account_share")) {
    const parentItem = target.closest(".dom_accounts_list_item");
    const index = parseInt(parentItem.dataset.id);
    const item = accounts[index];

    // 🔥 Mã hóa: JSON → URI Component → Base64
    const encodedData = LZString.compressToEncodedURIComponent(
      JSON.stringify(item)
    );
    const shareUrl = `${window.location.origin}${window.location.pathname}?act=${encodedData}`;

    try {
      // 🔥 Rút gọn link
      const shortUrl = await shortenURL(shareUrl);

      // 🔥 Copy vào clipboard
      await navigator.clipboard.writeText(shortUrl);

      const title = "Share Report";
      const content = `
         <p class="dom_connect">
                <i class="fa-solid fa-copy title_icon"></i> <span>Copied short link to share <b>[${item.name}]</b> report.</span>
                </p>
                <p> <i class="fa-solid fa-link title_icon"></i><span>${shortUrl}</span></p>
      `;
      renderAlert(title, content);
    } catch (err) {
      console.error("Lỗi rút gọn hoặc copy URL:", err);
    }
  }
});

confirm_keyword.addEventListener("click", () => {
  const index = confirm_keyword.dataset.index;
  if (index === undefined) return;

  const item = accounts[index];
  if (!item.brand && !key_check.checked) {
    dom_accounts.classList.remove("edit");
    return;
  }

  if (key_check.checked) {
    const keywords = key_adset.value
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw);

    if (!keywords.length) {
      const title = "Filter by keywords";
      const content = `
     <p class="dom_connect">
            <i class="fa-solid fa-key title_icon"></i> Please enter keywords to create Quick Filter, separated by ","
          </p>
          <p>Ex: Keyword A, Keyword B, Keyword C</p>
          <p>Your campaign <b>MUST</b> have a name/rename to contains keywords</p>
    `;
      renderAlert(title, content);
      return;
    }
    if (key_adset.value.trim() === item.quick.join(", ")) {
      dom_accounts.classList.remove("edit");
      return;
    }

    item.quick = keywords;
    item.requick = keywords;
    item.brand = true;
  } else {
    item.brand = false;
    item.quick = [
      "Lead Form",
      "Awareness",
      "Engagement",
      "Message",
      "Traffic",
      "Pagelike",
    ];
  }

  accounts[index] = item;
  localStorage.accounts = JSON.stringify(accounts);
  if (index == accountViewID) {
    const viewMaster = accounts[index];
    isBrand = viewMaster.brand;
    accessTokenView = viewMaster.access;
    adAccountIdView = viewMaster.id;
    accAvatar = viewMaster.avatar;
    quickFilter = viewMaster.quick;
    firstLoad();
  }
  const title = "Update Filter";
  const content = `
 <p class="dom_connect">
        <i class="fa-solid fa-key title_icon"></i> Quick Filter updated successfully!!! 
      </p>
`;
  renderAlert(title, content);
  dom_accounts.classList.remove("edit");
});

renderMasterView();

dom_account_viewUl.addEventListener("click", (event) => {
  const clickedLi = event.target.closest("li"); // Kiểm tra có click vào li hay không
  if (clickedLi) {
    dom_account_view_block.classList.remove("active");
    // if (clickedLi.dataset.id == accountViewID) return;
    const viewMaster = accounts[clickedLi.dataset.id];
    isBrand = viewMaster.brand;
    accessTokenView = viewMaster.access;
    adAccountIdView = viewMaster.id;
    accAvatar = viewMaster.avatar;
    quickFilter = viewMaster.quick;
    accountViewID = clickedLi.dataset.id;
    localStorage.account_view = accountViewID;
    firstLoad();
  }
});

function renderDomPayment(data) {
  renderMonthlyinYear();
  renderAccountInfo(data);
  const isVisa = data.funding_source_details?.display_string.includes("VISA");
  dom_payment_block.innerHTML = `
      <div class="dom_block">
          <div class="dom_block_item w25">
            <h2>Current Debt Balance</h2>
            <div class="dom_balance">
              <p>
                <i class="fa-solid fa-money-check-dollar"></i>
                <span class="dom_balance_current">${formatCurrency(
                  data.balance
                )}</span>
                <span>+5% VAT</span>
              </p>
              <div>
                <p>Account Spent</p>
                <p class="dom_balance_total">${formatCurrency(
                  data.amount_spent
                )} <span>(Inc. VAT)</span></p>
                  <p class="small">Facebook returns 37 months ago</p>
              </div>
            </div>
          </div>

          <div class="dom_block_item w25">
            <h2>Payment info</h2>
            <div class="dom_payment_info">
            <p> 
      <img src="https://ampersand-reports-dom.netlify.app/DOM-img/${
        isVisa ? "visa.png" : "mastercard.png"
      }" />
      <span>${data.funding_source_details.display_string}</span>
    </p>
              <p>Currency: ${data.currency}</p>
              <p>Spend cap: ${
                data.spend_cap == 0
                  ? "No limit"
                  : formatCurrency(data.spend_cap)
              }</p>
            </div>
          </div>
          <div class="dom_block_item w50">
            <h2><i class="fa-solid fa-circle-info"></i> Account Info</h2>
            <div class="dom_account_info">
              <ul>
                <li>Account</li>
                <li>Account Name: ${data.name}</li>
                <li>Account ID: ${data.id}</li>
                <li>Create Time: ${data.created_time.split("T")[0]}</li>
              </ul>
              <ul>
                <li>Business</li>
                <li>Business Name: ${data.business.name}</li>
                <li>Business ID: ${data.business.id}</li>
                <li>Time Zone: ${data.timezone_name}</li>
              </ul>
            </div>
          </div>
        </div>
  `;
}
if (accounts.length) {
  isBrand = viewMaster.brand;
  accessTokenView = viewMaster.access;
  adAccountIdView = viewMaster.id;
  accAvatar = viewMaster.avatar;
  quickFilter = viewMaster.quick;
}
renderTableHead();
getStartEndFromURL();
function firstLoad() {
  renderQuickFilter();
  fetchAdAccount();
  mainApp();
  fetchDataMonthly(year);
}
if (accounts.length) {
  firstLoad();
}
async function fetchPostsFromAdsets(insightsData) {
  const allPosts = [];

  for (const item of insightsData) {
    const adsetId = item.adset_id;
    const adsetName = item.adset_name;
    const campaignName = item.campaign_name;

    try {
      // Lấy danh sách quảng cáo trong adset
      const adsUrl = `https://graph.facebook.com/v22.0/${adsetId}/ads?fields=id,name,creative{effective_object_story_id,object_story_spec{link_data,message,page_id}}&access_token=${accessTokenView}`;
      const adsRes = await fetch(adsUrl);
      const adsData = await adsRes.json();

      if (adsData.error) {
        console.error(
          `❌ Lỗi khi lấy ads trong adset ${adsetId}:`,
          adsData.error.message
        );
        continue;
      }

      for (const ad of adsData.data || []) {
        const creative = ad.creative;
        const storyId = creative?.effective_object_story_id;

        // Nếu quảng cáo có bài post gốc
        if (storyId) {
          const postUrl = `https://www.facebook.com/${storyId}`;
          const message = creative?.object_story_spec?.link_data?.message || "";
          const pageId = creative?.object_story_spec?.page_id || "";

          allPosts.push({
            ad_id: ad.id,
            ad_name: ad.name,
            adset_id: adsetId,
            adset_name: adsetName,
            campaign_name: campaignName,
            page_id: pageId,
            message,
            post_url: postUrl,
          });
        }
      }
    } catch (error) {
      console.error(`⚠️ Lỗi fetch bài post từ adset ${adsetId}:`, error);
    }
  }

  return allPosts;
}

async function fetchAdPostsByAdset(adsetId, accessToken) {
  const url = `https://graph.facebook.com/v22.0/${adsetId}/ads?fields=id,name,status,creative{effective_object_story_id,instagram_permalink_url}&access_token=${accessToken}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.error("Lỗi lấy ads:", data.error.message);
      return { posts: [], status: "Unknown" };
    }

    const ads = data.data || [];
    const posts = ads.map((ad) => ({
      facebook_post_url: ad.creative?.effective_object_story_id
        ? `https://facebook.com/${ad.creative.effective_object_story_id}`
        : null,
      instagram_post_url: ad.creative?.instagram_permalink_url || null,
    }));

    // ⚡️ Lấy status đầu tiên (thường các ads trong adset cùng trạng thái)
    const status = ads[0]?.status?.toUpperCase() || "UNKNOWN";

    return { posts, status };
  } catch (e) {
    console.error("Fetch ad posts error:", e);
    return { posts: [], status: "Unknown" };
  }
}
