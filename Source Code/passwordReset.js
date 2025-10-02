const resetForm = document.querySelector("#newAccountForm form");

resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("recover").value.trim();
    const securityQuestion = document.getElementById("question1")?.value.trim();
    const securityAnswer = document.getElementById("answer1")?.value.trim();

    if (!email || !securityQuestion || !securityAnswer) {
        alert("Please fill in all fields.");
        return;
    }

    try {
      const response = await fetch("https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_forgot_pass",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          type: 1,
            email: email,
            securityQuestion: securityQuestion,
            securityAnswer: securityAnswer
      })
      });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Password reset failed");
            return;
        }