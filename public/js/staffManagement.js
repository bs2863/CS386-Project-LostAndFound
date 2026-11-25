// wait for loading page
document.addEventListener('DOMContentLoaded', async () => {
	// Gather elements from the staff management HTML
	const searchInput = document.getElementById('staffSearch');
	const typeFilter = document.getElementById('staffTypeFilter');
	const itemList = document.getElementById('staffItemList');
	const editSection = document.getElementById('editSection');
	const cancelButton = document.getElementById('cancelEdit');
	const editForm = document.getElementById('editForm');
	const editType = document.getElementById('editType');
	const editStatus = document.getElementById('editStatus');

	// Statuses for each item type
	const statusByType = {
		lost: ['open', 'ready', 'resolved', 'cancelled'],
		found: ['unclaimed', 'held', 'resolved', 'cancelled'],
	};

	// Populate the status dropdown based on type (lost or found) of the item
	function statusOptions(type, currentStatus = '') {
		const statuses = [...statusByType[type]];

		// Display current status before touching the drop down menu
		if (currentStatus && !statuses.includes(currentStatus)) {
			statuses.unshift(currentStatus);
		}

		editStatus.replaceChildren();

		statuses.forEach((status) => {
			const option = document.createElement('option');

			option.value = status;
			option.textContent = status.charAt(0).toUpperCase() + status.slice(1);

			editStatus.appendChild(option);
		});
	}

	// Temporary id when editing an item
	let editingItemId = null;

	cancelButton.addEventListener('click', () => {
		editSection.hidden = true;
		editForm.reset();
		editingItemId = null;
	});

	editForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (editingItemId === null) return;

		const updatedItem = {
			name: document.getElementById('editName').value,
			color: document.getElementById('editColor').value,
			brand: document.getElementById('editBrand').value,
			description: document.getElementById('editDescription').value,
			type: document.getElementById('editType').value,
			status: document.getElementById('editStatus').value,
		};

		try {
			const res = await fetch(`/api/v1/items/${editingItemId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updatedItem),
			});

			if (!res.ok) {
				const error = await res.json();

				throw new Error(error.error || 'Failed to update item');
			}

			await Popup.show('Item Updated', 'Item successfully updated!', 'success');

			editSection.hidden = true;
			editForm.reset();
			editingItemId = null;

			await fetchItems();
		} catch (error) {
			console.error('Failed to update item: ', error);
			await Popup.show('Error', error.message, 'error');
		}
	});

	function displayItems(items) {
		// Clear existing table
		itemList.innerHTML = '';

		items.forEach((item) => {
			// create table rows
			const row = document.createElement('tr');

			// create table column names
			const nameColumn = document.createElement('td');
			nameColumn.textContent = item.name;

			// category column
			const categoryColumn = document.createElement('td');
			categoryColumn.textContent = item.categoryName;

			// location column
			const locationColumn = document.createElement('td');
			locationColumn.textContent = item.locationName;

			// I've chosen to display the raw values that are stored in the database
			// So to keep everything looking professional and clean, I'm basically splicing
			// the data together as a string so the first letter is capitalized

			// type column
			const typeColumn = document.createElement('td');
			typeColumn.textContent =
				item.type.charAt(0).toUpperCase() + item.type.slice(1);

			// status column
			const statusColumn = document.createElement('td');
			statusColumn.textContent =
				item.status.charAt(0).toUpperCase() + item.status.slice(1);

			// a held item shows who claimed it, so staff know whose ID to check
			if (item.status === 'held' && item.heldForEmail) {
				const heldFor = document.createElement('small');
				heldFor.textContent = `for ${item.heldForEmail}`;
				statusColumn.append(document.createElement('br'), heldFor);
			}

			// actions column
			const actionsColumn = document.createElement('td');

			// view button
			const viewButton = document.createElement('button');
			viewButton.innerHTML = '<i class="bi bi-eye"></i>';
			viewButton.title = 'View';
			viewButton.setAttribute('aria-label', 'View');
			viewButton.className = 'view-btn';
			viewButton.addEventListener('click', () => {
				Popup.show(
					'Item Information',
					`Name: ${item.name}
			Type: ${item.type}
			Category: ${item.categoryName}
			Color: ${item.color || 'Not provided'}
			Brand: ${item.brand || 'Not provided'}
			Location: ${item.locationName}
			Description: ${item.description}
			Date: ${item.date}
			Status: ${item.status}
			Item ID: ${item.id}`,
					'info',
				);
			});

			// edit button
			const editButton = document.createElement('button');
			editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
			editButton.title = 'Edit';
			editButton.setAttribute('aria-label', 'Edit');
			editButton.className = 'edit-btn';
			editButton.addEventListener('click', () => {
				// id number of the item we are editing
				editingItemId = item.id;

				editSection.hidden = false;

				document.getElementById('editName').value = item.name;
				document.getElementById('editColor').value = item.color || '';
				document.getElementById('editBrand').value = item.brand || '';
				document.getElementById('editDescription').value =
					item.description || '';
				editType.value = item.type;
				statusOptions(item.type, item.status);
			});

			// remove button
			const removeButton = document.createElement('button');
			removeButton.innerHTML = '<i class="bi bi-trash"></i>';
			removeButton.title = 'Remove';
			removeButton.setAttribute('aria-label', 'Remove');
			removeButton.className = 'remove-btn';

			removeButton.addEventListener('click', async () => {
				const confirmMessage = await Popup.show(
					'Remove Item?',
					`Are you sure you want to remove "${item.name}"?`,
					'error',
					true,
				);

				// If the user presses cancel, simply exit
				if (!confirmMessage) return;

				try {
					// send the delete request to the backend
					const res = await fetch(`/api/v1/items/${item.id}`, {
						method: 'DELETE',
					});

					if (!res.ok) {
						const error = await res.json();
						throw new Error(error.error || 'Failed to delete item');
					}

					await Popup.show(
						'Item Removed',
						'Item removed successfully!',
						'success',
					);

					// Refresh the table
					await fetchItems();
				} catch (error) {
					console.error('Failed to remove item: ', error);
					await Popup.show('Error', error.message, 'error');
				}
			});

			// add the buttons to actions column
			actionsColumn.append(viewButton, editButton, removeButton);

			// a held item can be marked as picked up once staff check the owner's ID
			if (item.status === 'held') {
				const pickupButton = document.createElement('button');
				pickupButton.textContent = 'Mark Picked Up';
				pickupButton.className = 'pickup-btn';

				pickupButton.addEventListener('click', async () => {
					const owner = item.heldForEmail || 'the owner';
					const confirmPickup = await Popup.show(
						'Confirm Pickup',
						`Check the ID of ${owner}, then confirm that "${item.name}" was picked up.`,
						'info',
						true,
					);

					// If the user presses cancel, simply exit
					if (!confirmPickup) return;

					try {
						const res = await fetch(`/api/v1/items/${item.id}/pickup`, {
							method: 'POST',
						});

						if (!res.ok) {
							const error = await res.json();
							throw new Error(
								error.error || 'Failed to mark item as picked up',
							);
						}

						await Popup.show(
							'Pickup Completed',
							'Item marked as picked up!',
							'success',
						);

						// Refresh the table
						await fetchItems();
					} catch (error) {
						console.error('Failed to mark item as picked up: ', error);
						await Popup.show('Error', error.message, 'error');
					}
				});

				actionsColumn.appendChild(pickupButton);
			}

			row.append(
				nameColumn,
				categoryColumn,
				locationColumn,
				typeColumn,
				statusColumn,
				actionsColumn,
			);

			itemList.appendChild(row);
		});
	}

	async function fetchItems() {
		try {
			// build api request
			const query = new URLSearchParams();

			// check if filter was selected
			if (typeFilter.value) {
				query.set('type', typeFilter.value);
			}

			// check for user search
			if (searchInput.value.trim()) {
				query.set('q', searchInput.value.trim());
			}

			// fetch items from backend to populate
			const res = await fetch(`/api/v1/items?${query}`);

			if (!res.ok) {
				throw new Error('Failed to retrieve items');
			}

			const items = await res.json();

			displayItems(items);
		} catch (error) {
			console.error('Failed to load staff items: ', error);
		}
	}

	// Refresh items when the search input changes
	searchInput.addEventListener('input', fetchItems);

	// Refresh items when the type filter changes (All items, lost, or found)
	typeFilter.addEventListener('change', fetchItems);

	// Load all items
	fetchItems();
});
