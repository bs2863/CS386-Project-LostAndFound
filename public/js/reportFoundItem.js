class FoundReportForm extends ItemReportForm {
	buildItem(formData) {
		return {
			type: 'found',
			name: formData.get('name')?.trim(),
			categoryId: formData.get('categoryId'),
			color: formData.get('color')?.trim() || null,
			brand: formData.get('brand')?.trim() || null,
			description: formData.get('description')?.trim(),
			date: formData.get('date'),
			locationId: formData.get('locationId'),
			status: 'unclaimed',
			reportedBy: null,
		};
	}

	successMessage(id) {
		return `Found item report successfully submitted as Item ID: ${id}`;
	}
}

//wait for loading page
document.addEventListener('DOMContentLoaded', async () => {
	//found item form HTML page
	const form = document.getElementById('foundItemForm');
	//confirmation message
	const confirmation = document.getElementById('confirmation');
	//category select from dropdown
	const categorySelect = document.getElementById('categoryId');
	//location select from dropdown
	const locationSelect = document.getElementById('locationId');
	const zoneSelect = document.getElementById('zoneId');
	const buildingSelector = new ZoneBuildingSelector(zoneSelect, locationSelect);
	// submit button
	const submitButton = document.getElementById('submitButton');

	// load categories and locations from the database through the API
	try {
		const categoriesRes = await fetch('/api/v1/categories');

		if (!categoriesRes.ok) {
			throw new Error('Failed to load categories');
		}

		const data = {
			categories: await categoriesRes.json(),
		};
		// build categories dropdown
		data.categories.forEach((category) => {
			const option = document.createElement('option');
			option.value = category.id;
			option.textContent = category.name;
			categorySelect.appendChild(option);
		});
		// build location dropdown:load campus zones and buildings
		await buildingSelector.loadZones();
		await buildingSelector.loadBuildings();
		// submitButton changes status
		submitButton.disabled = false;
	} catch (error) {
		confirmation.textContent =
			'Failed to load categories and locations option.';
		console.error(error);
		return;
	}
	// Update buildings when user select zone
	zoneSelect.addEventListener('change', async () => {
		locationSelect.disabled = true;
		locationSelect.innerHTML = '<option value="">Loading buildings...</option>';

		try {
			await buildingSelector.loadBuildings();
			locationSelect.disabled = false;
		} catch (error) {
			confirmation.textContent = 'Failed to load buildings.';
			console.error(error);
		}
	});

	// get buildings when the form is reset
	form.addEventListener('reset', async () => {
		zoneSelect.value = '';
		locationSelect.disabled = true;
		locationSelect.innerHTML = '<option value="">Loading buildings...</option>';

		try {
			await buildingSelector.loadBuildings();
			locationSelect.disabled = false;
		} catch (error) {
			confirmation.textContent = 'Failed to load buildings.';
			console.error(error);
		}
	});

	const report = new FoundReportForm(form, confirmation, submitButton);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		await report.submit();
	});
});
