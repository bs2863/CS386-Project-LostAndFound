class ZoneBuildingSelector {
	constructor(zoneSelect, buildingSelect) {
		this.zoneSelect = zoneSelect;
		this.buildingSelect = buildingSelect;
	}

	async loadZones() {
		const response = await fetch('/api/v1/zones');

		if (!response.ok) {
			throw new Error('Failed to load zones');
		}

		const zones = await response.json();

		zones.forEach((zone) => {
			const option = document.createElement('option');
			option.value = zone.id;
			option.textContent = zone.name;

			this.zoneSelect.appendChild(option);
		});
	}

	async loadBuildings() {
		const zoneId = this.zoneSelect.value;

		let url = '/api/v1/locations';

		if (zoneId) {
			url = `/api/v1/zones/${zoneId}/locations`;
		}

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error('Failed to load buildings');
		}

		const buildings = await response.json();

		this.buildingSelect.innerHTML = '<option value="">Select building</option>';

		buildings.forEach((building) => {
			const option = document.createElement('option');
			option.value = building.id;
			option.textContent = building.name;

			this.buildingSelect.appendChild(option);
		});
	}
}
