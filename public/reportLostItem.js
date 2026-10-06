//wait for loading page
document.addEventListener('DOMContentLoaded', () => {

    //found item form HTML page
    const foundItemForm = document.getElementById("foundItemForm");

    //confirmation message
    const confirmation = document.getElementById("confirmation");

    //wait for user to submit form
    foundItemForm.addEventListener("submit", (event) => {
        
	    //stop page from refreshing when form is submitted
	    event.preventDefault();

	    //show confirmation message
	    confirmation.textContent = "Found item report submitted!";

	    //clear info for a new submission
	    foundItemForm.reset();
    });
});

