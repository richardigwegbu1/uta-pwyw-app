const Stripe = require("stripe");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Google Sheets
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : null;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// SMTP / email
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME || "Unix Training Academy";

async function logToGoogleSheet(session) {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.warn("Google Sheets env vars not set, skipping sheet logging.");
    return;
  }

  const auth = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  const meta = session.metadata || {};
  const studentName = meta.studentName || "";
  const email = session.customer_email || meta.email || "";
  const planType = meta.planType || "";
  const tuitionAmount = meta.tuitionAmount || "";
  const amountPaid = (session.amount_total || 0) / 100;

  const row = [
    new Date().toISOString(),
    studentName,
    email,
    planType,
    tuitionAmount,
    amountPaid
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });
}

async function sendConfirmationEmail(session) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    console.warn("SMTP env vars not set, skipping email sending.");
    return;
  }

  const meta = session.metadata || {};
  const studentName = meta.studentName || "Student";
  const email = session.customer_email || meta.email;
  if (!email) {
    console.warn("No email on session, skipping email.");
    return;
  }

  const amountPaid = (session.amount_total || 0) / 100;
  const planType = meta.planType || "full";

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const subject = "Your Unix Training Academy Enrollment Confirmation";
  const text = `
Hello ${studentName},

Thank you for enrolling in Unix Training Academy.

Plan: ${planType === "split" ? "50% now / 50% in 30 days" : "Full payment"}
Amount charged today: $${amountPaid.toFixed(2)}

You will receive additional details about your training access shortly.

Best regards,
Unix Training Academy
`;

  const html = `
<p>Hello ${studentName},</p>
<p>Thank you for enrolling in <strong>Unix Training Academy</strong>.</p>
<p>
  <strong>Plan:</strong>
  ${planType === "split" ? "50% now / 50% in 30 days" : "Full payment"}<br/>
  <strong>Amount charged today:</strong> $${amountPaid.toFixed(2)}
</p>
<p>You will receive additional details about your training access shortly.</p>
<p>Best regards,<br/>Unix Training Academy</p>
`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject,
    text,
    html
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    try {
      await logToGoogleSheet(session);
      await sendConfirmationEmail(session);
    } catch (err) {
      console.error("Post-payment handler error:", err);
    }
  }

  return { statusCode: 200, body: "Received" };
};
