let gApiVersion = "";
let gSheetVersion = "";
let gDriveFolders = [];
let gSheetId = "";

const fs = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const GS_TOKEN_PATH = path.join(process.cwd(), "utils/lib/gs_token.json");
const GD_TOKEN_PATH = path.join(process.cwd(), "utils/lib/gd_token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "utils/lib/credentials.json");

class googleAPI {
  constructor() {
    gApiVersion = browser.config.gApiVersion;
    gDriveFolders = browser.config.gDriveFolders;
    gSheetId = browser.config.gSheetId;
    gSheetVersion = browser.config.gSheetVersion;
  }

  /**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
  async loadSavedCredentialsIfExist(type) {
    const TOKEN_PATH = type === "gs" ? GS_TOKEN_PATH : GD_TOKEN_PATH;
    try {
      const content = await fs.promises.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  /**
   * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async saveCredentials(client, type) {
    const content = await fs.promises.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });

    if (type === "gs") {
      await fs.promises.writeFile(GS_TOKEN_PATH, payload);
    } else {
      await fs.promises.writeFile(GD_TOKEN_PATH, payload);
    }
  }

  /**
   * Load or request or authorization to call APIs.
   *
   */
  async authorize(type) {
    let client = await this.loadSavedCredentialsIfExist(type);
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await this.saveCredentials(client, type);
    }
    return client;
  }

  /**
   * Lists the names and IDs of up to 10 files.
   */
  async listFiles() {
    // Authorize
    const authClient = await this.authorize("gd");

    const drive = google.drive({
      version: gApiVersion,
      auth: authClient,
    });

    const res = await drive.files.list({
      pageSize: 10,
      fields: "nextPageToken, files(id, name)",
      q: `mimeType='image/png' and '${gDriveFolders[0]}' in parents`,
    });

    const files = res.data.files;
    if (files.length === 0) {
      console.log("No files found.");
      return;
    }

    console.log("Files:");
    files.map((file) => {
      console.log(`${file.name} (${file.id})`);
    });
  }

  /**
   * Upload a single file to Google Drive
   * @param {String} filePath Full file path
   * @returns {String} Uploaded file id from Drive
   */
  async uploadFile(filePath) {
    const imgContent = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);

    // Authorize
    const authClient = await this.authorize("gd");

    const drive = google.drive({
      version: gApiVersion,
      auth: authClient,
    });

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: `image/png`,
        parents: gDriveFolders,
      },
      media: {
        mimeType: `image/png`,
        body: imgContent,
      },
    });

    return res.data.id;
  }

  /**
   * 
   * @param {String} imgId Google Drive file id
   * @param {String} range Range in Google Sheet to be updated
   */
  async insertImg2GS(imgId, range) {
    const imgUrl = `https://drive.google.com/uc?export=view&id=${imgId}`;
    const formula = `=IMAGE("${imgUrl}",1)`;

    // Authorize
    const authClient = await this.authorize("gs");

    const sheets = google.sheets({ version: gSheetVersion, auth: authClient });

    await sheets.spreadsheets.values.update({
      spreadsheetId: gSheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        range: range,
        majorDimension: "ROWS",
        values: [[formula]],
      },
    });
  }
  async insertText2GS(text, range) {
    // Authorize
    const authClient = await this.authorize('gs');

    const sheets = google.sheets({ version: gSheetVersion, auth: authClient });

    await sheets.spreadsheets.values.update({
        spreadsheetId: gSheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            range: range,
            majorDimension: 'ROWS',
            values: [[text]],
        },
    });
}
}
module.exports = new googleAPI();
