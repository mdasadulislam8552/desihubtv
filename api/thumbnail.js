export default async function handler(req, res) {
  try {
    const fileId = req.query.file_id;

    if (!fileId) {
      return res.status(400).json({
        error: "file_id is required"
      });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;

    if (!BOT_TOKEN) {
      return res.status(500).json({
        error: "BOT_TOKEN is missing"
      });
    }

    const getFileUrl =
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;

    const fileResponse =
      await fetch(getFileUrl);

    const fileData =
      await fileResponse.json();

    console.log(
      "THUMBNAIL GETFILE STATUS:",
      fileResponse.status
    );

    console.log(
      "THUMBNAIL GETFILE RESPONSE:",
      JSON.stringify(fileData)
    );

    if (!fileResponse.ok || !fileData.ok) {
      return res.status(500).json({
        error: "Telegram thumbnail getFile failed",
        telegram: fileData
      });
    }

    const filePath =
      fileData.result.file_path;

    const downloadUrl =
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    const imageResponse =
      await fetch(downloadUrl);

    console.log(
      "THUMBNAIL DOWNLOAD STATUS:",
      imageResponse.status
    );

    if (!imageResponse.ok) {
      return res.status(500).json({
        error: "Thumbnail download failed"
      });
    }

    const contentType =
      imageResponse.headers.get("content-type") ||
      "image/jpeg";

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=86400"
    );

    const buffer =
      await imageResponse.arrayBuffer();

    return res
      .status(200)
      .send(Buffer.from(buffer));

  } catch (error) {

    console.error(
      "THUMBNAIL ERROR:",
      error
    );

    return res.status(500).json({
      error: error.message
    });
  }
}
