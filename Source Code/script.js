const box = document.querySelector(".box");
const forgotlink = document.getElementById("ForgotPassword");

forgotlink.addEventListener("click", (event) => {
event.preventDefault();
box.classList.add("small");
box.innerHTML = `
<label id="resetTitle">Reset Password</label>
<form id="resetForm">
<label class="resetEmail">Email</label>
<input type="text" id="resetField" placeholder="Enter your email">
<input type="submit" value="Send Reset Link" id="resetButton">
</form>
`;

const resetForm = document.getElementById("resetForm");
resetForm.addEventListener("submit", (e) => {
e.preventDefault();
alert("Reset link submitted!");

window.location.href = "index.html";
  });
});