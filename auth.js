const fs = require("fs");
const express = require("express");
const { google } = require("googleapis");

// ---- CONFIG ----
const CREDENTIALS_PATH = "weddingcard-backend/desktop-credentials.json";
const TOKEN_PATH = "token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const CREDENTIALS = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id } = CREDENTIALS.installed

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  "https://weddingcard-backend-izdvs0jc4-manis-projects-7b2dc0b8.vercel.app/oauth2callback"
);

const app = express();
// just for comment
// Step 1: Redirect user to Google consent screen
app.get("/auth", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

// Step 2: Google redirects back here with ?code=...
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code returned");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send("✅ Authentication successful! Token saved.");
  } catch (err) {
    console.error("Error retrieving access token", err);
    res.send("❌ Error retrieving access token.");
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
  console.log("👉 Visit http://localhost:3000/auth to start auth flow");
});
