export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Desi Hub TV Bot Connected ✅"
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

    if (!message) {
      return res.status(200).json({
        ok: true
      });
    }

    if (!message.video) {
      return res.status(200).json({
        ok: true
      });
    }

    if (!BOT_TOKEN) {
      throw new Error("BOT_TOKEN is missing");
    }

    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL is missing");
    }

    if (!SUPABASE_KEY) {
      throw new Error("SUPABASE_ANON_KEY is missing");
    }

    // Telegram video information
    const fileId = message.video.file_id;

    const title =
      message.caption || "Untitled Video";

    // Telegram thumbnail information
    const thumbnailFileId =
      message.video.thumbnail?.file_id ||
      message.video.thumb?.file_id ||
      null;

    // Detect category from caption
    const caption =
      title.toLowerCase();

    let category = "Viral";

    if (caption.includes("#deshi")) {
      category = "Deshi";
    } else if (caption.includes("#instagram")) {
      category = "Instagram";
    } else if (caption.includes("#tiktok")) {
      category = "TikTok";
    } else if (caption.includes("#viral")) {
      category = "Viral";
    }

    // Save video to Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/videos`,
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },

        body: JSON.stringify({
          file_id: fileId,
          title: title,
          category: category,
          thumbnail_file_id: thumbnailFileId,
          views: 0,
          likes: 0
        })
      }
    );

    const supabaseText =
      await supabaseResponse.text();

    console.log(
      "SUPABASE STATUS:",
      supabaseResponse.status
    );

    console.log(
      "SUPABASE RESPONSE:",
      supabaseText
    );

    if (!supabaseResponse.ok) {
      throw new Error(
        `Supabase insert failed: ${supabaseResponse.status} ${supabaseText}`
      );
    }

    // Confirmation message
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: message.chat.id,

          text:
            `✅ Video Saved!\n\n` +
            `📂 Category: ${category}\n` +
            `🎬 Title: ${title}\n` +
            `🖼️ Thumbnail: ${
              thumbnailFileId
                ? "Available"
                : "Not available"
            }`
        })
      }
    );

    return res.status(200).json({
      ok: true,
      saved: true,
      category: category,
      thumbnail: !!thumbnailFileId
    });

  } catch (error) {

    console.error(
      "BOT ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
