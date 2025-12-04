// netlify/functions/create-checkout-session.js

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    const { fullName, email, amount, paymentPlan } = body;

    let lineItems = [];

    // Split payment — charge 50% now
    if (paymentPlan === "split") {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "UTA Training — 50% initial payment" },
          unit_amount: Math.round(amount * 0.5 * 100),
        },
        quantity: 1,
      });
    } else {
      // Full payment
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "UTA Training — Full Payment" },
          unit_amount: amount * 100,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
      metadata: {
        student_name: fullName,
        student_email: email,
        tuition_amount: amount,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
