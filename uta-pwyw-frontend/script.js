// script.js — Cloudflare Pages + Functions (Production)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("payment-form");

  if (!form) {
    console.error("Form not found: payment-form");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    const plan = document.querySelector(
      'input[name="tuitionOption"]:checked'
    )?.value;

    let amount =
      plan === "full"
        ? 3500
        : Number(document.getElementById("amount").value);

    const paymentPlan =
      document.querySelector('input[name="paymentPlan"]:checked')?.value ||
      "full";

    if (!fullName || !email || !amount || !plan) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      fullName,
      email,
      phone,
      amount,
      plan,           // ✅ FIXED
      paymentPlan,
    };

    try {
      const res = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Server error:", text);
        throw new Error("Checkout request failed");
      }

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
});
