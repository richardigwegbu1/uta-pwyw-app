const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { studentName, email, amount, planType } = JSON.parse(event.body || "{}");

    // Validate input
    if (!studentName || !email || !amount || !planType) {
      return { statusCode: 400, body: "Missing required fields" };
    }

    if (amount < 999 || amount > 3500) {
      return { statusCode: 400, body: "Invalid PWYW tuition amount" };
    }

    const tuitionCents = Math.round(amount * 100);

    // Netlify env URLs
    const successUrl =
      process.env.SUCCESS_URL ||
      "https://scintillating-dieffenbachia-89ff39.netlify.app/success.html?session_id={CHECKOUT_SESSION_ID}";

    const cancelUrl =
      process.env.CANCEL_URL ||
      "https://scintillating-dieffenbachia-89ff39.netlify.app/index.html";

    let session;

    // ───────────────────────────────────────────────
    // FULL PAYMENT
    // ───────────────────────────────────────────────
    if (planType === "full") {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Unix Training Academy – PWYW Full Payment",
                description: `Full tuition: $${amount.toLocaleString()}`
              },
              unit_amount: tuitionCents
            },
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          studentName,
          email,
          planType: "full",
          tuitionAmount: String(amount)
        }
      });
    }

    // ───────────────────────────────────────────────
    // 50/50 PAYMENT PLAN
    // ───────────────────────────────────────────────
    else if (planType === "split") {
      const depositCents = Math.round(tuitionCents * 0.5);
      const remainingCents = tuitionCents - depositCents;

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Unix Training Academy – PWYW 50% Deposit",
                description: `50% deposit on tuition: $${amount.toLocaleString()}`
              },
              unit_amount: depositCents
            },
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          studentName,
          email,
          planType: "split",
          tuitionAmount: String(amount),
          depositAmountCents: String(depositCents),
          remainingAmountCents: String(remainingCents)
        }
      });
    }

    else {
      return { statusCode: 400, body: "Invalid plan type" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    console.error("Stripe create session error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
