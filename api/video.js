export default async function handler(req, res) {
  try {
    const fileId = req.query.file_id;

    if (!fileId) {
      return res.status(400).json({
        error: "file_id is required"
      });
    }

    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({
        error: "BOT_TOKEN is missing"
      });
    }

    const fileResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );

    const fileData = await fileResponse.json();

    if (!fileResponse.ok || !fileData.ok) {
      return res.status(500).json({
        error: "Telegram getFile failed"
      });
    }

    const filePath = fileData.result.file_path;

    const telegramVideo = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );

    if (!telegramVideo.ok) {
      return res.status(500).json({
        error: "Unable to fetch Telegram video"
      });
    }

    res.setHeader(
      "Content-Type",
      telegramVideo.headers.get("content-type") || "video/mp4"
    );

    const contentLength = telegramVideo.headers.get("content-length");

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    res.setHeader("Cache-Control", "public, max-age=3600");

    const buffer = await telegramVideo.arrayBuffer();

    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {

    console.error("VIDEO STREAM ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
