// script.js

const form = document.getElementById("payment-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const tuitionOption = document.querySelector('input[name="tuitionOption"]:checked').value;

  let amount =
    tuitionOption === "full"
      ? 3500
      : Number(document.getElementById("amount").value);

  const paymentPlanRadio = document.querySelector(
    'input[name="paymentPlan"]:checked'
  );
  const paymentPlan = paymentPlanRadio ? paymentPlanRadio.value : "full";

  const payload = {
    fullName,
    email,
    phone,
    amount,
    tuitionOption,
    paymentPlan,
  };

  try {
    // 1️⃣ Save to Google Sheets
    await fetch("/.netlify/functions/saveToSheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 2️⃣ Create Stripe Checkout Session
    const res = await fetch(
      "/.netlify/functions/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout session could not be created.");
      console.error(data);
    }
  } catch (err) {
    alert("A network error occurred while submitting your form.");
    console.error(err);
  }
});








