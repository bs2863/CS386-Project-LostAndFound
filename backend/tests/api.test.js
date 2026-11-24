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
	db.exec('DELETE FROM Claim');
	db.exec('DELETE FROM LostReportContact');
	db.exec('DELETE FROM Item');
	db.exec('DELETE FROM LostReportContact');
	db.exec('DELETE FROM Item');
	db.exec(`
		INSERT INTO Item (Type, Name, CategoryId, Description, Date, LocationId, Status) VALUES
		('lost',  'Black Wallet', 'C003', 'Small black wallet',    '2026-10-02', '28', 'open'),
		('found', 'Wallet',       'C003', 'Brown leather wallet',  '2026-10-03', '28', 'unclaimed'),
		('found', 'Headphones',   'C001', 'Black Bose headphones', '2026-10-04', '3', 'unclaimed')
	`);
	// the lost Black Wallet was reported by Louie King
	db.exec(`
		INSERT INTO LostReportContact (ItemId, Email)
		SELECT Id, 'lk123@nau.edu' FROM Item WHERE Name = 'Black Wallet'
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
// Test GET items filtered by contact email (the home inbox)
test('GET lost items by email returns only that person\'s reports', async () => {
	// email matching ignores capital letters
	const mine = await (await fetch(`${url}/items?type=lost&email=LK123@nau.edu`)).json();
	const nobody = await (await fetch(`${url}/items?type=lost&email=nobody@nau.edu`)).json();

	assert.deepEqual(namesOf(mine), ['Black Wallet']);
	assert.deepEqual(nobody, []);
});

// Test POST duplicate item is rejected
test('POST duplicate existing item is rejected', async () => {
    const item = {
        type: 'lost',
        name: 'Black Wallet',
        categoryId: 'C003',
        description: 'Another black wallet',
        date: '2026-11-10',
        locationId: '28',
    };
    const res = await fetch(`${url}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(item),
    });

    assert.equal(res.status, 400);

    const count = db.prepare(`
        SELECT COUNT(*) AS count
        FROM Item
        WHERE Name = ?
        AND CategoryId = ?
        AND LocationId = ?
    `).get('Black Wallet', 'C003', '28');

    assert.equal(count.count, 1);
});

// Test GET matches for one lost report
test('GET matches returns likely found items with limited details', async () => {
	const lost = db.prepare("SELECT Id FROM Item WHERE Name = 'Black Wallet'").get();

	const res = await fetch(`${url}/items/${lost.Id}/matches`);
	const matches = await res.json();

	assert.equal(res.status, 200);
	// the found Wallet matches (same category, building and week); Headphones don't
	assert.equal(matches.length, 1);
	assert.equal(matches[0].name, 'Wallet');
	assert.equal(matches[0].locationName, 'Cline Library');
	// details that could help someone fake a claim are left out
	assert.equal(matches[0].description, undefined);
});

test('GET matches puts the best match first', async () => {
	// a second found wallet whose color also matches the report
	db.exec("UPDATE Item SET Color = 'Black' WHERE Name = 'Black Wallet'");
	db.exec(`
		INSERT INTO Item (Type, Name, CategoryId, Color, Description, Date, LocationId, Status) VALUES
		('found', 'Wallet', 'C003', 'Black', 'Black wallet with cards', '2026-10-05', '3', 'unclaimed')
	`);
	const lost = db.prepare("SELECT Id FROM Item WHERE Name = 'Black Wallet'").get();

	const res = await fetch(`${url}/items/${lost.Id}/matches`);
	const matches = await res.json();

	assert.equal(matches.length, 2);
	assert.equal(matches[0].locationName, 'Cline Library');
	assert.equal(matches[1].locationName, 'North Union');
});

test('GET matches for a found item or unknown id is rejected', async () => {
	const found = db.prepare("SELECT Id FROM Item WHERE Name = 'Headphones'").get();

	const foundRes = await fetch(`${url}/items/${found.Id}/matches`);
	const missingRes = await fetch(`${url}/items/999999/matches`);

	assert.equal(foundRes.status, 404);
	assert.equal(missingRes.status, 404);
});

test('GET items shows where a claimed report can be picked up', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));

	const res = await fetch(`${url}/items?type=lost`);
	const [report] = await res.json();

	assert.equal(report.status, 'ready');
	assert.equal(report.pickupLocationName, 'Cline Library');
});

// small helpers for the claim tests
const idOf = (name) => db.prepare('SELECT Id FROM Item WHERE Name = ?').get(name).Id;
const statusOf = (name) => db.prepare('SELECT Status FROM Item WHERE Name = ?').get(name).Status;
const claim = (lostId, foundItemId) =>
	fetch(`${url}/items/${lostId}/claim`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ foundItemId }),
	});

// Test POST claim
test('POST claim holds the found item and makes the report ready for pickup', async () => {
	const res = await claim(idOf('Black Wallet'), idOf('Wallet'));

	assert.equal(res.status, 201);
	assert.equal(statusOf('Black Wallet'), 'ready');
	assert.equal(statusOf('Wallet'), 'held');
	assert.equal(db.prepare('SELECT COUNT(*) AS count FROM Claim').get().count, 1);
});

test('POST claim for an item that is not a match is rejected', async () => {
	const res = await claim(idOf('Black Wallet'), idOf('Headphones'));

	assert.equal(res.status, 409);
	assert.equal(statusOf('Black Wallet'), 'open');
	assert.equal(statusOf('Headphones'), 'unclaimed');
});

test('POST claim twice is rejected the second time', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));
	const res = await claim(idOf('Black Wallet'), idOf('Wallet'));

	assert.equal(res.status, 409);
	assert.equal(db.prepare('SELECT COUNT(*) AS count FROM Claim').get().count, 1);
});

// Test POST cancel
const cancel = (id) => fetch(`${url}/items/${id}/cancel`, { method: 'POST' });

test('POST cancel closes an open report', async () => {
	const res = await cancel(idOf('Black Wallet'));

	assert.equal(res.status, 200);
	assert.equal(statusOf('Black Wallet'), 'cancelled');
});

test('POST cancel on a claimed report is rejected', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));
	const res = await cancel(idOf('Black Wallet'));

	assert.equal(res.status, 409);
	assert.equal(statusOf('Black Wallet'), 'ready');
});

test('POST cancel on a found item or unknown id is rejected', async () => {
	const foundRes = await cancel(idOf('Wallet'));
	const missingRes = await cancel(999999);

	assert.equal(foundRes.status, 404);
	assert.equal(missingRes.status, 404);
	assert.equal(statusOf('Wallet'), 'unclaimed');
});

// Test POST pickup
const pickup = (id) => fetch(`${url}/items/${id}/pickup`, { method: 'POST' });

test('POST pickup by the owner closes the report and the found item', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));
	const res = await pickup(idOf('Black Wallet'));

	assert.equal(res.status, 200);
	assert.equal(statusOf('Black Wallet'), 'resolved');
	assert.equal(statusOf('Wallet'), 'resolved');
});

test('POST pickup by staff using the found item id works the same way', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));
	const res = await pickup(idOf('Wallet'));

	assert.equal(res.status, 200);
	assert.equal(statusOf('Black Wallet'), 'resolved');
	assert.equal(statusOf('Wallet'), 'resolved');
});

test('POST pickup without a claim, or twice, is rejected', async () => {
	const unclaimedRes = await pickup(idOf('Black Wallet'));
	assert.equal(unclaimedRes.status, 404);
	assert.equal(statusOf('Black Wallet'), 'open');

	await claim(idOf('Black Wallet'), idOf('Wallet'));
	await pickup(idOf('Black Wallet'));
	const secondRes = await pickup(idOf('Black Wallet'));
	assert.equal(secondRes.status, 409);
});

test('GET items shows staff who a held found item is for', async () => {
	await claim(idOf('Black Wallet'), idOf('Wallet'));

	const res = await fetch(`${url}/items?type=found&q=wallet`);
	const [item] = await res.json();

	assert.equal(item.status, 'held');
	assert.equal(item.heldForEmail, 'lk123@nau.edu');
});