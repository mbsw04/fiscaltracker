const box = document.querySelector(".box");
const container = document.querySelector(".container");
const forgotlink = document.getElementById("ForgotPassword");

forgotlink.addEventListener("click", (event) => {
event.preventDefault();
box.classList.add("small");
container.classList.add("top");
box.innerHTML = `
<label id="resetTitle">Reset Password</label>
<form id="resetForm">
<label class="resetEmail">Email</label>
<input type="text" id="resetField" placeholder="Enter your email">
<label class="question1">What city were you born in?</label>
<input type="text" id="question1">
<label class="question2">What was the brand of your first car?</label>
<input type="text" id="question2">
<label class="question3">In what city or town did your parents meet?</label>
<input type="text" id="question3">
<input type="submit" value="Submit" id="resetButton">
</form>
`;

const resetForm = document.getElementById("resetForm");
resetForm.addEventListener("submit", (e) => {
e.preventDefault();

window.location.href = "index.html";
  });
});