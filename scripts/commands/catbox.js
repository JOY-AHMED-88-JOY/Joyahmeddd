const CatboxUploader = require('joy-catbox-upload');
const uploader = new CatboxUploader();
const axios = require('axios');
const path = require('path');

module.exports.config = {
  name: "catbox",
  credit: " Joy Ahmed",
  version: "1.0.1",
  permission: 0, 
  description: "যেকোনো ছবি, ভিডিও বা ফাইলের রিপ্লাই দিয়ে ক্যাটবক্স লিংক তৈরি করুন",
  category: "utility",
  usages: "any file reply -> catbox",
  prefix: true,
  premium: false, 
  cooldown: 5,
  dependencies: {
    "joy-catbox-upload": "^1.5.0",
    "axios": "^1.7.0"
  }
};

module.exports.onStart = async function ({ api, event }) {
  try {
    const { messageReply, type, threadID, messageID } = event;

    // ১. চেক করা হচ্ছে ইউজার কোনো মেসেজে রিপ্লাই দিয়েছে কিনা এবং তাতে ফাইল আছে কিনা
    if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("⚠️ অনুগ্রহ করে যেকোনো ছবি, ভিডিও, অডিও বা ফাইলের রিপ্লাই দিয়ে এই কমান্ডটি ব্যবহার করুন।", threadID, messageID);
    }

    // [FIX 1] প্রথম অ্যাটাচমেন্টটি সঠিক ইনডেক্স [0] দিয়ে ধরা হলো
    const attachment = messageReply.attachments[0];
    const fileUrl = attachment.url;
    
    if (!fileUrl) {
      return api.sendMessage("❌ ফাইলের ইউআরএল খুঁজে পাওয়া যায়নি।", threadID, messageID);
    }

    // ফাইলের টাইপ অনুযায়ী এক্সটেনশন সেট করা
    let fileExtension = 'bin';
    if (attachment.type === 'photo') fileExtension = 'jpg';
    else if (attachment.type === 'video') fileExtension = 'mp4';
    else if (attachment.type === 'audio') fileExtension = 'mp3';
    else if (attachment.type === 'file') {
      // [FIX 2] split('?')[0] যোগ করা হয়েছে যাতে ক্লিন পাথ পাওয়া যায়
      const parsedUrl = path.parse(fileUrl.split('?')[0]);
      fileExtension = parsedUrl.ext ? parsedUrl.ext.replace('.', '') : 'bin';
    }

    // ইউনিক ফাইল নেম জেনারেট
    const fileName = `upload_${Date.now()}.${fileExtension}`;

    // ইউজারকে প্রসেসিং মেসেজ দেওয়া
    api.sendMessage("⏳ ফাইলটি প্রসেস হচ্ছে এবং ক্যাটবক্সে আপলোড করা হচ্ছে, দয়া করে অপেক্ষা করুন...", threadID, async (err, info) => {
      try {
        // ২. মেসেঞ্জার সার্ভার থেকে ফাইল বাফার ডাউনলোড করা
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(response.data);

        // ৩. প্যাকেজ দিয়ে ক্যাটবক্সে আপলোড
        const catboxUrl = await uploader.upload(fileBuffer, fileName, attachment.type);

        // প্রসেসিং মেসেজটি আনসেন্ড করা (বট সাপোর্ট করলে)
        if (info && info.messageID) {
          api.unsendMessage(info.messageID);
        }

        // ৪. ইউজারকে ফাইনাল রেসপন্স পাঠানো
        const successMessage = 
          `✅ **সফলভাবে আপলোড হয়েছে!**\n\n` +
          `📁 **ফাইলের নাম:** ${fileName}\n` +
          `🔗 **লিংক:** ${catboxUrl}`;

        return api.sendMessage(successMessage, threadID, messageID);

      } catch (uploadError) {
        console.error("Upload process failed:", uploadError.message);
        return api.sendMessage(`❌ আপলোড করতে সমস্যা হয়েছে!\nএরর: ${uploadError.message}`, threadID, messageID);
      }
    }, messageID);

  } catch (error) {
    console.error("Catbox Core System Error:", error.message);
    return api.sendMessage(`❌ সিস্টেম ইন্টারনাল এরর: ${error.message}`, event.threadID, event.messageID);
  }
};
