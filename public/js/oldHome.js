// On page load
document.addEventListener('DOMContentLoaded', () => {
	const searchForm = document.getElementById('searchForm');
	const searchInput = document.getElementById('itemInput');
	const itemList = document.getElementById('itemList');
	const resultCount = document.getElementById('resultCount');
	const locationSelect = document.getElementById('locationSelect');

	// Fetch found items from backend (filtered by search)
	async function fetchItems() {
		const query = new URLSearchParams({ type: 'found' });
		const search = searchInput.value.trim();
		if (search) {
			query.set('q', search);
		}

		// Get location of the currently selected location in the dropdown menu
		const locationId = locationSelect.value;
		// An empty value will display all locations
		if (locationId) {
			query.set('locationId', locationId);
		}

		try {
			const response = await fetch(`/api/v1/items?${query}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const items = await response.json();

			// Empty item list, then fill it from the fetched items
			itemList.innerHTML = '';
			items.forEach((item) => addItemToDOM(item));
			resultCount.textContent = `${items.length} found item(s)`;
		} catch (error) {
			console.error('Failed to load items:', error);
			resultCount.textContent = 'Could not load items. Please try again.';
		}
	}

	// Add an item to the HTML list
	function addItemToDOM(item) {
		const li = document.createElement('li');
		li.textContent = `${item.name} - ${item.categoryName}, found at ${item.locationName} on ${item.date} (${item.status})`;
		itemList.appendChild(li);
	}

	// Fetch the campus locations from the backend
	async function fetchLocations() {
		try {
			const response = await fetch(`/api/v1/locations`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const locations = await response.json();

			// loop through and create a new option for each location in the dropdown menu
			locations.forEach((location) => {
				const option = document.createElement('option');
				option.value = location.id;
				option.textContent = location.name;
				locationSelect.appendChild(option);

			});
		} catch (error) {
			console.error('Failed to load locations: ', error);
			resultCount.textContent = 'Could not load locations. Please try again.';
		}
	}

	// Search when the form is submitted (button or Enter)
	searchForm.addEventListener('submit', (e) => {
		e.preventDefault();
		fetchItems();
	});

	// Immediately filter when the user picks a location to sort by.
	locationSelect.addEventListener('change', fetchItems);

	fetchItems();
	fetchLocations();
});
