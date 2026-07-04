const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { uploadFile, uploadVideo } = require("joy-upload-api");

module.exports.config = {
  name: "upload",
  credits: "Joy Ahmed",
  version: "1.0.0",
  permission: 0,
  description: "Reply to an image or video to upload and get direct link",
  category: "utility",
  usages: "reply image/video",
  prefix: true,
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { messageReply, threadID, messageID } = event;

  if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
    return api.sendMessage(
      "⚠️ অনুগ্রহ করে একটি ছবি বা ভিডিওর রিপ্লাই দিয়ে এই কমান্ডটি ব্যবহার করুন।",
      threadID,
      messageID
    );
  }

  const attachment = messageReply.attachments[0];

  if (!["photo", "video", "animated_image"].includes(attachment.type)) {
    return api.sendMessage(
      "❌ শুধুমাত্র ছবি এবং ভিডিও সাপোর্ট করে।",
      threadID,
      messageID
    );
  }

  const waitInfo = await new Promise(resolve =>
    api.sendMessage(
      "⏳ ফাইলটি আপলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...",
      threadID,
      (err, info) => resolve(info)
    )
  );

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const ext = attachment.type === "video" ? "mp4" : "jpg";
  const filePath = path.join(cacheDir, `upload_${Date.now()}.${ext}`);

  try {
    const response = await axios.get(attachment.url, {
      responseType: "stream"
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    let uploadedUrl;

    if (attachment.type === "video") {
      const result = await uploadVideo(filePath, {
        time: "72h"
      });
      uploadedUrl = result.url;
    } else {
      uploadedUrl = await uploadFile(filePath);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (waitInfo?.messageID) {
      api.unsendMessage(waitInfo.messageID);
    }

    return api.sendMessage(
      `✅ সফলভাবে আপলোড হয়েছে!\n\n🔗 ${uploadedUrl}`,
      threadID,
      messageID
    );

  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (waitInfo?.messageID) {
      api.unsendMessage(waitInfo.messageID);
    }

    console.error("Upload Error:", err);

    return api.sendMessage(
      `❌ আপলোড করতে সমস্যা হয়েছে!\n\n${err.message}`,
      threadID,
      messageID
    );
  }
};
