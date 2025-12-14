i// script.js — Cloudflare Pages + Functions (Production)

const form = document.getElementById("payment-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const tuitionOption = document.querySelector(
    'input[name="tuitionOption"]:checked'
  ).value;

  let amount =
    tuitionOption === "full"
      ? 3500
      : Number(document.getElementById("amount").value);

  const paymentPlanRadio = document.querySelector(
    'input[name="paymentPlan"]:checked'
  );
  const paymentPlan = paymentPlanRadio
    ? paymentPlanRadio.value
    : "full";

  const payload = {
    fullName,
    email,
    phone,
    amount,
    tuitionOption,
    paymentPlan,
  };

  try {
    const res = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout failed. Please try again.");
      console.error(data);
    }
  } catch (err) {
    alert("Network error. Please try again.");
    console.error(err);
  }
});

