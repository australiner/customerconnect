const tabSignin = document.getElementById("tab-signin");
const tabSignup = document.getElementById("tab-signup");
const formTitle = document.getElementById("form-title");
const submitButton = document.getElementById("submit-button");
const errorText = document.getElementById("error-text");
const form = document.getElementById("auth-form");
const passwordInput = document.getElementById("password");

let mode = "signin";

function setMode(next) {
  mode = next;
  errorText.textContent = "";

  if (mode === "signin") {
    tabSignin.classList.add("active");
    tabSignup.classList.remove("active");
    formTitle.textContent = "Sign in";
    submitButton.textContent = "Sign in";
    passwordInput.autocomplete = "current-password";
  } else {
    tabSignup.classList.add("active");
    tabSignin.classList.remove("active");
    formTitle.textContent = "Create your account";
    submitButton.textContent = "Create account";
    passwordInput.autocomplete = "new-password";
  }
}

tabSignin.addEventListener("click", () => setMode("signin"));
tabSignup.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorText.textContent = "";
  submitButton.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errorText.textContent = data.error || "Something went wrong. Please try again.";
      submitButton.disabled = false;
      return;
    }

    window.location.href = "/dashboard.html";
  } catch {
    errorText.textContent = "Network error. Please try again.";
    submitButton.disabled = false;
  }
});
