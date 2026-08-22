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
      title,
      category,
      videoFileId,
      thumbnailFileId
    } = req.body || {};

    // ADMIN ONLY
    if (String(telegramUserId) !== "1395435702") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized"
      });
    }

    if (!title || !videoFileId) {
      return res.status(400).json({
        success: false,
        error: "Title and video file ID are required"
      });
    }

    const SUPABASE_URL =
      process.env.SUPABASE_URL;

    const SUPABASE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase environment variables are missing"
      });
    }

    const response = await fetch(
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
          file_id: videoFileId,
          title: title,
          category: category || "Other",
          thumbnail_file_id:
            thumbnailFileId || null,
          views: 0,
          likes: 0
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    return res.status(200).json({
      success: true,
      video: data[0] || data
    });

  } catch (error) {

    console.error(
      "UPLOAD VIDEO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
