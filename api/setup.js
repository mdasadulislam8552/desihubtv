export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    return res.status(500).json({
      ok: false,
      error: "BOT_TOKEN is missing"
    });
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Use GET"
    });
  }

  const webhookUrl =
    "https://desihubtv-five.vercel.app/api/bot";

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
  );

  const result = await response.json();

  return res.status(200).json(result);
}
