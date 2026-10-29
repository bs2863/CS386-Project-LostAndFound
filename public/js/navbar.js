// Load navbar into its <div> on all pages
fetch('/components/navbar.html')
	.then((response) => response.text())
	.then((html) => {
		const navbar = document.getElementById('navbar');
		if (!navbar) return;

		navbar.innerHTML = html;
		// if no demoRole(user, staff) selected then show guest
		const role = localStorage.getItem('demoRole') || 'guest';

		const status = document.getElementById('navbarStatus');
		const loginLink = document.getElementById('navbarLogin');
		const reportLost = document.getElementById('reportLostLink');
		const registerFound = document.getElementById('registerFoundLink');
		const manageItems = document.getElementById('manageItemsLink');

		// navbar will show the role
		status.textContent =
			role === 'staff' ? 'Staff' : role === 'user' ? 'User' : 'Guest';

		// role-based navigation menu handling
		reportLost.hidden = role !== 'user' && role !== 'staff';
		registerFound.hidden = role !== 'staff';
		manageItems.hidden = role !== 'staff';

		// change log in to log out
		if (role === 'user' || role === 'staff') {
			loginLink.textContent = 'Log Out';
			loginLink.addEventListener('click', () => {
				localStorage.removeItem('demoRole');
			});
		}
	});
