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

    //Will call api below after online
}); 


    
    