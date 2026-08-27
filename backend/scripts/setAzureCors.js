require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

/**
 * Sets a CORS rule on the Azure Blob service so the browser (hls.js) can fetch
 * HLS playlists/segments cross-origin. Without this, lesson videos hosted on
 * Azure fail with a CORS error even though the blob itself returns 200.
 *
 * Run once: node scripts/setAzureCors.js
 */
(async () => {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!conn) {
    console.error("AZURE_STORAGE_CONNECTION_STRING is not set in .env");
    process.exit(1);
  }

  const client = BlobServiceClient.fromConnectionString(conn);

  // Preserve existing logging/metrics; only replace the CORS rules.
  const props = await client.getProperties();
  props.cors = [
    {
      allowedOrigins: "*", // anonymous HLS reads — safe to allow any origin
      allowedMethods: "GET,HEAD,OPTIONS",
      allowedHeaders: "*",
      exposedHeaders: "*",
      maxAgeInSeconds: 3600,
    },
  ];

  await client.setProperties(props);
  console.log("✅ Azure Blob CORS rule applied:");
  console.log("   origins=*  methods=GET,HEAD,OPTIONS  headers=*  maxAge=3600");
  process.exit(0);
})().catch((e) => {
  console.error("❌ Failed to set Azure CORS:", e.message);
  process.exit(1);
});
