class LostReportForm extends ItemReportForm {
	buildItem(formData) {
		return {
			type: 'lost',
			name: formData.get('itemName')?.trim(),
			categoryId: formData.get('category'),
			color: formData.get('color')?.trim() || null,
			brand: formData.get('brand')?.trim() || null,
			date: formData.get('lostDate'),
			locationId: formData.get('location'),
			description: formData.get('description')?.trim(),
			phone: formData.get('phone')?.trim() || null,
			// the signed-in demo account, so the report shows up in their inbox
			email: localStorage.getItem('demoEmail'),
			status: 'open',
		};
	}

	async beforeSubmit(item) {
		const duplicates = await checkDuplicates(item);

		if (duplicates.length > 0) {
			this.showMessage('Possible duplicate item found. Please check.');
			return false;
		}

		return true;
	}

	successMessage(id) {
		return `Lost item submitted successfully. Item ID: ${id}`;
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	const lostItemForm = document.getElementById('lostItemForm');
	const duplicateItemMessage = document.getElementById('duplicateItemMessage');
	const submitButton = document.getElementById('submitButton');

	//get  category dropdown from the reportItem HTML page
	//this dropdown will be filled with categories retrieved from the database
	const categorySelect = lostItemForm.querySelector('select[name="category"]');
	// add location dropdown from the reportItem HTML page
	const locationSelect = lostItemForm.querySelector('select[name="location"]');
	const zoneSelect = document.getElementById('zoneId');

	// dropdown selector by zone
	const buildingSelector = new ZoneBuildingSelector(zoneSelect, locationSelect);
	//load categories from database through the API
	try {
		//request category information from the backend
		const categoriesRes = await fetch('/api/v1/categories');

		//check whether if successful
		if (!categoriesRes.ok) {
			throw new Error('Failed to load categories');
		}

		//convert the response into js data
		const categories = await categoriesRes.json();

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
		await buildingSelector.loadZones();
		await buildingSelector.loadBuildings();
	} catch (error) {
		//display an error if categories cannot be loaded
		duplicateItemMessage.textContent =
			'Failed to load categories and locations.';
		console.error('Error loading categories and locations:', error);
	}
	// Update buildings when the selected zone changes
	zoneSelect.addEventListener('change', async () => {
		locationSelect.disabled = true;
		locationSelect.innerHTML = '<option value="">Loading buildings...</option>';

		try {
			await buildingSelector.loadBuildings();
			locationSelect.disabled = false;
		} catch (error) {
			duplicateItemMessage.textContent = 'Failed to load buildings.';
			console.error(error);
		}
	});

	// an object made from Lost Report Form(class)
	const report = new LostReportForm(
		lostItemForm,
		duplicateItemMessage,
		submitButton,
	);

	// Use the template method when the form is submitted
	lostItemForm.addEventListener('submit', async (e) => {
		// prevent auto submit
		e.preventDefault();
		await report.submit();
	});
	// reload buildings when the form is reset
	lostItemForm.addEventListener('reset', async () => {
		zoneSelect.value = '';
		locationSelect.disabled = true;

		try {
			await buildingSelector.loadBuildings();
			locationSelect.disabled = false;
		} catch (error) {
			duplicateItemMessage.textContent = 'Failed to load buildings.';
			console.error(error);
		}
	});
});
