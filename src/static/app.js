document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // reset activity select
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants list markup (each item has a remove button)
        let participantsHtml = "<em>No participants yet.</em>";
        if (details.participants && details.participants.length > 0) {
          participantsHtml = `<ul class="participants-list">`;
          details.participants.forEach((p) => {
            // use data attributes so handlers can identify activity and email
            participantsHtml += `<li class="participant-item"><span class="participant-email">${p}</span> <button class="remove-participant" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" aria-label="Remove ${p}">✕</button></li>`;
          });
          participantsHtml += `</ul>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // attach remove handlers for buttons inside this card
        const removeBtns = activityCard.querySelectorAll(".remove-participant");
        removeBtns.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const encodedActivity = btn.dataset.activity;
            const encodedEmail = btn.dataset.email;
            // decode for display and use
            const activityName = decodeURIComponent(encodedActivity);
            const email = decodeURIComponent(encodedEmail);

            if (!confirm(`Remove ${email} from ${activityName}?`)) return;

            try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
              const body = await res.json();
              if (res.ok) {
                messageDiv.textContent = body.message;
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
                // refresh the activities to reflect change
                fetchActivities();
              } else {
                messageDiv.textContent = body.detail || "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
              setTimeout(() => messageDiv.classList.add("hidden"), 4000);
            } catch (err) {
              console.error("Error removing participant:", err);
              messageDiv.textContent = "Failed to remove participant. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh activities so the newly-registered participant appears
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
