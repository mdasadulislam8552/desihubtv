import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Supabase server configuration is missing",
    });
  }

  try {
    const busboy = Busboy({
      headers: req.headers,
    });

    let telegramUserId = "";
    let title = "";
    let category = "";

    let videoFile = null;
    let thumbnailFile = null;

    busboy.on("field", (name, value) => {
      if (name === "telegramUserId") {
        telegramUserId = value;
      }

      if (name === "title") {
        title = value;
      }

      if (name === "category") {
        category = value;
      }
    });

    busboy.on("file", (name, file, info) => {
      const {
        filename,
        mimeType,
      } = info;

      const chunks = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        const buffer = Buffer.concat(chunks);

        if (name === "video") {
          videoFile = {
            buffer,
            filename,
            mimeType,
          };
        }

        if (name === "thumbnail") {
          thumbnailFile = {
            buffer,
            filename,
            mimeType,
          };
        }
      });
    });

    busboy.on("finish", async () => {
      try {
        /* =========================
           ADMIN SECURITY
        ========================= */

        if (
          String(telegramUserId) !==
          "1395435702"
        ) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        /* =========================
           VIDEO REQUIRED
        ========================= */

        if (!videoFile) {
          return res.status(400).json({
            success: false,
            error: "Video file is required",
          });
        }

        /* =========================
           FILE SIZE
        ========================= */

        const MAX_SIZE =
          50 * 1024 * 1024;

        if (
          videoFile.buffer.length >
          MAX_SIZE
        ) {
          return res.status(400).json({
            success: false,
            error:
              "Video must be 50 MB or smaller",
          });
        }

        /* =========================
           FILE NAMES
        ========================= */

        const timestamp =
          Date.now();

        const safeVideoName =
          cleanFileName(
            videoFile.filename
          );

        const videoPath =
          `videos/${timestamp}-${safeVideoName}`;

        let thumbnailPath = null;

        if (thumbnailFile) {
          const safeThumbnailName =
            cleanFileName(
              thumbnailFile.filename
            );

          thumbnailPath =
            `thumbnails/${timestamp}-${safeThumbnailName}`;
        }

        /* =========================
           UPLOAD VIDEO
        ========================= */

        const videoUpload =
          await uploadToSupabase(
            SUPABASE_URL,
            SUPABASE_KEY,
            videoPath,
            videoFile.buffer,
            videoFile.mimeType ||
              "video/mp4"
          );

        if (!videoUpload.ok) {
          throw new Error(
            `Video upload failed: ${videoUpload.text}`
          );
        }

        /* =========================
           VIDEO PUBLIC URL
        ========================= */

        const videoUrl =
          `${SUPABASE_URL}/storage/v1/object/public/desi-hub-videos/${encodeURI(videoPath)}`;

        /* =========================
           UPLOAD THUMBNAIL
        ========================= */

        let thumbnailUrl = null;

        if (thumbnailFile) {
          const thumbnailUpload =
            await uploadToSupabase(
              SUPABASE_URL,
              SUPABASE_KEY,
              thumbnailPath,
              thumbnailFile.buffer,
              thumbnailFile.mimeType ||
                "image/jpeg"
            );

          if (!thumbnailUpload.ok) {
            throw new Error(
              `Thumbnail upload failed: ${thumbnailUpload.text}`
            );
          }

          thumbnailUrl =
            `${SUPABASE_URL}/storage/v1/object/public/desi-hub-videos/${encodeURI(thumbnailPath)}`;
        }

        /* =========================
           SAVE DATABASE
        ========================= */

        const databaseResponse =
          await fetch(
            `${SUPABASE_URL}/rest/v1/videos`,
            {
              method: "POST",

              headers: {
                apikey: SUPABASE_KEY,

                Authorization:
                  `Bearer ${SUPABASE_KEY}`,

                "Content-Type":
                  "application/json",

                Prefer:
                  "return=representation",
              },

              body: JSON.stringify({
                title:
                  title ||
                  "Untitled Video",

                category:
                  category ||
                  "Viral",

                file_id:
                  videoPath,

                video_url:
                  videoUrl,

                thumbnail_url:
                  thumbnailUrl,
              }),
            }
          );

        const databaseText =
          await databaseResponse.text();

        if (!databaseResponse.ok) {
          throw new Error(
            `Database save failed: ${databaseText}`
          );
        }

        /* =========================
           SUCCESS
        ========================= */

        return res.status(200).json({
          success: true,

          message:
            "Video uploaded successfully",

          title:
            title ||
            "Untitled Video",

          category:
            category ||
            "Viral",

          video_url:
            videoUrl,

          thumbnail_url:
            thumbnailUrl,

          video_path:
            videoPath,

          thumbnail_path:
            thumbnailPath,
        });

      } catch (error) {
        console.error(
          "SUPABASE UPLOAD ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            error.message ||
            "Upload failed",
        });
      }
    });

    req.pipe(busboy);

  } catch (error) {
    console.error(
      "UPLOAD HANDLER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Server error",
    });
  }
}


/* =========================
   SUPABASE STORAGE UPLOAD
========================= */

async function uploadToSupabase(
  supabaseUrl,
  supabaseKey,
  path,
  buffer,
  mimeType
) {
  const response =
    await fetch(
      `${supabaseUrl}/storage/v1/object/desi-hub-videos/${encodeURI(path)}`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${supabaseKey}`,

          apikey:
            supabaseKey,

          "Content-Type":
            mimeType,

          "x-upsert":
            "true",
        },

        body: buffer,
      }
    );

  const text =
    await response.text();

  return {
    ok:
      response.ok,

    text,
  };
}


/* =========================
   SAFE FILE NAME
========================= */

function cleanFileName(
  filename
) {
  return String(
    filename ||
      "file"
  )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
}
