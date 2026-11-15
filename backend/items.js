// this file will handle http request for search and/or add items
const express = require('express');
const { db } = require('./db');
const router = express.Router();

// GET /api/v1/items
// get all items from database
// optional filters: ?type=lost|found  and  ?q=search text
router.get('/', (req, res) => {
	const { type, q, locationId, email } = req.query;

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

	if (typeof email === 'string' && email.trim()) {
		sql += ' JOIN LostReportContact rc ON rc.ItemId = i.Id';
		conditions.push('LOWER(rc.Email) = LOWER(?)');
		params.push(email.trim());
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

// POST /api/v1/items/check-duplicate
// Check whether an item already exists
router.post('/check-duplicate', (req, res) => {
    const { name, categoryId, locationId } = req.body || {};

    // Check required fields
    if (!name || !categoryId || !locationId) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }
	// try to check for duplicate item in the database
    try {
        const duplicate = db.prepare(`
            SELECT 1
            FROM Item
            WHERE Name = ?
            AND CategoryId = ?
            AND LocationId = ?
            LIMIT 1
        `).get(name.trim(), categoryId, locationId);
		// if duplicate exists, return early
        if (duplicate) {
            return res.status(200).json({
                duplicate: true,
                message: 'A similar item already exists'
            });
        }
        // if no duplicate exists, return no duplicate found
        return res.status(200).json({
            duplicate: false,
            message: 'No duplicate found'
        });

    } catch (error) {
        console.error('Duplicate check error:', error);

        return res.status(500).json({
            error: 'Failed to check duplicates'
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
		phone,
    	email
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
		
		// Check for duplicate item before insertion
		const duplicate = db.prepare(`
            SELECT 1
            FROM Item
            WHERE Name = ?
            AND CategoryId = ?
            AND LocationId = ?
            LIMIT 1
        `).get(name.trim(), categoryId, locationId);
			// if duplicate exists, return early
		if (duplicate) {
			return res.status(400).json({
				error: 'A similar item already exists'
			});
		}
		// if no duplicate exists, proceed with insertion
		// declare and define SQL for safe insertion to SQLite
		const command = db.prepare(`
        INSERT INTO Item (
            Type, Name, CategoryId, Color, Brand,
            Description, Date, LocationId, Status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);


        // Save item and contact information together
        let result;

        try {
            db.exec('BEGIN');

            result = command.run(
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

            // Save contact information for lost items only
            if (type === 'lost') {
                const contactCommand = db.prepare(`
                    INSERT INTO LostReportContact (ItemId, Phone, Email)
                    VALUES (?, ?, ?)
                `);

                contactCommand.run(
                    Number(result.lastInsertRowid),
                    phone?.trim() || null,
                    email?.trim() || null
                );
            }

            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }

        return res.status(201).json({
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

// Update items that already exist in the database (for the staff management page)
router.put('/:id', (req, res) => {
	const itemId = Number(req.params.id);

	const {
		type,
		name,
		color,
		brand,
		description,
		status
	} = req.body || {};

	if (!Number.isInteger(itemId)) {
		return res.status(400).json({
			error: 'Invalid item ID'
		});
	}
	if (
		(type !== 'lost' && type !== 'found' ||
			typeof name !== 'string' ||
			!name.trim() ||
			typeof status !== 'string' ||
			!status.trim()
		)
	) {
		return res.status(400).json({
			error: 'Invalid or missing item details'
		});
	}
	try {
		const command = db.prepare(`
		UPDATE Item
		SET 
			Type = ?,
			Name = ?,
			Color = ?,
			Brand = ?,
			Description = ?,
			Status = ?
		WHERE Id = ?
`);

		const result = command.run(
			type,
			name.trim(),
			color?.trim() || null,
			brand?.trim() || null,
			description?.trim() || null,
			status.trim(),
			itemId

		);

		if (result.changes === 0) {
			return res.status(404).json({
				error: 'Item not found'
			});
		}

		return res.status(200).json({
			message: "Item successfully updated"
		})
	} catch (error) {
		console.error('Failed to update item: ', error);

		return res.status(500).json({
			error: 'Failed to update item'
		});
	}
});

// Delete an item from the database (Also for the staff management page)
router.delete('/:id', (req, res) => {

	// get the item id from the url
	const itemId = Number(req.params.id);

	if (!Number.isInteger(itemId)) {
		return res.status(400).json({
			error: 'Invalid item ID'
		});
	}

	try {
		const command = db.prepare(`
			DELETE FROM Item
			Where Id = ?	
		`);

		const result = command.run(itemId);

		if (result.changes === 0) {
			return res.status(404).json({
				error: 'Item not found'
			});
		}

		return res.status(200).json({
			message: 'Item successfully deleted'
		});
	} catch (error) {
		console.error('Failed to delete item: ', error);

		return res.status(500).json({
			error: 'Failed to delete item'
		});
	}
});

module.exports = router;
