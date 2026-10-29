document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.getElementById('loginForm');
	const message = document.getElementById('loginMessage');

	// Handle login submit
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const userID = document.getElementById('userID').value.trim().toLowerCase();
		// demo login
		if (userID !== 'user' && userID !== 'staff') {
			message.textContent = 'Use "user" or "staff" for the demo.';
			return;
		}
		localStorage.setItem('demoRole', userID);

		if (userID === 'staff') {
			window.location.href = '/staffManagementPage.html';
		} else {
			window.location.href = '/home.html';
		}

		const credentials = {
			userID: loginForm.userID.value.trim(),
			password: loginForm.password.value,
		};

		// Send credentials to backend

		// Backend decides account type, then redirect to home page/management page

		// No real authentication for now, login just redirects to home page directly
		// commented out for demo view
		//window.location.href = '/home.html';
	});
});
