// functions/checkout.js

import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const body = await request.json();

    const {
      fullName,
      email,
      phone,
      amount,
      plan,
      paymentPlan,
    } = body;

    if (!fullName || !email || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const amountInCents = Math.round(Number(amount) * 100);

    if (amountInCents < 5000) {
      return new Response(
        JSON.stringify({ error: "Amount too low" }),
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:
                plan === "full"
                  ? "UTA Full Tuition"
                  : "UTA Pay What You Want Tuition",
              description: `Student: ${fullName}${
                phone ? " | Phone: " + phone : ""
              }`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],

      metadata: {
        fullName,
        email,
        phone: phone || "",
        plan,
        paymentPlan,
      },

      success_url:
        "https://offer.unixtrainingacademy.com/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        "https://offer.unixtrainingacademy.com/index.html?cancelled=true",
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Checkout error:", err);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}



