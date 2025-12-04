const tuitionSlider = document.getElementById("tuitionSlider");
const tuitionLabel = document.getElementById("tuitionAmountLabel");
const enrollForm = document.getElementById("enrollForm");
const enrollButton = document.getElementById("enrollButton");
const errorMessage = document.getElementById("errorMessage");

document.getElementById("year").textContent = new Date().getFullYear();

// Initial label (default 1500)
tuitionLabel.textContent = "$1,500";

// Update label as slider moves
tuitionSlider.addEventListener("input", () => {
  tuitionLabel.textContent = `$${Number(tuitionSlider.value).toLocaleString()}`;
});

// Submit handler
enrollForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.hidden = true;
  errorMessage.textContent = "";

  const studentName = document.getElementById("studentName").value.trim();
  const email = document.getElementById("email").value.trim();
  const amount = Number(tuitionSlider.value);
  const planType = document.querySelector("input[name='planType']:checked").value;

  if (!studentName || !email) {
    errorMessage.textContent = "Please fill out all required fields.";
    errorMessage.hidden = false;
    return;
  }

  enrollButton.disabled = true;
  enrollButton.textContent = "Redirecting to Stripe…";

  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName, email, amount, planType }),
    });

    if (!res.ok) {
      throw new Error("Server error");
    }

    const data = await res.json();
    if (!data.url) throw new Error("No Stripe URL returned");

    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    errorMessage.textContent =
      "Something went wrong creating the checkout session. Please try again.";
    errorMessage.hidden = false;
    enrollButton.disabled = false;
    enrollButton.textContent = "Proceed to Secure Checkout";
  }
});
