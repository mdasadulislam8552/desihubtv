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

  try {

    const BOT_TOKEN =
      process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: "TELEGRAM_BOT_TOKEN is not configured",
      });
    }


    const busboy =
      Busboy({
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


    busboy.on(
      "file",
      (name, file, info) => {

        const {
          filename,
          mimeType,
        } = info;


        const chunks = [];


        file.on("data", chunk => {
          chunks.push(chunk);
        });


        file.on("end", () => {

          const buffer =
            Buffer.concat(chunks);


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

      }
    );


    busboy.on(
      "finish",
      async () => {

        try {

          /* =========================
             ADMIN ONLY
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
             SEND VIDEO TO TELEGRAM
          ========================= */

          const videoForm =
            new FormData();


          const videoBlob =
            new Blob(
              [
                videoFile.buffer
              ],
              {
                type:
                  videoFile.mimeType ||
                  "video/mp4",
              }
            );


          videoForm.append(
            "chat_id",
            telegramUserId
          );


          videoForm.append(
            "video",
            videoBlob,
            videoFile.filename
          );


          if (title) {

            videoForm.append(
              "caption",
              title
            );

          }


          const telegramVideoResponse =
            await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
              {
                method: "POST",
                body: videoForm,
              }
            );


          const telegramVideoData =
            await telegramVideoResponse.json();


          if (
            !telegramVideoResponse.ok ||
            !telegramVideoData.ok
          ) {

            return res.status(400).json({
              success: false,
              error:
                telegramVideoData.description ||
                "Telegram video upload failed",
            });

          }


          const telegramVideo =
            telegramVideoData.result.video;


          const videoFileId =
            telegramVideo.file_id;


          /* =========================
             THUMBNAIL
          ========================= */

          let thumbnailFileId = null;


          if (thumbnailFile) {

            const photoForm =
              new FormData();


            const photoBlob =
              new Blob(
                [
                  thumbnailFile.buffer
                ],
                {
                  type:
                    thumbnailFile.mimeType ||
                    "image/jpeg",
                }
              );


            photoForm.append(
              "chat_id",
              telegramUserId
            );


            photoForm.append(
              "photo",
              photoBlob,
              thumbnailFile.filename
            );


            const telegramPhotoResponse =
              await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                {
                  method: "POST",
                  body: photoForm,
                }
              );


            const telegramPhotoData =
              await telegramPhotoResponse.json();


            if (
              telegramPhotoResponse.ok &&
              telegramPhotoData.ok
            ) {

              const photos =
                telegramPhotoData.result.photo;


              if (
                Array.isArray(photos) &&
                photos.length
              ) {

                thumbnailFileId =
                  photos[
                    photos.length - 1
                  ].file_id;

              }

            }

          }


          /* =========================
             SUCCESS
          ========================= */

          return res.status(200).json({

            success: true,

            title,

            category,

            video_file_id:
              videoFileId,

            thumbnail_file_id:
              thumbnailFileId,

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
              "Telegram upload failed",

          });

        }

      }
    );


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
