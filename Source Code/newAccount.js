const newForm = document.querySelector("#newAccountForm");

newForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    const fName = document.getElementById("fname").value.trim();
    const lName = document.getElementById("lname").value.trim();
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const zip = document.getElementById("zip").value.trim();
    const dob = document.getElementById("dob").value.trim();

    const requiredFields = [fName, lName, email, address, city, state, zip, dob];

    if (requiredFields.some(field => !field)) {
        alert("Make sure all fields are filled");
        return;
    }

    try{
        const response = await fetch("https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_new_user",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                first_name: fName,
                last_name: lName,
                email: email,
                dob: dob
            })

        });

        const data = await response.json();

        if(!response.ok){
            alert(data.error || "Account creation failed");
            return;
        }
        alert("Request created successfully! Please check your email for further instructions.");
        newForm.reset();
    }
    catch(err){
        console.error("Error during account creation:", err);
        alert("An error occurred during account creation. Please try again.");
        return;
    }
    
});