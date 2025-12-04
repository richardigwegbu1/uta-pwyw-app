const { google } = require("googleapis");

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    const body = JSON.parse(event.body);

    // Load credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      scopes
    );

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1dk_vxTPL5mdhqY8tBb_fxMEwfFsjuNJLlGxqaDWC8zE";
    const sheetName = "Sheet1"; // change if your sheet tab has a different name

    const row = [
      new Date().toLocaleString(),
      body.fullName,
      body.email,
      body.phone,
      body.tuitionOption,
      body.pwywAmount || "",
      body.paymentPlan || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Saved to Google Sheets" }),
    };
  } catch (error) {
    console.error("Error saving to sheet:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
