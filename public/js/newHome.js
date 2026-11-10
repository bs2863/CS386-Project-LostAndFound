// New home page: the logged-in user's inbox of lost item reports.
document.addEventListener('DOMContentLoaded', async () => {
	const message = document.getElementById('inboxMessage');
	const openSection = document.getElementById('openSection');
	const openList = document.getElementById('openReports');
	const closedSection = document.getElementById('closedSection');
	const closedSummary = document.getElementById('closedSummary');
	const closedList = document.getElementById('closedReports');

	// Demo login (see login.js) only remembers a role, not who you are.
	// Until real accounts exist, the "user" role is Louie King from mockData.json,
	// and his reports are the ones filed with his email.
	const DEMO_USER_EMAIL = 'lk123@nau.edu';
	const role = localStorage.getItem('demoRole');

	if (role !== 'user') {
		message.textContent =
			role === 'staff'
				? 'Staff accounts manage items on the Manage Items page.'
				: 'Log in as a user to see your lost item reports.';
		return;
	}

	// Load this user's lost reports
	let reports;
	try {
		const response = await fetch(
			`/api/v1/items?type=lost&email=${encodeURIComponent(DEMO_USER_EMAIL)}`,
		);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		reports = await response.json();
	} catch (error) {
		console.error('Failed to load reports:', error);
		message.textContent = 'Could not load your reports. Please try again.';
		return;
	}

	if (reports.length === 0) {
		message.textContent = "You haven't reported any lost items yet.";
		return;
	}

	// Open reports go in the main list, finished ones in "Closed reports"
	const openReports = reports.filter((report) => report.status === 'open');
	const closedReports = reports.filter((report) => report.status !== 'open');

	openReports.forEach((report) => openList.appendChild(buildCard(report)));
	closedReports.forEach((report) => closedList.appendChild(buildCard(report)));

	openSection.hidden = openReports.length === 0;
	closedSection.hidden = closedReports.length === 0;
	closedSummary.textContent = `Closed reports (${closedReports.length})`;

	if (openReports.length === 0) {
		message.textContent = 'You have no open reports.';
	}
});

// How each database status looks on a card.
// "Matches found" and "Ready for pickup" are added in later PRs.
const STATUS_DISPLAY = {
	open: { className: 'status-searching', badge: 'Searching', note: 'No likely matches yet' },
	resolved: { className: 'status-closed', badge: 'Picked up', note: 'Item returned' },
	cancelled: { className: 'status-closed', badge: 'Cancelled', note: 'Report cancelled' },
};

// Build one report card (same HTML shape as the PR 1 mockup).
// textContent is used for anything the user typed, so it can't inject HTML.
function buildCard(report) {
	const display = STATUS_DISPLAY[report.status] || {
		className: 'status-closed',
		badge: report.status,
		note: '',
	};

	const card = document.createElement('li');
	card.className = `report-card ${display.className}`;

	// left half: what was lost
	const info = document.createElement('div');
	info.className = 'report-info';
	const name = document.createElement('h3');
	name.textContent = report.name;
	const details = document.createElement('p');
	details.textContent = [report.categoryName, report.locationName, `Lost ${formatDate(report.date)}`]
		.filter(Boolean)
		.join(' · ');
	info.append(name, details);

	// right half: where it stands
	const status = document.createElement('div');
	status.className = 'report-status';
	const badge = document.createElement('span');
	badge.className = 'status-badge';
	badge.textContent = display.badge;
	const note = document.createElement('p');
	note.textContent = display.note;
	status.append(badge, note);

	// open reports can be cancelled (the button is connected in a later PR)
	if (report.status === 'open') {
		const actions = document.createElement('div');
		actions.className = 'report-actions';
		const cancel = document.createElement('button');
		cancel.type = 'button';
		cancel.className = 'button-secondary';
		cancel.textContent = 'Cancel report';
		actions.appendChild(cancel);
		status.appendChild(actions);
	}

	card.append(info, status);
	return card;
}

// '2026-10-02' -> 'Oct 2, 2026'
// (T00:00 reads it as local time; without it, US time zones show the day before)
function formatDate(date) {
	if (!date) return '';
	return new Date(`${date}T00:00`).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}