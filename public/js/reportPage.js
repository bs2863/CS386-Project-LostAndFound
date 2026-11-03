document.addEventListener('DOMContentLoaded', async () => {
    const lostItemForm = document.getElementById('lostItemForm');
    const duplicateItemMessage = document.getElementById('duplicateItemMessage');
    const submitButton = document.getElementById('submitButton');

    //get  category dropdown from the reportItem HTML page
    //this dropdown will be filled with categories retrieved from the database
    const categorySelect = lostItemForm.querySelector('select[name="category"]');
    // add location dropdown from the reportItem HTML page
    const locationSelect = lostItemForm.querySelector('select[name="location"]');

    //load categories from database through the API
    try {
        //request category information from the backend
        const categoriesRes = await fetch('/api/v1/categories');
        //request location information from the backend
        const locationsRes = await fetch('/api/v1/locations');
        //check whether if successful
        if (!categoriesRes.ok) {
            throw new Error('Failed to load categories');
        }
        if (!locationsRes.ok) {
            throw new Error('Failed to load locations');
        }   

        //convert the response into js data
        const categories = await categoriesRes.json();
        //convert the response into js dataa
        const locations = await locationsRes.json();

        //add each category from database into dropdown
        categories.forEach((category) => {
            //create a new dropdown option
            const option = document.createElement('option');

            //use the category database ID as option value
            option.value = category.id;

            //display category name to user
            option.textContent = category.name;

            //add the new option to the category dropdown
            categorySelect.appendChild(option);
        });

        //add each location from database into dropdown
        locations.forEach((location) => {
            //create a new dropdown option
            const option = document.createElement('option');

            //use the location database ID as option value
            option.value = location.id;

            //display location name to user
            option.textContent = location.name;

            //add the new option to the location dropdown
            locationSelect.appendChild(option);
        });

    } catch (error) {
        //display an error if categories cannot be loaded
        duplicateItemMessage.textContent = 'Failed to load categories and locations.';
        console.error('Error loading categories and locations:', error);
    }



    lostItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lostItem = {
        shortDescription: lostItemForm.shortDescription.value.trim(),
        category: lostItemForm.category.value.trim(),
        lostDate: lostItemForm.lostDate.value.trim(),
        lostTime: lostItemForm.lostTime.value.trim(),
        location: lostItemForm.location.value.trim(),
        description: lostItemForm.description.value.trim(),
        phone: lostItemForm.phone.value.trim(),
        email: lostItemForm.email.value.trim()
        };
    });

    duplicateItemMessage.textContent = 'Checking for possible duplication records...';

    //check database for duplicates

    //if lost item is a duplicate, display a message

    //if it is not a duplicate, submit the form

    // send error message if submission fails
});