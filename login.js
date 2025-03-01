document.getElementById("view_report").addEventListener("click", () => {
  const adId = document.getElementById("ad_id").value.trim();
  const accessToken = document.getElementById("access_token").value.trim();

  if (!adId || !accessToken) {
    alert("Vui lòng nhập đầy đủ Ad ID và Access Token!");
    return;
  }
  fetchAdAccountActivities(adId, accessToken);
});
async function fetchAdAccountActivities(adId, accessToken) {
  let apiUrl = `https://graph.facebook.com/v22.0/act_${adId}?fields=balance,age,created_time,fb_entity,tax_id,id,name,account_status,currency,amount_spent,funding_source_details,spend_cap,business,owner,timezone_name,disable_reason&access_token=${accessToken}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.name) {
      const accounts = {
        brand: false,
        quick: [
          "Lead Form",
          "Awareness",
          "Engagement",
          "Message",
          "Traffic",
          "Pagelike",
        ],
        avatar: "./img/dom_avatar.jpg",
        name: data.name,
        id: adId,
        access: accessToken,
      };
      localStorage.setItem("accounts", JSON.stringify([accounts]));
      window.location.href = "/"; // Điều hướng đến trang báo cáo
    } else {
      alert("ID hoặc Token không hợp lệ");
    }
  } catch (error) {
    alert("ID hoặc Token không hợp lệ");
    console.error("Fetch error:", error.message);
  }
}
