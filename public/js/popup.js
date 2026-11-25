class Popup {
	static show(title, message, type = 'info', isConfirm = false) {
		const dialog = document.getElementById('popup');
		const icon = document.getElementById('popupIcon');
		const cancelButton = document.getElementById('popupCancel');
		const confirmButton = document.getElementById('popupConfirm');

		document.getElementById('popupTitle').textContent = title;
		document.getElementById('popupMessage').textContent = message;

		icon.className = `popup-icon ${type}`;
		dialog.className = `popup ${type}`;

		if (type === 'success') {
			icon.innerHTML = '<i class="bi bi-check-circle"></i>';
		} else if (type === 'error') {
			icon.innerHTML = '<i class="bi bi-exclamation-circle"></i>';
		} else {
			icon.innerHTML = '<i class="bi bi-info-circle"></i>';
		}

		cancelButton.hidden = !isConfirm;
		confirmButton.textContent = isConfirm ? 'Confirm' : 'OK';

		return new Promise((resolve) => {
			confirmButton.onclick = () => dialog.close('true');
			cancelButton.onclick = () => dialog.close('false');

			dialog.returnValue = 'false';

			dialog.onclose = () => {
				resolve(dialog.returnValue === 'true');
			};

			dialog.showModal();
		});
	}
}
