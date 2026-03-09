/**
 * ============================================================
 * PHẦN 1: CẤU HÌNH HỆ THỐNG
 * Hướng dẫn: Điền các thông tin của bạn vào các biến dưới đây 
 * TRƯỚC KHI triển khai ứng dụng. Tuyệt đối KHÔNG chia sẻ file 
 * này lên mạng sau khi đã điền thông tin thật.
 * ============================================================
 */
const CONFIG = {
  // Thay bằng token bot Telegram của bạn (Lấy từ @BotFather)
  BOT_TOKEN: 'YOUR_TELEGRAM_BOT_TOKEN_HERE', 
  
  // Thay bằng Chat ID của bạn (Lấy từ @userinfobot)
  MY_CHAT_ID: 'YOUR_TELEGRAM_CHAT_ID_HERE',
  
  // Thay bằng API Key của Google Gemini (Lấy từ Google AI Studio)
  GEMINI_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  
  // Thay bằng ID của file Google Sheet (Phần chuỗi ký tự giữa /d/ và /edit trong URL)
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
  
  // Thay bằng URL Web App sau khi Deploy bản cập nhật mới nhất
  WEBAPP_URL: 'YOUR_WEB_APP_URL_HERE', 

  // Tên các trang tính (Sheet) dùng để lưu log
  LOG_SHEET_NAME: 'LOGS',
  OLD_LOG_SHEET_NAME: 'OLD_LOGS'
};

/**
 * ============================================================
 * PHẦN 2: HÀM CÀI ĐẶT & DẬP BÃO (WEBHOOK MANAGEMENT)
 * ============================================================
 */
function EMERGENCY_STOP_BOT() {
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`;
  try { Logger.log("🛑 ĐÃ DẬP BÃO: " + UrlFetchApp.fetch(url).getContentText()); } catch (e) {}
}

function setWebhook() {
  if (CONFIG.WEBAPP_URL === 'YOUR_WEB_APP_URL_HERE') {
    Logger.log("❌ LỖI: Cần điền WEBAPP_URL vào cấu hình trước khi set Webhook!");
    return;
  }
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook?url=${CONFIG.WEBAPP_URL}&drop_pending_updates=true`;
  try { Logger.log("✅ Cài đặt Webhook: " + UrlFetchApp.fetch(url).getContentText()); } catch (e) {}
}

/**
 * ============================================================
 * PHẦN 3: XỬ LÝ LỆNH CHAT VÀ NÚT BẤM SIÊU TỐC (< 0.05s)
 * ============================================================
 */
function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");

  try {
    const data = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    // 1. LỆNH /scan CHẠY NGẦM VÀ KHÓA VAN NGAY LẬP TỨC
    if (data.message && data.message.text === "/scan") {
      if (data.message.chat.id.toString() === CONFIG.MY_CHAT_ID.toString()) {
        
        // KIỂM TRA Ổ KHÓA: Nếu đang quét rồi thì phớt lờ lệnh này (CHỐNG LẶP TUYỆT ĐỐI)
        if (!props.getProperty('SCAN_LOCK')) {
          props.setProperty('SCAN_LOCK', 'true'); // Sập cửa khóa lại
          ScriptApp.newTrigger('runManualScan').timeBased().after(10).create();
        }
      }
      return ContentService.createTextOutput("OK"); // Trả lời Tele ngay lập tức
    }

    // 2. NÚT BẤM CHẠY NGẦM
    if (data.callback_query) {
      const callback = data.callback_query;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;
      const [action, threadId] = callback.data.split('_');

      if (chatId.toString() !== CONFIG.MY_CHAT_ID.toString()) return ContentService.createTextOutput("Unauthorized");

      UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/answerCallbackQuery`, {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({ callback_query_id: callback.id })
      });

      let loadingText = action === "view" ? "⏳ Đang tải nội dung chi tiết..." : "⏳ Đang xử lý yêu cầu...";
      updateMessage(chatId, messageId, loadingText);

      props.setProperty('TASK_' + callback.id, JSON.stringify({
        action: action, threadId: threadId, chatId: chatId, messageId: messageId
      }));

      ScriptApp.newTrigger('processButtonTasks').timeBased().after(10).create();

      return ContentService.createTextOutput("OK"); 
    }
  } catch (err) {
    return ContentService.createTextOutput("Error");
  }
}

/**
 * ============================================================
 * PHẦN 4: CÁC TIẾN TRÌNH CHẠY NGẦM (BACKGROUND WORKERS)
 * ============================================================
 */

// Worker 1: Chuyên quét thủ công (Có mở khóa khi xong)
function runManualScan() {
  try {
    sendTelegram(CONFIG.MY_CHAT_ID, "🔎 Đang quét hộp thư thủ công cho bạn...");
    checkGmailAndNotify(true); 
  } finally {
    PropertiesService.getScriptProperties().deleteProperty('SCAN_LOCK'); // Quét xong thì mở khóa
    cleanUpTriggers('runManualScan');
  }
}

// Worker 2: Chuyên quét tự động (IM LẶNG 100% nếu không có mail)
function runAutoTrigger() {
  checkGmailAndNotify(false); 
}

// Worker 3: Chuyên xử lý nút bấm
function processButtonTasks() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();

  for (let key in allProps) {
    if (key.startsWith('TASK_')) {
      const task = JSON.parse(allProps[key]);
      props.deleteProperty(key); 

      try {
        const thread = GmailApp.getThreadById(task.threadId);
        const lastMsg = thread.getMessages().pop();

        if (task.action === "view") {
          let fullBody = lastMsg.getPlainBody();
          if (!fullBody || fullBody.trim() === "") fullBody = lastMsg.getBody().replace(/<[^>]*>?/gm, ' '); 
          if (!fullBody || fullBody.trim() === "") fullBody = "⚠️ Email định dạng phức tạp, vui lòng bấm 'Mở Gmail'.";
          
          sendTelegram(task.chatId, `📖 *NỘI DUNG CHI TIẾT:*\n\n${fullBody.substring(0, 3900)}`);
          updateMessage(task.chatId, task.messageId, `✅ Đã mở chi tiết email: *${lastMsg.getSubject()}*`);
          writeLog(lastMsg.getFrom(), lastMsg.getSubject(), "VIEW_DETAIL", task.threadId);
        } 
        else if (task.action === "read") {
          thread.markRead();
          updateMessage(task.chatId, task.messageId, `✅ *Đã xử lý (Đã đọc)*\n👤 *Từ:* ${lastMsg.getFrom()}\n📌 *Tiêu đề:* ${lastMsg.getSubject()}`);
          writeLog(lastMsg.getFrom(), lastMsg.getSubject(), "MARK_READ", task.threadId);
        } 
        else if (task.action === "trash") {
          thread.moveToTrash();
          updateMessage(task.chatId, task.messageId, `🗑 *Đã xử lý (Đã xóa)*\n👤 *Từ:* ${lastMsg.getFrom()}\n📌 *Tiêu đề:* ${lastMsg.getSubject()}`);
          writeLog(lastMsg.getFrom(), lastMsg.getSubject(), "MOVE_TO_TRASH", task.threadId);
        }
      } catch (e) {
        writeLog("SYSTEM", "N/A", "BUTTON_ERROR", task.threadId, e.name, e.message);
      }
    }
  }
  cleanUpTriggers('processButtonTasks');
}

function cleanUpTriggers(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/**
 * ============================================================
 * PHẦN 5: LOGIC QUÉT MAIL CHÍNH
 * ============================================================
 */
function checkGmailAndNotify(isManual = false) {
  const labelName = "BotScanned";
  let label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  const threads = GmailApp.search(`is:unread newer_than:2h -label:${labelName}`);

  if (threads.length === 0) {
    if (isManual) sendTelegram(CONFIG.MY_CHAT_ID, "✅ Đã quét xong! Không có email mới nào trong 2 giờ qua.");
    return; // Nếu auto (isManual = false) thì nó sẽ im lặng hoàn toàn ở đây
  }

  const maxLimit = Math.min(threads.length, 2);

  for (let i = 0; i < maxLimit; i++) {
    const thread = threads[i];
    try {
      const messages = thread.getMessages();
      const lastMsg = messages[messages.length - 1];
      const threadId = thread.getId();
      const subject = lastMsg.getSubject();
      const from = lastMsg.getFrom();
      
      let body = lastMsg.getPlainBody();
      if (!body || body.trim() === "") body = lastMsg.getBody().replace(/<[^>]*>?/gm, ' '); 
      
      const summary = getGeminiSummary(body.substring(0, 3000));
      const messageText = `📧 *CÓ EMAIL MỚI*\n\n👤 *Người gửi:* ${from}\n📌 *Tiêu đề:* ${subject}\n✨ *AI Tóm lược:* _${summary}_`;

      const keyboard = {
        inline_keyboard: [
          [{ text: "📄 Đọc chi tiết", callback_data: `view_${threadId}` }, { text: "✅ Đã đọc", callback_data: `read_${threadId}` }],
          [{ text: "🗑 Xóa", callback_data: `trash_${threadId}` }, { text: "🌐 Mở Gmail", url: `https://mail.google.com/mail/u/0/#inbox/${threadId}` }]
        ]
      };

      if (sendTelegram(CONFIG.MY_CHAT_ID, messageText, keyboard)) {
        writeLog(from, subject, "SENT_SUMMARY", threadId);
        thread.addLabel(label);
      }
    } catch (err) { writeLog("SYSTEM", "N/A", "ERROR_IN_LOOP", "N/A", err.name, err.message); }
  }
}

/**
 * ============================================================
 * PHẦN 6: CÁC HÀM HỖ TRỢ & AI
 * ============================================================
 */
function getGeminiSummary(text) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${CONFIG.GEMINI_KEY}`;
    const payload = { contents: [{ parts: [{ text: "Hãy tóm tắt email sau bằng tiếng Việt (dưới 80 từ): " + text }] }] };
    
    const res = UrlFetchApp.fetch(url, { 
      method: "post", 
      contentType: "application/json", 
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const json = JSON.parse(res.getContentText());
    if (json.error) return "Lỗi AI: " + json.error.message;
    return json.candidates[0].content.parts[0].text;
    
  } catch (e) { return "Không thể tóm tắt: " + e.message; }
}

function writeLog(sender, subject, action, id, errName = "None", errMsg = "Success") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow(["Thời gian", "Người gửi", "Tiêu đề", "Hành động", "ID Mail", "Tên Lỗi", "Mô tả Lỗi"]);
    }
    const now = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([now, sender, subject, action, id, errName, errMsg]);
  } catch (e) {}
}

function sendTelegram(chatId, text, keyboard) {
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown", reply_markup: keyboard }), muteHttpExceptions: true });
  return JSON.parse(res.getContentText()).ok;
}

function updateMessage(chatId, messageId, newText) {
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/editMessageText`;
  UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, message_id: messageId, text: newText, parse_mode: "Markdown" }) });
}