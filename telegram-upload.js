export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {

    const {
      telegramUserId,
      videoFileId,
      thumbnailFileId
    } = req.body || {};


    // ADMIN ONLY
    if (
      String(telegramUserId) !==
      "1395435702"
    ) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized"
      });
    }


    if (!videoFileId) {
      return res.status(400).json({
        success: false,
        error: "Video file ID is required"
      });
    }


    const BOT_TOKEN =
      process.env.TELEGRAM_BOT_TOKEN;


    if (!BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error:
          "TELEGRAM_BOT_TOKEN is not configured"
      });
    }


    /*
      Get Telegram video information
    */

    const telegramResponse =
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(videoFileId)}`
      );


    const telegramData =
      await telegramResponse.json();


    if (!telegramResponse.ok ||
        !telegramData.ok) {

      return res.status(400).json({
        success: false,
        error:
          telegramData.description ||
          "Telegram getFile failed"
      });

    }


    const file =
      telegramData.result;


    return res.status(200).json({

      success: true,

      file_id: videoFileId,

      file_path:
        file.file_path || null,

      thumbnail_file_id:
        thumbnailFileId || null

    });


  } catch (error) {

    console.error(
      "TELEGRAM UPLOAD ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Server error"

    });

  }

}
