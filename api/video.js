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
        error: "BOT_TOKEN environment variable is missing"
      });
    }

    const getFileUrl =
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;

    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();

    console.log("TELEGRAM GETFILE STATUS:", fileResponse.status);
    console.log("TELEGRAM GETFILE RESPONSE:", JSON.stringify(fileData));

    if (!fileResponse.ok || !fileData.ok) {
      return res.status(500).json({
        error: "Telegram getFile failed",
        telegram: fileData
      });
    }

    const filePath = fileData.result.file_path;

    const downloadUrl =
      `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const videoResponse = await fetch(downloadUrl);

    console.log("TELEGRAM VIDEO STATUS:", videoResponse.status);

    if (!videoResponse.ok) {
      return res.status(500).json({
        error: "Telegram video download failed"
      });
    }

    const contentType =
      videoResponse.headers.get("content-type") || "video/mp4";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const contentLength =
      videoResponse.headers.get("content-length");

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const buffer = await videoResponse.arrayBuffer();

    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {

    console.error("VIDEO API ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
