const loginForm = document.getElementById("LoginForm");
const box = document.querySelector(".box");
const forgotlink = document.getElementById("ForgotPassword");

loginForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    const emailInput = document.getElementById("EmailBox").value.trim();
    const passwordInput = document.getElementById("PasswordBox").value.trim();


    if(! emailInput || ! passwordInput){
        alert("Make sure all fields are filled");
        return;
    }

    try{
      const response = await fetch("https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_auth",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          username: emailInput,
          password: passwordInput
      })
      });

      const data = await response.json();

      if(!response.ok){
        alert(data.error || "Login failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.body));

      window.location.href = "adminpng.html";
    }
    catch(err){
      console.error("Error during login:", err);
      alert("An error occurred during login. Please try again.");
      return;
    }
});

forgotlink.addEventListener("click", (event) => {
event.preventDefault();
box.classList.add("small");
box.innerHTML = `
<label id="resetTitle">Reset Password</label>
<form id="resetForm">
<label class="resetEmail">Email</label>
<input type="text" id="resetField" placeholder="Enter your email">
<input type="submit" value="Submit" id="resetButton">
<label class="question1">What city/town did your parent's meet?</label>
<input type="text" id="question1">
</form>
`;

const resetForm = document.getElementById("resetForm");
resetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Reset link submitted!");

    window.location.href = "index.html";
  });
});