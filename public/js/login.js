const DEMO_ACCOUNTS = {
	user: { role: 'user', email: 'lk123@nau.edu' },
	staff: { role: 'staff', email: 'jw789@nau.edu' },
	lk123: { role: 'user', email: 'lk123@nau.edu' }, // Louie King
	jl456: { role: 'user', email: 'jl456@nau.edu' }, // Jae Lee
	jw789: { role: 'staff', email: 'jw789@nau.edu' }, // Jonathan Wince
};

document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.getElementById('loginForm');
	const message = document.getElementById('loginMessage');

	// Handle login submit
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const userID = document.getElementById('userID').value.trim().toLowerCase();
		// demo login
		const account = DEMO_ACCOUNTS[userID];
		if (!account) {
			message.textContent =
				'Use "user", "staff", or a demo ID (lk123, jl456, jw789).';
			return;
		}
		localStorage.setItem('demoRole', account.role);
		// remember who logged in, so pages like newHome can show their reports
		localStorage.setItem('demoEmail', account.email);

		if (account.role === 'staff') {
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
