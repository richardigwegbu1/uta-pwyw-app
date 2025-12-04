// netlify/functions/saveToSheet.js

const { google } = require("googleapis");

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    const {
      fullName,
      email,
      phone,
      amount,
      tuitionOption,
      paymentPlan,
    } = body;

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!accessToken || !clientEmail || !sheetId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing Google Sheets environment variables",
        }),
      };
    }

    // Authenticate using access token instead of full JSON key
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: accessToken,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      fullName,
      email,
      phone,
      amount,
      tuitionOption,
      paymentPlan,
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Google Sheets Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
