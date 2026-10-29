// These tests run the real app against a real SQLite database,
// so they check the actual SQL (filters, JOINs, validation) instead of mocks.
// The database lives only in memory and disappears when the tests finish,
// so lost-and-found.db is never touched.

// must be set BEFORE db.js is loaded (it opens the database right away)
process.env.DB_PATH = ':memory:';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index'); // loading index.js also runs the migrations
const { db } = require('../db');

let server;
let url;

// start one server for all the tests in this file
before(() => {
	server = app.listen(0);
	url = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
	await new Promise((resolve) => server.close(resolve));
});

// every test starts with the same three items
beforeEach(() => {
	db.exec('DELETE FROM Item');
	db.exec(`
		INSERT INTO Item (Type, Name, CategoryId, Description, Date, LocationId, Status) VALUES
		('lost',  'Black Wallet', 'C003', 'Small black wallet',    '2026-10-02', '28', 'open'),
		('found', 'Wallet',       'C003', 'Brown leather wallet',  '2026-10-03', '28', 'unclaimed'),
		('found', 'Headphones',   'C001', 'Black Bose headphones', '2026-10-04', '3', 'unclaimed')
	`);
});

// small helper: the names from a list of items, sorted so order doesn't matter
const namesOf = (items) => items.map((item) => item.name).sort();

// Test GET categories
test('GET categories returns the seeded categories', async () => {
	// act
	const res = await fetch(`${url}/categories`);
	const categories = await res.json();

	// assert
	assert.equal(res.status, 200);
	assert.equal(categories.length, 6);
	assert.deepEqual(categories[0], { id: 'C001', name: 'Electronics' });
});

// Test GET locations
test('GET locations returns the seeded locations', async () => {
	const res = await fetch(`${url}/locations`);
	const locations = await res.json();

	assert.equal(res.status, 200);
	assert.equal(locations.length, 124);
	assert.deepEqual(locations[0], { id: '26', name: 'Adel Mathematics' });
});

// Test GET items with category and location names
test('GET items includes category and location names', async () => {
	const res = await fetch(`${url}/items?q=headphones`);
	const [item] = await res.json();

	assert.equal(res.status, 200);
	assert.equal(item.name, 'Headphones');
	assert.equal(item.categoryName, 'Electronics');
	assert.equal(item.locationName, 'North Union');
});

// Test GET items filtered by type
test('GET items with type=found returns only found items', async () => {
	const res = await fetch(`${url}/items?type=found`);
	const items = await res.json();

	assert.equal(res.status, 200);
	assert.deepEqual(namesOf(items), ['Headphones', 'Wallet']);
});

// Test GET items search
test('GET items search matches name or description, ignoring case', async () => {
	const byName = await (await fetch(`${url}/items?q=WALLET`)).json();
	const byDescription = await (await fetch(`${url}/items?q=bose`)).json();
	const combined = await (await fetch(`${url}/items?type=found&q=wallet`)).json();

	assert.deepEqual(namesOf(byName), ['Black Wallet', 'Wallet']);
	assert.deepEqual(namesOf(byDescription), ['Headphones']);
	assert.deepEqual(namesOf(combined), ['Wallet']);
});

// Test GET items with an invalid type
test('GET items with an unknown type is rejected', async () => {
	const res = await fetch(`${url}/items?type=stolen`);

	assert.equal(res.status, 400);
});

// Test POST item saved to the real database
test('POST valid item is saved and shows up in GET items', async () => {
	// arrange
	const item = {
		type: 'found',
		name: 'Blue Umbrella',
		categoryId: 'C006',
		description: 'Small blue umbrella',
		date: '2026-10-05',
		locationId: '26',
	};

	// act
	const res = await fetch(`${url}/items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(item),
	});
	const [saved] = await (await fetch(`${url}/items?q=umbrella`)).json();

	// assert
	assert.equal(res.status, 201);
	assert.equal(saved.name, 'Blue Umbrella');
	assert.equal(saved.status, 'unclaimed'); // default status for found items
	assert.equal(saved.locationName, 'Adel Mathematics');
});

// Test POST item with a category that doesn't exist
test('POST item with an unknown category is rejected and not saved', async () => {
	const res = await fetch(`${url}/items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			type: 'found',
			name: 'Mystery Item',
			categoryId: 'C999',
			description: 'Does not fit any category',
			date: '2026-10-05',
			locationId: 'LOC001',
		}),
	});
	const search = await (await fetch(`${url}/items?q=mystery`)).json();

	assert.equal(res.status, 400);
	assert.deepEqual(search, []);
});