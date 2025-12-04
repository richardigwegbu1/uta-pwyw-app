const form = document.getElementById("payment-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const tuitionOption = document.querySelector('input[name="tuitionOption"]:checked').value;
  let amount = tuitionOption === "full"
    ? 3500
    : Number(document.getElementById("amount").value);

  // payment plan only really matters for PWYW, but we send it either way
  const paymentPlanRadio = document.querySelector('input[name="paymentPlan"]:checked');
  const paymentPlan = paymentPlanRadio ? paymentPlanRadio.value : "full";

  const payload = {
    fullName,
    email,
    phone,
    amount,
    tuitionOption,
    paymentPlan
  };

  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("There was a problem creating the checkout session.");
      console.error(data);
    }
  } catch (err) {
    alert("Network error while creating checkout session.");
    console.error(err);
  }
});
