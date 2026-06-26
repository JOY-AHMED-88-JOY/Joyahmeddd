const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const FormData = require("form-data");

module.exports.config = {
  name: "add",
  version: "1.0.0",
  credits: "JOY AHMED + ChatGPT",
  permission: 0,
  description: "Add replied video to database",
  category: "admin",
  usages: "reply video then /add <name>",
  prefix: true,
  cooldown: 5,
  dependencies: {
    axios: "",
    "form-data": ""
  }
};

module.exports.run = async ({ api, event, args }) => {
  try {

    if (!event.messageReply)
      return api.sendMessage(
        "❌ Reply to a video.",
        event.threadID,
        event.messageID
      );

    const att = event.messageReply.attachments[0];

    if (!att || att.type !== "video")
      return api.sendMessage(
        "❌ Reply must contain a video.",
        event.threadID,
        event.messageID
      );

    const name = args.join(" ").trim();

    if (!name)
      return api.sendMessage(
        "Usage:\n/add joy video",
        event.threadID,
        event.messageID
      );

    const temp = path.join(
      os.tmpdir(),
      Date.now() + ".mp4"
    );

    const writer = fs.createWriteStream(temp);

    const response = await axios({
      url: att.url,
      method: "GET",
      responseType: "stream"
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const form = new FormData();

    form.append("name", name);

    form.append(
      "video",
      fs.createReadStream(temp)
    );
        const { data } = await axios.post(
      "https://joy-random-api-11.vercel.app/add",
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity
      }
    );

    fs.unlinkSync(temp);

    if (!data.status) {
      return api.sendMessage(
        "❌ " + (data.message || "Upload failed."),
        event.threadID,
        event.messageID
      );
    }

    api.sendMessage(
      `✅ Video Added Successfully

📛 Name: ${data.name}
🔗 URL: ${data.url}`,
      event.threadID,
      event.messageID
    );

  } catch (e) {

    console.log(e);

    api.sendMessage(
      "❌ Error:\n" + e.message,
      event.threadID,
      event.messageID
    );

  }
};
