//variables for event handling
const loginForm = document.getElementById("LoginForm");
const box = document.querySelector(".box");
const forgotlink = document.getElementById("ForgotPassword");

//Event listener for logging in
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    //Variables for the input of email and password
    const emailInput = document.getElementById("EmailBox").value.trim();
    const passwordInput = document.getElementById("PasswordBox").value.trim();


    //Check if email and password have been entered
    if(! emailInput || ! passwordInput){
        alert("Make sure all fields are filled");
        return;
    }

    //Will call api below after online

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