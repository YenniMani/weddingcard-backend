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
const DRIVE_FOLDER_ID = "marraigeAttendancePhotos"; // <--- replace with your folder ID

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

// 🔹 RSVP save API
const RSVP_FILE = path.join(__dirname, "rsvp.json");

app.post("/save-rsvp", (req, res) => {
  try {
    const { photoUrl, guestName, attending } = req.body;
    if (!photoUrl || !guestName) {
      return res
        .status(400)
        .json({ success: false, error: "photoUrl and guestName required" });
    }

    let rsvps = [];
    if (fs.existsSync(RSVP_FILE)) {
      const existing = fs.readFileSync(RSVP_FILE, "utf8");
      rsvps = existing ? JSON.parse(existing) : [];
    }

    const newEntry = {
      id: Date.now(),
      guestName,
      attending,
      photoUrl,
    };

    rsvps.push(newEntry);
    fs.writeFileSync(RSVP_FILE, JSON.stringify(rsvps, null, 2));

    res.json({ success: true, entry: newEntry });
  } catch (err) {
    console.error("RSVP save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Fetch all RSVPs (optional admin use)
app.get("/rsvps", (req, res) => {
  try {
    if (!fs.existsSync(RSVP_FILE)) return res.json([]);
    const rsvps = JSON.parse(fs.readFileSync(RSVP_FILE, "utf8"));
    res.json(rsvps);
  } catch (err) {
    console.error("RSVP fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
