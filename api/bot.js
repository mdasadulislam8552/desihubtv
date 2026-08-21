export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "Desi Hub TV bot is running"
    });
  }

  try {
    const update = req.body;

    if (update.message) {
      const message = update.message;

      if (message.video) {
        const video = message.video;

        console.log({
          type: "video",
          file_id: video.file_id,
          file_unique_id: video.file_unique_id,
          caption: message.caption || ""
        });
      }
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
}
