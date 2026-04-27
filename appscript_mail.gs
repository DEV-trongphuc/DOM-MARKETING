function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var type = data.type || "unknown";
    var email = data.email || "";
    var name = data.name || "Quý khách";
    var slug = data.slug || "";
    
    // Ghi dữ liệu vào sheet "meta"
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("meta");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("meta");
      sheet.appendRow(["Timestamp", "Type", "Email", "Name", "Slug", "Extra Info"]);
    }
    sheet.appendRow([new Date(), type, email, name, slug, JSON.stringify(data)]);
    
    // Gửi email dựa trên loại
    if(email) {
      if (type === "register") {
        sendTrialEmail(email, name, slug, data.expires_at);
      } else if (type === "renewal") {
        sendRenewalRequestEmail(email, name, slug, data.plan);
      } else if (type === "upgrade") {
        sendUpgradeSuccessEmail(email, name, slug, data.expires_at, data.add_days);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã xử lý email" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("OK");
}

function _getBaseHtml(title, subtitle, contentHtml) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0e121a; border-radius: 20px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
      <!-- Header -->
      <div style="text-align: center; padding: 40px 20px 35px; background-color: #0a0a0a; border-bottom: 2px solid #f97316;">
          <div style="margin-bottom: 12px;">
              <img src="https://domation.vercel.app/imgs/ICON.png" alt="Logo" style="width: 44px; height: 44px; vertical-align: middle; margin-right: 14px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.4);" />
              <span style="color: #ffffff; font-size: 34px; font-weight: 900; letter-spacing: 2.5px; vertical-align: middle;">DOMA<span style="color: #f59e0b;">TION</span></span>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin: 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Hệ Thống Báo Cáo Meta Đa Kênh</p>
      </div>
      <!-- Content -->
      <div style="padding: 48px 40px; background-color: #0e121a;">
          <h2 style="color: #ffffff; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 24px;">${title}</h2>
          ${contentHtml}
      </div>
      <!-- Footer -->
      <div style="background-color: #0a0a0a; padding: 32px 24px; text-align: center; border-top: 1px solid #1f2937;">
          <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.6;">
              © 2026 DOM Marketing. All rights reserved.<br/>
              Email này được gửi tự động từ hệ thống quản trị DOMATION.
          </p>
      </div>
  </div>
  `;
}

function sendTrialEmail(recipient, name, slug, expiresAt) {
  var subject = "DOMATION - Cảm ơn bạn đã đăng ký sử dụng hệ thống báo cáo!";
  var content = `
    <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin-bottom: 24px;">
        Chào <strong>${name}</strong>,<br><br>
        Cảm ơn Quý khách đã tin tưởng và đăng ký trải nghiệm nền tảng báo cáo tự động <strong>DOMATION</strong>. Hệ thống đã thiết lập thành công Workspace của bạn.
    </p>
    
    <div style="background-color: #1a150c; border-left: 4px solid #f59e0b; padding: 24px; margin: 36px 0; border-radius: 0 12px 12px 0;">
        <p style="color: #fcd34d; font-size: 16px; margin: 0 0 10px 0; font-weight: 500; line-height: 1.6;">
            <strong>Thông tin Workspace:</strong>
        </p>
        <ul style="color: #fbbf24; font-size: 15px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>ID/Slug: <strong style="color: #fff;">${slug}</strong></li>
            <li>Đường dẫn: <a href="https://meta.domation.net/${slug}" style="color: #60a5fa; text-decoration: none;">https://meta.domation.net/${slug}</a></li>
            <li>Hết hạn vào: <strong style="color: #ef4444;">${expiresAt}</strong></li>
        </ul>
    </div>
    
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.7;">
        Quý khách đang trong thời gian dùng thử hệ thống. Hãy xem xét nâng cấp lên gói trả phí để có thể tiếp tục truy cập và sử dụng lâu dài, tránh bị gián đoạn dữ liệu báo cáo.
    </p>
    
    <div style="text-align: center; margin-top: 48px;">
        <a href="https://meta.domation.net/${slug}" target="_blank" style="background-color: #f59e0b; background-image: linear-gradient(to right, #fbbf24, #f97316); color: #000000; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 16px;">
            Truy Cập Workspace Của Bạn
        </a>
    </div>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: _getBaseHtml("Kính chào Quý khách,", "", content),
    name: "DOMATION TEAM"
  });
}

function sendRenewalRequestEmail(recipient, name, slug, plan) {
  var subject = "DOMATION - Xác nhận yêu cầu gia hạn gói dịch vụ";
  var planName = plan === "1_year" ? "Gói 1 Năm" : "Gói 1 Tháng";
  
  var content = `
    <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin-bottom: 24px;">
        Chào <strong>${name}</strong>,<br><br>
        Hệ thống đã ghi nhận yêu cầu đăng ký / gia hạn gói dịch vụ từ Workspace <strong>${slug}</strong>.
    </p>
    
    <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 24px; margin: 36px 0; border-radius: 12px;">
        <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 10px 0; line-height: 1.6;">
            Gói dịch vụ yêu cầu: <strong style="color: #38bdf8; font-size: 18px;">${planName}</strong>
        </p>
        <p style="color: #94a3b8; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
            "Admin của DOMATION sẽ sớm liên hệ với bạn qua số Zalo bạn đã cung cấp để hướng dẫn thanh toán và kích hoạt gói ngay lập tức."
        </p>
    </div>
    
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.7;">
        Cảm ơn bạn đã luôn tin tưởng và đồng hành cùng hệ thống báo cáo tự động của chúng tôi. Nếu có thắc mắc gấp, vui lòng phản hồi lại email này.
    </p>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: _getBaseHtml("Kính chào Quý khách,", "", content),
    name: "DOMATION ADMIN"
  });
}

function sendUpgradeSuccessEmail(recipient, name, slug, expiresAt, addDays) {
  var subject = "DOMATION - Gia hạn dịch vụ thành công!";
  var durationStr = addDays >= 365 ? "1 năm" : (addDays == 30 ? "1 tháng" : (addDays + " ngày"));
  
  var content = `
    <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin-bottom: 24px;">
        Chào <strong>${name}</strong>,<br><br>
        Tin vui cho bạn! Admin hệ thống vừa xử lý thành công yêu cầu nâng cấp gói dịch vụ cho Workspace <strong>${slug}</strong> của bạn.
    </p>
    
    <div style="background-color: #064e3b; border-left: 4px solid #10b981; padding: 24px; margin: 36px 0; border-radius: 0 12px 12px 0;">
        <h3 style="color: #a7f3d0; font-size: 18px; margin: 0 0 15px 0;">Thông tin gia hạn:</h3>
        <ul style="color: #d1fae5; font-size: 15px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Thời gian cộng thêm: <strong style="color: #fff;">${durationStr}</strong></li>
            <li>Trạng thái tài khoản: <strong style="color: #34d399;">ĐÃ KÍCH HOẠT (ACTIVE)</strong></li>
            <li>Hạn sử dụng mới: <strong style="color: #fff;">${expiresAt}</strong></li>
        </ul>
    </div>
    
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.7;">
        Bây giờ hệ thống của bạn sẽ hoạt động hoàn toàn bình thường. Mọi luồng dữ liệu API từ Meta sẽ tiếp tục được lấy và tự động hóa hàng ngày.
    </p>
    
    <div style="text-align: center; margin-top: 48px;">
        <a href="https://meta.domation.net/${slug}" target="_blank" style="background-color: #10b981; background-image: linear-gradient(to right, #34d399, #059669); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 16px;">
            Vào Trang Quản Trị Của Bạn
        </a>
    </div>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: _getBaseHtml("Kính chào Quý khách,", "", content),
    name: "DOMATION TEAM"
  });
}