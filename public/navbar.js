fetch('/components/navbar.html')
	.then((response) => response.text())
	.then((html) => {
		const navbar = document.getElementById('navbar');
		if (navbar) navbar.innerHTML = html;
	});
