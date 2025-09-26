const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// Load Google Service Account credentials
const KEYFILEPATH = path.join(__dirname, "credentials", "weddingphotos-key.json");  
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });

// Folder ID from your Drive link
const FOLDER_ID = "17Dwf4UQi8kvYUBkG_j-AJkhuUnb6u6SV"; // Share this folder with your service account email

app.post("/photos-upload", upload.single("photo"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const fileMetadata = {
      name: req.file.originalname,
      parents: [FOLDER_ID],
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    // cleanup temp file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      fileUrl: file.data.webViewLink,
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
