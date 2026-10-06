eventListener ('DOMContentLoaded', () =>
{
    const lostItemForm = document.getElementById('lostItemForm');
    const duplicateItemMessage = document.getElementById('duplicateItemMessage');

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