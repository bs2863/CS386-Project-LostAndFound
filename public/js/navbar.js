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
		const findItems = document.getElementById('findItemsLink');
		const navbarBrand = document.getElementById('navbarBrand');
		// navbar shows the logged in user's ID (or guest if no one is logged in)
		const email = localStorage.getItem('demoEmail');
		if (role === 'guest') {
			status.textContent = 'Guest';
		} else if (email) {
			status.textContent = email.split('@')[0];
		} else {
			status.textContent = role;
		}

		// role-based navigation menu handling
		findItems.hidden = role === 'staff';
		reportLost.hidden = role !== 'user';
		registerFound.hidden = role !== 'staff';
		manageItems.hidden = role !== 'staff';
		// role-based homepage
		if (role === 'staff') {
			navbarBrand.href = '/staffManagementPage.html';
		}
		// change log in to log out
		if (role === 'user' || role === 'staff') {
			loginLink.textContent = 'Log Out';
			loginLink.addEventListener('click', () => {
				localStorage.removeItem('demoRole');
				localStorage.removeItem('demoEmail');
			});
		}
	});
