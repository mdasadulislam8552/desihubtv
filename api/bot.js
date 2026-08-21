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
    return res.status(405).json({ ok: false });
  }

  try {
    const update = req.body;
    const message = update.message;

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    // শুধু ভিডিও এলে Save হবে
    if (message.video) {
      const fileId = message.video.file_id;
      const title = message.caption || "Untitled Video";

      // Caption দিয়ে category ঠিক হবে
      let category = "Viral";

      if (title.toLowerCase().includes("#deshi")) category = "Deshi";
      if (title.toLowerCase().includes("#instagram")) category = "Instagram";
      if (title.toLowerCase().includes("#tiktok")) category = "TikTok";

      // Supabase এ Save
      await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          file_id: fileId,
          title: title,
          category: category
        })
      });

      // User কে Reply
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: `✅ Video Saved!\n\n📂 Category: ${category}\n🎬 Title: ${title}`
        })
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
