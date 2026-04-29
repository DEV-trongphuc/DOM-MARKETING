const fs = require('fs');
const path = require('path');

// Đường dẫn tới file index.html
const filePath = path.join(__dirname, 'index.html');

try {
  // Đọc nội dung file
  let content = fs.readFileSync(filePath, 'utf8');

  // Tạo version mới dựa trên timestamp để đảm bảo luôn mới
  const newVersion = Date.now();

  // Thay thế tất cả các chuỗi có dạng ?v=số thành ?v=version_mới
  const updatedContent = content.replace(/\?v=\d+/g, `?v=${newVersion}`);

  // Ghi đè lại nội dung mới vào file
  fs.writeFileSync(filePath, updatedContent, 'utf8');

  console.log(`Đã cập nhật thành công tất cả các query ?v thành ?v=${newVersion} trong index.html`);
} catch (error) {
  console.error("Có lỗi xảy ra:", error);
}
