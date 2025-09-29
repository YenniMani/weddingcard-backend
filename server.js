const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // to handle JSON in /save-rsvp

// Use memory storage instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Load Desktop credentials
const credentialsPath = path.join(__dirname, "desktop-credentials.json");
const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
const { client_secret, client_id, redirect_uris } = credentials.installed;

// OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Load tokens
const TOKEN_PATH = path.join(__dirname, "token.json");
oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

const drive = google.drive({ version: "v3", auth: oAuth2Client });

// 🔹 Folder ID for uploads (create in Google Drive manually, copy its ID)
const DRIVE_FOLDER_ID = "17Dwf4UQi8kvYUBkG_j-AJkhuUnb6u6SV"; // <--- replace with your folder ID

// Upload API
app.post("/photos-upload", upload.single("photo"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // Create readable stream from buffer
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: file.originalname,
      parents: [DRIVE_FOLDER_ID], // ✅ save inside common folder
    };
    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    const uploadedFile = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    // Make it public (anyone with link can view)
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    res.json({ success: true, fileUrl: uploadedFile.data.webViewLink });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
