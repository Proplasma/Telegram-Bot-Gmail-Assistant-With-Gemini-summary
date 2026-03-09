

# Trợ lý Bot Telegram Quản lý Gmail Tích hợp AI Gemini

Dự án này cung cấp mã nguồn Google Apps Script để tạo một bot Telegram có khả năng tự động quét các email mới, chưa đọc từ Gmail. Sau đó, hệ thống sử dụng mô hình trí tuệ nhân tạo Google Gemini 1.5 Flash để tóm tắt nội dung email và gửi thông báo trực tiếp đến Telegram của bạn. Người dùng có thể quản lý email (Đọc chi tiết, Đánh dấu đã đọc, Xóa thư) ngay trên giao diện Telegram thông qua các nút bấm tương tác.

## Tính năng nổi bật

* **Tóm tắt AI tự động:** Ứng dụng mô hình Gemini xử lý ngôn ngữ tự nhiên để tóm tắt các email dài thành các đoạn văn bản ngắn gọn dưới 80 từ.
* **Tương tác trực tiếp:** Các nút bấm nội tuyến (Inline Keyboards) cho phép thực thi lệnh trực tiếp với hộp thư Gmail mà không cần mở ứng dụng email.
* **Xử lý bất đồng bộ (Asynchronous Processing):** Cấu trúc mã nguồn sử dụng tiến trình chạy ngầm (Background Workers) để đảm bảo bot phản hồi lệnh dưới 0.1 giây, khắc phục hoàn toàn lỗi lặp lệnh do quá thời gian chờ (Webhook Storm) từ máy chủ Telegram.
* **Hệ thống lưu vết (Logging):** Mọi thao tác, tiến trình quét và lỗi hệ thống đều được ghi chú chi tiết theo thời gian thực vào một tệp Google Sheets.
* **Lệnh thủ công an toàn:** Hỗ trợ lệnh `/scan` để quét email chủ động, tích hợp cơ chế khóa tiến trình (Lock Mechanism) để chống thư rác hoặc quá tải hệ thống.


<img width="845" height="1493" alt="image" src="https://github.com/user-attachments/assets/8348bb27-e16c-4624-ba2e-e2af23f05ed3" />


  <img width="2389" height="715" alt="image" src="https://github.com/user-attachments/assets/ddc49881-c576-4f34-97c6-03d739862d59" />




## Yêu cầu chuẩn bị

Trước khi triển khai, bạn cần chuẩn bị các thông tin sau:

1. **Mã thông báo Telegram Bot (Bot Token):** Tạo bot mới và lấy mã từ BotFather trên Telegram.
2. **ID Trò chuyện Telegram (Chat ID):** ID định danh tài khoản Telegram cá nhân của bạn để bot biết nơi gửi thông báo.
3. **Khóa API Google Gemini (API Key):** Tạo khóa miễn phí từ nền tảng Google AI Studio.
4. **ID Tệp Google Sheets:** Tạo một tệp bảng tính Google Sheets trống và sao chép chuỗi ID từ đường dẫn URL.

## Hướng dẫn triển khai

**Bước 1: Cấu hình mã nguồn**

1. Mở Google Apps Script và tạo một dự án mới.
2. Sao chép toàn bộ mã nguồn của dự án này và dán vào tệp `Code.gs`.
3. Điền các thông tin đã chuẩn bị vào khối `CONFIG` ở đầu tệp mã nguồn (Giữ nguyên chuỗi `WEBAPP_URL` ở bước này).

**Bước 2: Cấp quyền hệ thống**

1. Mở tệp cấu hình `appsscript.json` trong trình chỉnh sửa Apps Script.
2. Thêm quyền tạo tiến trình ngầm bằng cách bổ sung mảng `"oauthScopes"` bao gồm `"https://www.googleapis.com/auth/script.scriptapp"`.
3. Chạy bất kỳ một hàm nào để ép hệ thống hiển thị bảng yêu cầu cấp quyền và nhấn Chấp thuận (Allow).

**Bước 3: Triển khai Ứng dụng Web (Web App)**

1. Chọn Triển khai (Deploy) -> Triển khai mới (New deployment).
2. Chọn loại ứng dụng là Ứng dụng Web (Web app).
3. Đặt quyền truy cập cho phần "Người có quyền truy cập" (Who has access) thành "Bất kỳ ai" (Anyone).
4. Nhấn Triển khai và sao chép đường dẫn URL được tạo ra.

**Bước 4: Kết nối Webhook**

1. Dán đường dẫn URL vừa sao chép vào biến `WEBAPP_URL` trong khối `CONFIG` và lưu tệp.
2. Chọn hàm `setWebhook` trên thanh công cụ và nhấn Chạy (Run) để liên kết máy chủ Telegram với Google Apps Script của bạn.

**Bước 5: Thiết lập chạy tự động**

1. Mở menu Bộ kích hoạt (Triggers) hình đồng hồ ở cột bên trái.
2. Tạo một bộ kích hoạt mới cho hàm `runAutoTrigger`.
3. Đặt nguồn sự kiện là "Theo thời gian" (Time-driven) và chu kỳ là mỗi 5 phút (Every 5 minutes).

---

---

# AI Gemini Integrated Gmail Management Telegram Bot

This project provides a Google Apps Script source code to create a Telegram bot capable of automatically scanning for new, unread emails from Gmail. The system then utilizes the Google Gemini 1.5 Flash artificial intelligence model to summarize the email content and pushes notifications directly to your Telegram. Users can manage emails (Read details, Mark as read, Delete) directly on the Telegram interface via interactive buttons.

## Key Features

* **Automated AI Summarization:** Applies the Gemini natural language processing model to summarize lengthy emails into concise texts of under 80 words.
* **Direct Interaction:** Inline Keyboards allow executing commands directly with the Gmail inbox without opening the email application.
* **Asynchronous Processing:** The code architecture employs Background Workers to ensure the bot responds to commands in under 0.1 seconds, completely resolving the timeout loop error (Webhook Storm) from the Telegram server.
* **Logging System:** All actions, scanning processes, and system errors are detailed in real-time into a designated Google Sheets file.
* **Secure Manual Command:** Supports the `/scan` command for proactive email scanning, integrating a Lock Mechanism to prevent spamming or system overload.

## Prerequisites

Before deployment, you need to prepare the following information:

1. **Telegram Bot Token:** Create a new bot and obtain the token from BotFather on Telegram.
2. **Telegram Chat ID:** Your personal Telegram account ID identifier so the bot knows where to send notifications.
3. **Google Gemini API Key:** Generate a free key from the Google AI Studio platform.
4. **Google Sheets ID:** Create a blank Google Sheets spreadsheet and copy the ID string from its URL.

## Deployment Guide

**Step 1: Source Code Configuration**

1. Open Google Apps Script and create a new project.
2. Copy the entire source code of this project and paste it into the `Code.gs` file.
3. Fill in the prepared information into the `CONFIG` block at the top of the source code file (Leave the `WEBAPP_URL` string empty or unchanged at this step).

**Step 2: System Authorization**

1. Open the `appsscript.json` manifest file in the Apps Script editor.
2. Grant permission to create background processes by adding the `"oauthScopes"` array including `"https://www.googleapis.com/auth/script.scriptapp"`.
3. Run any function to force the system to display the authorization request prompt and click Allow.

**Step 3: Web App Deployment**

1. Select Deploy -> New deployment.
2. Choose Web app as the deployment type.
3. Set the access permission for "Who has access" to "Anyone".
4. Click Deploy and copy the generated URL.

**Step 4: Webhook Connection**

1. Paste the copied URL into the `WEBAPP_URL` variable within the `CONFIG` block and save the file.
2. Select the `setWebhook` function on the toolbar and click Run to link the Telegram server with your Google Apps Script.

**Step 5: Automated Trigger Setup**

1. Open the Triggers menu (clock icon) on the left column.
2. Create a new trigger for the `runAutoTrigger` function.
3. Set the event source to "Time-driven" and the interval to Every 5 minutes.

---
