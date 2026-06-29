async function loadDashboard() {
  const screen = document.getElementById("screen");

  try {
    const res = await fetch("/api/customer", { credentials: "include" });

    if (res.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      renderEmpty(screen, data.error || "We couldn't load your record right now.");
      return;
    }

    renderRecord(screen, data);
  } catch {
    renderEmpty(screen, "Network error. Please refresh the page.");
  }
}

function renderRecord(screen, customer) {
  screen.innerHTML = `
    <div class="brand">Family Portal</div>
    <div class="record-card">
      <div class="record-tab">
        <span>Student record</span>
        <span class="verified">Verified</span>
      </div>
      <div class="record-body">
        <h1>${escapeHtml(customer.Name)}</h1>
        <div class="record-field">
          <span class="record-label">Name</span>
          <span class="record-value">${escapeHtml(customer.Name)}</span>
        </div>
        <div class="record-field">
          <span class="record-label">Student</span>
          <span class="record-value">${escapeHtml(customer.Student)}</span>
        </div>
        <div class="record-field">
          <span class="record-label">AM pickup</span>
          <span class="record-value">
            ${escapeHtml(customer.PickupAM)}${mapLink(customer.MapUrlAM)}
          </span>
        </div>
        <div class="record-field">
          <span class="record-label">PM pickup</span>
          <span class="record-value">
            ${escapeHtml(customer.PickupPM)}${mapLink(customer.MapUrlPM)}
          </span>
        </div>
        <div class="record-footer">
          <button class="sign-out" id="sign-out">Sign out</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("sign-out").addEventListener("click", signOut);
}

function renderEmpty(screen, message) {
  screen.innerHTML = `
    <div class="brand">Family Portal</div>
    <div class="record-card">
      <div class="record-tab"><span>Student record</span></div>
      <div class="record-body">
        <h1>Your record</h1>
        <p class="empty-state">${escapeHtml(message)}</p>
        <div class="record-footer">
          <button class="sign-out" id="sign-out">Sign out</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("sign-out").addEventListener("click", signOut);
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.replace("/login.html");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function mapLink(url) {
  if (!url) return "";
  return ` · <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">View map</a>`;
}

loadDashboard();
