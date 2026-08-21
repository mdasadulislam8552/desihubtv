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

    // Get Telegram file information
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      return res.status(500).json({
        error: "Telegram getFile failed",
        details: telegramData
      });
    }

    const filePath = telegramData.result.file_path;

    // Redirect browser to Telegram file
    const videoUrl =
      `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    return res.redirect(302, videoUrl);

  } catch (error) {

    console.error("VIDEO API ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
