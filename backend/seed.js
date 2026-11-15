const path = require('node:path');
const { db, runMigrations } = require('./db');
const mockData = require(path.join(__dirname, '..', 'public', 'data', 'mockData.json'));

// make sure the tables exist (same as when the server starts)
runMigrations();

// never add duplicates on top of real or already-seeded data
const { count } = db.prepare('SELECT COUNT(*) AS count FROM Item').get();
if (count > 0) {
	console.log(`Database already has ${count} items, nothing seeded.`);
	process.exit(0);
}

const insert = db.prepare(`
	INSERT INTO Item (
		Type, Name, CategoryId, Color, Brand,
		Description, Date, LocationId, Status, ReportedBy
	)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const insertContact = db.prepare(`
	INSERT INTO LostReportContact (ItemId, Email) VALUES (?, ?)`);
const emailOf = new Map(mockData.users.map((user) => [user.id, user.email]));

// Lost reports also get contact info, so inbox can find them by email
for (const item of mockData.items) {
	const result = insert.run(
		item.type,
		item.name,
		item.categoryId,
		item.color,
		item.brand,
		item.description,
		item.date,
		item.locationId,
		item.status,
		item.reportedBy,
	);

	if (item.type === 'lost' && emailOf.has(item.reportedBy)) {
		insertContact.run(Number(result.lastInsertRowid), emailOf.get(item.reportedBy));
	}
}

console.log(`Seeded ${mockData.items.length} items.`);