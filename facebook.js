const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const login = require("fb-chat-api");
const fs = require("fs");

// คุกกี้ที่บันทึกไว้จากไฟล์ในการล็อคอิน
const sessionCookie = JSON.parse(fs.readFileSync("login.json", "utf8"));

// เข้าสู่ระบบ Facebook โดยใช้คุกกี้
login({ appState: sessionCookie }, (err, api) => {
  if (err) return console.error(err);

  // ฟังข้อความเข้า
  api.listen((err, message) => {
    if (err) return console.error(err);

    // ตรวจสอบว่าข้อความนั้นเป็นข้อความและมีลิงก์ YouTube หรือไม่
    if (message.type === "message" && ytdl.validateURL(message.body)) {
      console.log(`Downloading audio from ${message.body}...`);

      // ดาวน์โหลดเสียงจากลิงค์ YouTube
      const audioStream = ytdl(message.body, { filter: "audioonly" });
      const audioFilePath = "audio.mp4";
      audioStream.pipe(fs.createWriteStream(audioFilePath));
      audioStream.on("end", () => {
        console.log("Audio downloaded successfully!");

        // แปลงเสียงเป็นรูปแบบ Opus
        const voiceFilePath = "audio.opus";
        console.log("Converting to Opus format...");
        ffmpeg(audioFilePath)
          .noVideo()
          .audioCodec("libopus")
          .audioBitrate(64)
          .save(voiceFilePath)
          .on("end", () => {
            console.log("Audio converted to Opus format successfully!");

            // ส่งข้อความเสียงกลับไปยังผู้ใช้
            const voiceStream = fs.createReadStream(voiceFilePath);
            const pictureStream = fs.createReadStream("รูปภาพ");
            const replySong = `PLAY MUSIC :D\n${message.body}`;
            api.sendMessage(
              { attachment: voiceStream },
              message.threadID,
              (err, messageInfo) => {
                if (err) return console.error(err);
                console.log("Voice message sent successfully!");
                api.sendMessage(replySong, message.threadID);
                api.sendMessage({attachment: pictureStream},message.threadID)
              }
            );
          })
          .on("error", (err) => {
            console.error(`Error converting to Opus format: ${err}`);
          });
      });
    }
  });
});