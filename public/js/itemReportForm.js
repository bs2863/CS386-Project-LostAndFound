class ItemReportForm {
	constructor(form, messageElement, submitButton) {
		this.form = form;
		this.messageElement = messageElement;
		this.submitButton = submitButton;
	}

	// template method - defines the submission steps
	async submit() {
		this.submitButton.disabled = true;

		try {
			// 1. read the form
			const formData = new FormData(this.form);
			// 2. transform data. must be ran by child class
			const item = this.buildItem(formData);
			// 3. validate filling
			if (!this.validate(item)) {
				this.showMessage('Please fill out all required fields.');
				return;
			}

			// 4. run checklist before submit (duplication and etc. from the lostItem)
			const canSubmit = await this.beforeSubmit(item);
			if (!canSubmit) return;

			// 5. POST
			const response = await fetch('/api/v1/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item),
			});

			if (!response.ok) {
				throw new Error('Failed to submit item');
			}

			const savedItem = await response.json();
			this.showMessage(this.successMessage(savedItem.id));
			this.form.reset();
		} catch (error) {
			console.error(error);
			this.showMessage('Failed to report the item. Please try again.');
		} finally {
			this.submitButton.disabled = false;
		}
	}

	// subclasses can customize the contents in this step
	buildItem(formData) {
		throw new Error('Subclass must implement buildItem()');
	}

	validate(item) {
		const requiredFields = [
			'name',
			'categoryId',
			'description',
			'date',
			'locationId',
		];

		for (const field of requiredFields) {
			if (!item[field]) {
				return false;
			}
		}

		return true;
	}

	async beforeSubmit(item) {
		return true;
	}

	successMessage(id) {
		return `Item submitted successfully. Item ID: ${id}`;
	}

	showMessage(message) {
		this.messageElement.textContent = message;
	}
}
