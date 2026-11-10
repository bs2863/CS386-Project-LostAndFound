const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { db } = require('../db');

const app = express();
app.use(express.json());
app.use('/api/v1/items', require('../items'));

/*-- Testing cases
    GET Items
    POST Valid Item
    POST Invalid Item 
--*/

// Test GET items
test('GET items', async () => {
	// arrange
	const fake = mock.method(db, 'prepare', () => ({
		all: () => [{ id: 1, name: 'Wallet' }],
	}));
	const server = app.listen(0);

	try {
		//act
		const url = `http://127.0.0.1:${server.address().port}`;
		const res = await fetch(`${url}/api/v1/items`);
		const items = await res.json();

		// assert
		assert.equal(res.status, 200);
		assert.equal(items[0].name, 'Wallet');
	} finally {
		fake.mock.restore();
		await new Promise((resolve) => server.close(resolve));
	}
});

// Test POST valid item
test('POST valid item', async () => {
	// arrange
	const fake = mock.method(db, 'prepare', (sql) => ({
    get: () => {
        // Category and location lookups should find a row
        if (sql.includes('FROM Category') ||
            sql.includes('FROM Location')) {
            return {};
        }

        // Duplicate check should find NO duplicate
        if (sql.includes('FROM Item')) {
            return undefined;
        }

        return undefined;
    },

    run: () => ({ lastInsertRowid: 1 }),
}));
	const server = app.listen(0);
	
	try {
		const url = `http://127.0.0.1:${server.address().port}`;
		const item = {
			type: 'found',
			name: 'Wallet',
			categoryId: 'C003',
			description: 'Black wallet',
			date: '2026-10-22',
			locationId: 'LOC001',
		};

		// act
		const res = await fetch(`${url}/api/v1/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item),
		});

		// assert
		assert.equal(res.status, 201);
		assert.equal((await res.json()).id, 1);
	} finally {
		fake.mock.restore();
		await new Promise((resolve) => server.close(resolve));
	}
});

// Test POST invalid item
test('POST invalid item', async () => {
	// arrange
	const server = app.listen(0);

	try {
		// act
		const url = `http://127.0.0.1:${server.address().port}`;
		const res = await fetch(`${url}/api/v1/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Wallet' }),
		});

		// assert
		assert.equal(res.status, 400);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
// Test POST duplicate item
test('POST duplicate item is rejected', async () => {
	// arrange
	const server = app.listen(0);
	//act 
	try {
		const url = `http://127.0.0.1:${server.address().port}`;
		const res = await fetch(`${url}/api/v1/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'found',
				name: 'Wallet',
				categoryId: 'C003',
				description: 'Black wallet',
				date: '2026-10-22',
				locationId: 'LOC001',
			}),
		});

		// assert the response for duplicate item
		assert.equal(res.status, 400);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});