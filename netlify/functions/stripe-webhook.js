const Stripe = require("stripe");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Google Sheets config
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : null;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// SMTP email config
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME || "Unix Training Academy";


// ────────────────────────────────────────────────────────────
// Log student data to Google Sheet
// ────────────────────────────────────────────────────────────
async function logToGoogleSheet(session) {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.warn("Google Sheets env vars not set — skipping sheet logging.");
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
    tuitionAmount,
    planType,
    amountPaid,
    "Paid"
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });
}


// ────────────────────────────────────────────────────────────
// Send confirmation email to student
// ────────────────────────────────────────────────────────────
async function sendConfirmationEmail(session) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    console.warn("SMTP env vars not set — skipping email sending.");
    return;
  }

  const meta = session.metadata || {};
  const studentName = meta.studentName || "Student";
  const email = session.customer_email || meta.email;
  if (!email) return;

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

  const subject = "Your Unix Training Academy PWYW Enrollment Confirmation";

  const html = `
<p>Hello ${studentName},</p>

<p>Thank you for enrolling in <strong>Unix Training Academy</strong>.</p>

<p><strong>PWYW Program:</strong> Pay What You Want (choose your tuition)<br/>
<strong>Plan:</strong> ${planType === "split"
      ? "50% today, 50% in 30 days"
      : "Full payment today"}<br/>
<strong>Amount charged today:</strong> $${amountPaid.toFixed(2)}</p>

<p>Your enrollment is confirmed. You will receive additional onboarding instructions shortly.</p>

<p>Best regards,<br/>Unix Training Academy</p>
`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject,
    html
  });
}


// ────────────────────────────────────────────────────────────
// Stripe Webhook Handler
// ────────────────────────────────────────────────────────────
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
    console.error("⚠️ Stripe Webhook verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    try {
      await logToGoogleSheet(session);
      await sendConfirmationEmail(session);
    } catch (err) {
      console.error("Post-payment handling error:", err);
    }
  }

  return { statusCode: 200, body: "Webhook received successfully" };
};
