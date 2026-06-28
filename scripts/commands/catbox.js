const CatboxUploader = require('joy-catbox-upload');
const axios = require('axios');
const path = require('path');

module.exports.config = {
  name: "catbox2",
  credits: "Joy Ahmed",
  version: "1.0.1",
  permission: 0,
  description: "যেকোনো ছবি, ভিডিও বা ফাইলের রিপ্লাই দিয়ে ক্যাটবক্স লিংক তৈরি করুন",
  category: "utility",
  usages: "any file reply -> catbox",
  prefix: true,
  cooldowns: 5,
  dependencies: {
    "joy-catbox-upload": "^3.2.0",
    "axios": "^1.7.0"
  }
};

module.exports.run = async function ({ api, event }) {
  const { messageReply, threadID, messageID } = event;

  if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
    return api.sendMessage(
      "⚠️ অনুগ্রহ করে যেকোনো ছবি, ভিডিও, অডিও বা ফাইলের রিপ্লাই দিয়ে এই কমান্ডটি ব্যবহার করুন।",
      threadID, messageID
    );
  }

  const attachment = messageReply.attachments[0];
  const fileUrl = attachment.url;

  if (!fileUrl) {
    return api.sendMessage("❌ ফাইলের ইউআরএল খুঁজে পাওয়া যায়নি।", threadID, messageID);
  }

  let fileExtension = 'bin';
  if (attachment.type === 'photo') fileExtension = 'jpg';
  else if (attachment.type === 'video') fileExtension = 'mp4';
  else if (attachment.type === 'audio') fileExtension = 'mp3';
  else if (attachment.type === 'file') {
    const parsedUrl = path.parse(fileUrl.split('?')[0]);
    fileExtension = parsedUrl.ext ? parsedUrl.ext.replace('.', '') : 'bin';
  }

  const fileName = `upload_${Date.now()}.${fileExtension}`;

  const waitInfo = await new Promise(resolve =>
    api.sendMessage(
      "⏳ ফাইলটি প্রসেস হচ্ছে এবং ক্যাটবক্সে আপলোড করা হচ্ছে, দয়া করে অপেক্ষা করুন...",
      threadID, (err, info) => resolve(info)
    )
  );

  try {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);

    const uploader = new CatboxUploader();
    const catboxUrl = await uploader.upload(fileBuffer, fileName, attachment.type);

    if (waitInfo && waitInfo.messageID) api.unsendMessage(waitInfo.messageID);

    return api.sendMessage(
      `✅ সফলভাবে আপলোড হয়েছে!\n\n` +
      `📁 ফাইলের নাম: ${fileName}\n` +
      `🔗 লিংক: ${catboxUrl}`,
      threadID, messageID
    );

  } catch (err) {
    if (waitInfo && waitInfo.messageID) api.unsendMessage(waitInfo.messageID);
    console.error("Catbox upload error:", err.message);
    return api.sendMessage(
      `❌ আপলোড করতে সমস্যা হয়েছে!\nএরর: ${err.message}`,
      threadID, messageID
    );
  }
};
