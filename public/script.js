// On page load
document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('itemForm');
    const itemInput = document.getElementById('itemInput');
    const itemList = document.getElementById('itemList');
    
    // Fetch data from backend

    async function fetchItems() {
        // Send network request, fetch items and store
        const response = await fetch('/api/items');
        const items = await response.json();

        // Empty item list
        itemList.innerHTML = '';
        // Fill item list from items fetch
        items.forEach(item => addItemToDOM(item));
    }

    // Add an item to the HTML list
    function addItemToDOM(item) {
        const li = document.createElement('li');
        li.textContent = item.name;
        itemList.appendChild(li);
    }

    // Send data to backend

    // Listen for submit
    itemForm.addEventListener('submit', async (e) => {
        // Prevent page reload on submission
        e.preventDefault();
        const name = itemInput.value.trim();

        // Send network request, send item from input form as JSON
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        // If request processed
        if (response.ok) {
            // Add new item to DOM
            const newItem = await response.json();
            addItemToDOM(newItem);
            itemInput.value = '';
        }
    });
    fetchItems();
});