export async function onRequestPost({ request, env }) {
  try {
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

    const params = new URLSearchParams({
      mode: "payment",
      success_url:
        "https://offer.unixtrainingacademy.com/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        "https://offer.unixtrainingacademy.com/index.html?cancelled=true",
      customer_email: email,

      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]":
        plan === "full"
          ? "UTA Full Tuition"
          : "UTA Pay What You Want Tuition",
      "line_items[0][price_data][product_data][description]":
        `Student: ${fullName}${phone ? " | Phone: " + phone : ""}`,
      "line_items[0][price_data][unit_amount]": String(amountInCents),
      "line_items[0][quantity]": "1",

      "metadata[fullName]": fullName,
      "metadata[email]": email,
      "metadata[phone]": phone || "",
      "metadata[plan]": plan || "",
      "metadata[paymentPlan]": paymentPlan || "",
    });

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );

    const session = await stripeResponse.json();

    if (!session.url) {
      return new Response(
        JSON.stringify({ error: "Stripe session creation failed", session }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
