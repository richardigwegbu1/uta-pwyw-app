// --- Handle PWYW slider update ---
const amountInput = document.getElementById("amount");
const amountLabel = document.getElementById("amountLabel");

function formatAmount(v) {
  return "$" + Number(v).toLocaleString();
}

if (amountInput && amountLabel) {
  amountLabel.textContent = formatAmount(amountInput.value);

  amountInput.addEventListener("input", () => {
    amountLabel.textContent = formatAmount(amountInput.value);
  });
}

// --- Handle PWYW section visibility ---
const pwywSection = document.getElementById("pwyw-section");
const tuitionOptions = document.getElementsByName("tuitionOption");

tuitionOptions.forEach(opt => {
  opt.addEventListener("change", () => {
    if (opt.value === "pwyw" && opt.checked) {
      pwywSection.style.display = "block";
    } else {
      pwywSection.style.display = "none";
    }
  });
});

// Default state = Full Tuition → hide PWYW section
pwywSection.style.display = "none";

// --- Handle Form Submission ---
const form = document.getElementById("payment-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const tuitionOption = document.querySelector('input[name="tuitionOption"]:checked').value;

  // Determine amount
  const amount =
    tuitionOption === "full"
      ? 3500
      : Number(document.getElementById("amount").value);

  // Determine payment plan
  const paymentPlanRadio = document.querySelector('input[name="paymentPlan"]:checked');
  const paymentPlan = paymentPlanRadio ? paymentPlanRadio.value : "full";

  // Payload for both Stripe + Google Sheets
  const payload = {
    fullName,
    email,
    phone,
    amount,
    tuitionOption,
    paymentPlan
  };

  console.log("Submitting form:", payload);

  try {
    // --- STEP 1: Save Submission to Google Sheets ---
    const sheetRes = await fetch("/.netlify/functions/save-to-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const sheetData = await sheetRes.json();
    console.log("Sheet Response:", sheetData);

    if (!sheetData.success) {
      alert("Error saving to Google Sheets. Please try again.");
      console.error(sheetData);
      return;
    }

    // --- STEP 2: Create Stripe Checkout Session ---
    const stripeRes = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const stripeData = await stripeRes.json();
    console.log("Stripe Response:", stripeData);

    if (stripeData.url) {
      window.location.href = stripeData.url; // redirect to Stripe checkout
    } else {
      alert("There was a problem creating the checkout session.");
      console.error(stripeData);
    }

  } catch (err) {
    alert("Network error. Please check your internet connection.");
    console.error("FETCH ERROR:", err);
  }
});
