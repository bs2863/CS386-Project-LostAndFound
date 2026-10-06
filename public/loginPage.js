document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.getElementById('loginForm');
	const message = document.getElementById('loginMessage');

	// Handle login submit
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const credentials = {
			userID: loginForm.userID.value.trim(),
			password: loginForm.password.value
		};

		// Send credentials to backend

		// Backend decides account type, then redirect to home page/management page

		message.textContent = 'Login not currently functional.';
	});
});
