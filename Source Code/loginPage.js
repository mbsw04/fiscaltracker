//variables for event handling
const loginForm = document.getElementById("LoginForm");
const box = document.querySelector(".box");
//const forgotlink = document.getElementById("ForgotPassword");

//Event listener for logging in
loginForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    //Variables for the input of email and password
    const emailInput = document.getElementById("EmailBox").value.trim();
    const passwordInput = document.getElementById("PasswordBox").value.trim();


    //Check if email and password have been entered
    if(! emailInput || ! passwordInput){
        alert("Make sure all fields are filled");
        return;
    }

    //Will call api
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
        if (data.failed_attempts !== undefined) {
        const attemptsLeft = 3 - data.failed_attempts;
        if (attemptsLeft > 0) {
            alert(`Incorrect credentials. ${attemptsLeft} attempt(s) left before account suspension.`);
        } else {
            alert("Your account has been suspended due to too many failed login attempts.");
        }
    } else {
        alert(data.error || "Login failed");
    }
    return;
      }

      //Saving user data to local storage
      localStorage.setItem("user", JSON.stringify(data.body));

      if(passwordInput.startsWith("temp")){
        showFirstTimeResetForm(emailInput);
        return;
      }

      window.location.href = "adminpng.html";
    }
    catch(err){
      console.error("Error during login:", err);
      alert("An error occurred during login. Please try again.");
      return;
    }
});

function validatePassword(password) {
  const regex = /^(?=[A-Za-z])(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return regex.test(password);
}

function showFirstTimeResetForm(emailInput) {
  // show first-time reset form instead of going to admin page
  box.innerHTML = `
    <h1>Set Your New Password</h1>
    <form id="firstTimeResetForm">
      <label for="newPassword">New Password</label>
      <input type="password" id="newPassword" required placeholder="Enter new password">

      

      <label for="securityAnswer">What city/town did your parents meet?</label>
      <input type="text" id="securityAnswer" required placeholder="Enter your answer">

      <div id="errorDiv" style="color:red; margin-bottom:10px;"></div>

      <input type="submit" value="Save" id="resetButton">
    </form>
  `;

  const firstTimeResetForm = document.getElementById("firstTimeResetForm");
  const errorDiv = document.getElementById("errorDiv");

  firstTimeResetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value.trim();
    const securityAnswer = document.getElementById("securityAnswer").value.trim();

    if (!newPassword || !securityAnswer) {
      alert("Make sure all fields are filled");
      return;
    }

    if (!validatePassword(newPassword)) {
      errorDiv.textContent = "Password must be at least 8 characters long, start with a letter, and include at least one number and one special character.";
      return;
    }


    try{
    
      const response = await fetch("https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_forgot_pass",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          type: 2,
          email: emailInput,
          new_password: newPassword,
          security_question: "What city/town did your parents meet?",
          security_answer: securityAnswer
      })
      }
    );
      const data = await response.json();
      
      if(!response.ok){
        alert(data.error || "Password reset failed");
        return;
      }
      alert("Password successfully reset. Please log in with your new password.");
      window.location.href = "index.html";
    }
    catch(err){
      console.error("Error updating first-time password:", err);
      alert("An error occurred. Please try again.");
      return;
    }
  });
}
