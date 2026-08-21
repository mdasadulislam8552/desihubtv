export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  // Health check
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      version: "V2",
      message: "Desi Hub TV Bot V2 Connected ✅"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const update = req.body;
    const message = update?.message;

    // Ignore non-message updates
    if (!message) {
      return res.status(200).json({
        ok: true,
        ignored: true
      });
    }

    // Only process videos
    if (!message.video) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "Not a video"
      });
    }

    // Check environment variables
    if (!BOT_TOKEN) {
      throw new Error("BOT_TOKEN is missing");
    }

    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL is missing");
    }

    if (!SUPABASE_KEY) {
      throw new Error("SUPABASE_ANON_KEY is missing");
    }

    // Telegram information
    const chatId = message.chat?.id;
    const fileId = message.video.file_id;

    const caption =
      (message.caption || "").trim();

    // Title
    const title =
      caption || "Untitled Video";

    // Thumbnail
    const thumbnailFileId =
      message.video.thumbnail?.file_id ||
      message.video.thumb?.file_id ||
      null;

    // Video information
    const fileUniqueId =
      message.video.file_unique_id || null;

    const fileSize =
      Number(message.video.file_size || 0);

    const duration =
      Number(message.video.duration || 0);

    const width =
      Number(message.video.width || 0);

    const height =
      Number(message.video.height || 0);

    // Category detection
    const lowerCaption =
      caption.toLowerCase();

    let category = "Viral";

    if (
      lowerCaption.includes("#deshi")
    ) {
      category = "Deshi";

    } else if (
      lowerCaption.includes("#instagram")
    ) {
      category = "Instagram";

    } else if (
      lowerCaption.includes("#tiktok")
    ) {
      category = "TikTok";

    } else if (
      lowerCaption.includes("#viral")
    ) {
      category = "Viral";
    }

    /*
      DUPLICATE CHECK

      file_id can change over time, so
      file_unique_id is preferred.
    */

    if (fileUniqueId) {

      const duplicateResponse =
        await fetch(
          `${SUPABASE_URL}/rest/v1/videos?file_unique_id=eq.${encodeURIComponent(
            fileUniqueId
          )}&select=id`,
          {
            method: "GET",

            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization":
                `Bearer ${SUPABASE_KEY}`
            }
          }
        );

      if (duplicateResponse.ok) {

        const duplicateData =
          await duplicateResponse.json();

        if (
          Array.isArray(duplicateData) &&
          duplicateData.length > 0
        ) {

          await sendTelegramMessage(
            BOT_TOKEN,
            chatId,
            "⚠️ এই ভিডিওটি আগে থেকেই Desi Hub TV-তে আছে।"
          );

          return res.status(200).json({
            ok: true,
            duplicate: true,
            message: "Video already exists"
          });
        }
      }
    }

    // Insert video
    const insertResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/videos`,
        {
          method: "POST",

          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization":
              `Bearer ${SUPABASE_KEY}`,
            "Content-Type":
              "application/json",
            "Prefer":
              "return=representation"
          },

          body: JSON.stringify({

            file_id:
              fileId,

            file_unique_id:
              fileUniqueId,

            title:
              title,

            category:
              category,

            thumbnail_file_id:
              thumbnailFileId,

            views:
              0,

            likes:
              0,

            file_size:
              fileSize,

            duration:
              duration,

            width:
              width,

            height:
              height
          })
        }
      );

    const responseText =
      await insertResponse.text();

    console.log(
      "SUPABASE STATUS:",
      insertResponse.status
    );

    console.log(
      "SUPABASE RESPONSE:",
      responseText
    );

    if (!insertResponse.ok) {

      throw new Error(
        `Supabase insert failed: ${insertResponse.status} ${responseText}`
      );
    }

    // Send confirmation to Telegram
    const confirmation =
      `✅ Video Saved Successfully!\n\n` +
      `🎬 Title: ${title}\n` +
      `📂 Category: ${category}\n` +
      `🖼️ Thumbnail: ${
        thumbnailFileId
          ? "Available ✅"
          : "Not available"
      }\n` +
      `⏱️ Duration: ${formatDuration(duration)}\n` +
      `📐 Size: ${width}×${height}\n` +
      `💾 File Size: ${formatFileSize(fileSize)}\n\n` +
      `🚀 Desi Hub TV V2`;

    await sendTelegramMessage(
      BOT_TOKEN,
      chatId,
      confirmation
    );

    return res.status(200).json({

      ok: true,

      version: "V2",

      saved: true,

      category:
        category,

      thumbnail:
        !!thumbnailFileId,

      file_unique_id:
        fileUniqueId,

      duration:
        duration,

      file_size:
        fileSize
    });

  } catch (error) {

    console.error(
      "BOT V2 ERROR:",
      error
    );

    return res.status(500).json({

      ok: false,

      version: "V2",

      error:
        error.message
    });
  }
}


/*
  TELEGRAM MESSAGE
*/

async function sendTelegramMessage(
  botToken,
  chatId,
  text
) {

  if (!botToken || !chatId) {
    return;
  }

  try {

    const response =
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            chat_id:
              chatId,

            text:
              text
          })
        }
      );

    if (!response.ok) {

      console.error(
        "TELEGRAM SEND ERROR:",
        await response.text()
      );
    }

  } catch (error) {

    console.error(
      "TELEGRAM ERROR:",
      error
    );
  }
}


/*
  DURATION FORMAT
*/

function formatDuration(
  seconds
) {

  seconds =
    Number(seconds || 0);

  if (!seconds) {
    return "Unknown";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  if (minutes >= 60) {

    const hours =
      Math.floor(minutes / 60);

    const remainingMinutes =
      minutes % 60;

    return (
      `${hours}h ` +
      `${remainingMinutes}m ` +
      `${remainingSeconds}s`
    );
  }

  return (
    `${minutes}m ` +
    `${remainingSeconds}s`
  );
}


/*
  FILE SIZE FORMAT
*/

function formatFileSize(
  bytes
) {

  bytes =
    Number(bytes || 0);

  if (!bytes) {
    return "Unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {

    return (
      `${(bytes / 1024).toFixed(1)} KB`
    );
  }

  if (bytes < 1024 * 1024 * 1024) {

    return (
      `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`
    );
  }

  return (
    `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`
  );
}
