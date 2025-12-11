export default {
  async fetch(request, env) {

    // Handle GET (for testing)
    if (request.method === "GET") {
      return new Response("UTA PWYW API Running", { status: 200 });
    }

    // --- HANDLE CHECKOUT POST REQUEST ---
    if (request.method === "POST" && new URL(request.url).pathname === "/checkout") {
      try {
        const data = await request.json();

        const { fullName, email, phone, plan, amount } = data;

        if (!fullName || !email || !amount) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400 }
          );
        }

        // Create Stripe checkout session
        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "success_url": "https://offer.unixtrainingacademy.com/success",
            "cancel_url": "https://offer.unixtrainingacademy.com/cancel",
            "payment_method_types[]": "card",
            "mode": "payment",
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][product_data][name]": `UTA Training - ${plan}`,
            "line_items[0][price_data][unit_amount]": amount * 100,
            "line_items[0][quantity]": "1",
            "customer_email": email
          }),
        });

        const stripeData = await stripeRes.json();

        if (stripeData.error) {
          return new Response(JSON.stringify({ error: stripeData.error }), { status: 500 });
        }

        return new Response(
          JSON.stringify({ url: stripeData.url }),
          { status: 200 }
        );

      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Server error", details: err.message }),
          { status: 500 }
        );
      }
    }

    // Default
    return new Response("Not Found", { status: 404 });
  }
};





