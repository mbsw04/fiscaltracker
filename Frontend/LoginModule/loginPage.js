document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const loginBox = document.getElementById("LoginBox");
    const loginForm = document.getElementById("LoginForm");
    const usernameField = document.getElementById("UsernameBox");
    const passwordField = document.getElementById("PasswordBox");

    const newUserFormDiv = document.getElementById("newAccountForm");
    const newUserForm = document.getElementById("newUserForm");
    const forgotFormDiv = document.getElementById("forgotPasswordForm");
    const forgotFormInner = document.getElementById("forgotPasswordFormInner");

    const forgotLink = document.getElementById("ForgotPasswordLink");
    const registrationLink = document.getElementById("RegistrationLink");
    const backFromNewUser = document.getElementById("backFromNewUser");
    const backFromForgot = document.getElementById("backFromForgot");

    //Toggle Forms
    forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginBox.style.display = "none";
        forgotFormDiv.style.display = "block";
    });

    registrationLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginBox.style.display = "none";
        newUserFormDiv.style.display = "block";
    });

    backFromNewUser.addEventListener("click", (e) => {
        e.preventDefault();
        newUserFormDiv.style.display = "none";
        loginBox.style.display = "block";
    });

    backFromForgot.addEventListener("click", (e) => {
        e.preventDefault();
        forgotFormDiv.style.display = "none";
        loginBox.style.display = "block";
    });

    // Validate Password
    function validatePassword(password) {
        const regex = /^(?=[A-Za-z])(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        return regex.test(password);
    }

    // Login Form
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = usernameField.value.trim();
        const password = passwordField.value.trim();

        if (!username || !password) {
            alert("Make sure all fields are filled");
            return;
        }

        try {
            const response = await fetch(
                "https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_auth",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                }
            );

            const data = await response.json();

            let userObj = null;
            if (typeof data.body === "string") {
                try {
                    userObj = JSON.parse(data.body);
                } catch (e) {
                    alert("Invalid server response");
                    return;
                }
            } else {
                userObj = data.body;
            }

            if (!response.ok || !userObj || !userObj.id) {
                let errorMsg = "Login failed";
                if (typeof data.body === "string") {
                    try {
                        const errObj = JSON.parse(data.body);
                        if (errObj && errObj.error) errorMsg = errObj.error;
                    } catch (e) {}
                }
                alert(errorMsg);
                return;
            }

            localStorage.removeItem("user");
            localStorage.setItem("user", JSON.stringify(userObj));

            if (password.startsWith("temp")) {
                showFirstTimeResetForm(username);
                return;
            }

            window.location.href = "../adminModule/admin.html";
        } catch (err) {
            console.error("Error during login:", err);
            alert("An error occurred during login. Please try again.");
        }
    });

    // New User Forms
    newUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const first_name = document.getElementById("fname").value.trim();
        const last_name = document.getElementById("lname").value.trim();
        const email = document.getElementById("email").value.trim();
        const dob = document.getElementById("dob").value.trim();

        if (!first_name || !last_name || !email || !dob) {
            alert("All fields required");
            return;
        }

        try {
            const response = await fetch(
                "https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_new_user",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ first_name, last_name, email, dob }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                let errorMsg = "Failed to submit new user request";
                if (typeof data.body === "string") {
                    try {
                        const errObj = JSON.parse(data.body);
                        if (errObj && errObj.error) errorMsg = errObj.error;
                    } catch (e) {}
                }
                alert(errorMsg);
                return;
            }

            alert("Request submitted successfully. Please check your email.");
            newUserForm.reset();
            newUserFormDiv.style.display = "none";
            loginBox.style.display = "block";
        } catch (err) {
            console.error(err);
            alert("An error occurred. Please try again.");
        }
    });

    // Forgot Password
    forgotFormInner.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("forgotEmail").value.trim();
        const securityAnswer = document.getElementById("forgotAnswer").value.trim();
        const newPassword = document.getElementById("forgotNewPass").value.trim();

        if (!email || !securityAnswer || !newPassword) {
            alert("All fields required");
            return;
        }

        if (!validatePassword(newPassword)) {
            alert("Password must be at least 8 characters, start with a letter, include a number and special character.");
            return;
        }

        try {
            const response = await fetch(
                "https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_forgot_pass",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: 1,
                        email,
                        new_password: newPassword,
                        security_question: "What city/town did your parents meet?",
                        security_answer: securityAnswer,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                let errorMsg = "Password reset failed";
                if (typeof data.body === "string") {
                    try {
                        const errObj = JSON.parse(data.body);
                        if (errObj && errObj.error) errorMsg = errObj.error;
                    } catch (e) {}
                }
                alert(errorMsg);
                return;
            }

            alert("Password successfully reset. Please log in.");
            forgotFormDiv.style.display = "none";
            loginBox.style.display = "block";
        } catch (err) {
            console.error(err);
            alert("An error occurred. Please try again.");
        }
    });

    //Temp Password
    function showFirstTimeResetForm(username) {
    loginBox.innerHTML = `
            <h1>Set Your New Password</h1>
            <form id="firstTimeResetForm">
                <label for="newPassword">New Password</label>
                <input type="password" id="newPassword" required placeholder="Enter new password">
                <label for="securityAnswer">What city/town did your parents meet?</label>
                <input type="text" id="securityAnswer" required placeholder="Enter your answer">
                <div id="errorDiv" style="color:red; margin-bottom:10px;"></div>
                <input type="submit" value="Save">
            </form>
        `;

        const firstTimeResetForm = document.getElementById("firstTimeResetForm");
        const errorDiv = document.getElementById("errorDiv");

        firstTimeResetForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const newPassword = document.getElementById("newPassword").value.trim();
            const securityAnswer = document.getElementById("securityAnswer").value.trim();

            if (!newPassword || !securityAnswer) {
                alert("All fields required");
                return;
            }

            if (!validatePassword(newPassword)) {
                errorDiv.textContent = "Password must be at least 8 characters, start with a letter, include a number and special character.";
                return;
            }

            let authedUser = null;
            try {
                authedUser = JSON.parse(localStorage.getItem("user"));
            } catch (e) {}
            const authedEmail = authedUser && authedUser.email ? authedUser.email : null;

            try {
                const response = await fetch(
                    "https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_forgot_pass",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: 2,
                            email: authedEmail,
                            new_password: newPassword,
                            security_question: "What city/town did your parents meet?",
                            security_answer: securityAnswer,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    let errorMsg = "Password reset failed";
                    if (typeof data.body === "string") {
                        try {
                            const errObj = JSON.parse(data.body);
                            if (errObj && errObj.error) errorMsg = errObj.error;
                        } catch (e) {}
                    }
                    alert(errorMsg);
                    return;
                }

                alert("Password successfully reset. Please log in.");
                window.location.href = "index.html";
            } catch (err) {
                console.error(err);
                alert("An error occurred. Please try again.");
            }
        });
    }
});