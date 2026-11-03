// this file will handle http request for search and/or add items
const express = require('express');
const { db } = require('./db');
const router = express.Router();

// GET /api/v1/items
// get all items from database
// optional filters: ?type=lost|found  and  ?q=search text
router.get('/', (req, res) => {
	const { type, q, locationId } = req.query;

	// "AS name" etc. give camelCase JSON, (the same shape as mockData.json)
	// The JOINs add readable category/location names next to the ids
	let sql = `
		SELECT i.Id AS id, i.Type AS type, i.Name AS name,
		       i.CategoryId AS categoryId, c.Name AS categoryName,
		       i.Color AS color, i.Brand AS brand, i.Description AS description,
		       i.Date AS date, i.LocationId AS locationId, l.Name AS locationName,
		       i.Status AS status, i.ReportedBy AS reportedBy
		FROM Item i
		LEFT JOIN Category c ON c.Id = i.CategoryId
		LEFT JOIN Location l ON l.Id = i.LocationId`;

	// build the WHERE clause from whichever filters were sent
	const conditions = [];
	const params = [];

	if (type !== undefined) {
		if (type !== 'lost' && type !== 'found') {
			return res.status(400).json({ error: 'type must be lost or found' });
		}
		conditions.push('i.Type = ?');
		params.push(type);
	}

	if (typeof locationId === 'string' && locationId.trim()) {
		conditions.push('i.LocationId = ?');
		params.push(locationId.trim());
	}

	if (typeof q === 'string' && q.trim()) {
		// LIKE is case-insensitive in SQLite; % matches anything around the text
		conditions.push('(i.Name LIKE ? OR i.Description LIKE ?)');
		params.push(`%${q.trim()}%`, `%${q.trim()}%`);
	}

	if (conditions.length > 0) {
		sql += ' WHERE ' + conditions.join(' AND ');
	}
	sql += ' ORDER BY i.Date DESC';

	// read items from sqlite
	try {
		const items = db.prepare(sql).all(...params);
		return res.status(200).json(items);
	} catch (error) {
		console.error('Failed to get items from SQLite:', error);
		return res.status(500).json({
			error: 'Failed to get items',
		});
	}
});

// POST /api/v1/items
// create new item to database
router.post('/', (req, res) => {
	// post a new item to sqlite
	// define structure of each item
	const {
		type,
		name,
		categoryId,
		color,
		brand,
		description,
		date,
		locationId,
		status,
	} = req.body || {};

	// validation of required fields
	if (
		(type !== 'found' && type !== 'lost') ||
		typeof name !== 'string' ||
		!name.trim() ||
		!categoryId ||
		!description ||
		!date ||
		!locationId
	) {
		return res.status(400).json({
			error: 'Invalid or missing item details',
		});
	}

	try {
		// categoryId and locationId must exist in their tables,
		// so every item can be matched and shown with readable names
		const category = db.prepare('SELECT 1 FROM Category WHERE Id = ?').get(String(categoryId));
		const location = db.prepare('SELECT 1 FROM Location WHERE Id = ?').get(String(locationId));
		if (!category || !location) {
			return res.status(400).json({
				error: 'Unknown category or location',
			});
		}

		// declare and define SQL for safe insertion to SQLite
		const command = db.prepare(`
        INSERT INTO Item (
            Type, Name, CategoryId, Color, Brand,
            Description, Date, LocationId, Status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

		const result = command.run(
			type,
			name.trim(),
			categoryId,
			color ?? null,
			brand ?? null,
			description,
			date,
			locationId,
			status || (type === 'found' ? 'unclaimed' : 'open'),
		);

		return res.status(201).json({
			// auto create id number
			id: Number(result.lastInsertRowid),
			message: 'Item created successfully',
		});
	} catch (error) {
		console.error('Failed to create an item:', error);
		return res.status(500).json({
			error: 'Failed to create an item',
		});
	}
});

module.exports = router;
