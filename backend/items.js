// this file will handle http request for search and/or add items
const express = require('express');
const { db } = require('./db');
const { findPotentialMatch } = require('./matching');
const router = express.Router();

// (used by the matches and claim routes)
const MATCH_ITEM_SQL = `
	SELECT i.Id AS id, i.Type AS type, i.Name AS name,
	       i.CategoryId AS categoryId, c.Name AS categoryName,
	       i.Color AS color, i.Brand AS brand, i.Description AS description,
	       i.Date AS date, i.LocationId AS locationId, l.Name AS locationName,
	       i.Status AS status
	FROM Item i
	LEFT JOIN Category c ON c.Id = i.CategoryId
	LEFT JOIN Location l ON l.Id = i.LocationId`;

// GET /api/v1/items
// get all items from database
// optional filters: ?type=lost|found  and  ?q=search text
router.get('/', (req, res) => {
	const { type, q, locationId, email } = req.query;

	// "AS name" etc. give camelCase JSON, (the same shape as mockData.json)
	// The JOINs add readable category/location names next to the ids.
	// A claimed lost report also gets pickupLocationName: the building
	// where its found item is being held. A claimed found item gets
	// heldForEmail: the email on the report that claimed it, so staff
	// know whose ID to check at pickup (both null for everything else)
	let sql = `
		SELECT i.Id AS id, i.Type AS type, i.Name AS name,
		       i.CategoryId AS categoryId, c.Name AS categoryName,
		       i.Color AS color, i.Brand AS brand, i.Description AS description,
		       i.Date AS date, i.LocationId AS locationId, l.Name AS locationName,
		       i.Status AS status, i.ReportedBy AS reportedBy,
		       pl.Name AS pickupLocationName, hrc.Email AS heldForEmail
		FROM Item i
		LEFT JOIN Category c ON c.Id = i.CategoryId
		LEFT JOIN Location l ON l.Id = i.LocationId
		LEFT JOIN Claim cl ON cl.LostItemId = i.Id
		LEFT JOIN Item f ON f.Id = cl.FoundItemId
		LEFT JOIN Location pl ON pl.Id = f.LocationId
		LEFT JOIN Claim hc ON hc.FoundItemId = i.Id
		LEFT JOIN LostReportContact hrc ON hrc.ItemId = hc.LostItemId`;

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

// GET /api/v1/items/:id/matches
// likely found items for one lost report, best match first
// Only limited details are returned (no description, color or brand)
router.get('/:id/matches', (req, res) => {
	const itemId = Number(req.params.id);

	if (!Number.isInteger(itemId)) {
		return res.status(400).json({ error: 'Invalid item ID' });
	}

	try {
		const lostItem = db.prepare(`${MATCH_ITEM_SQL} WHERE i.Id = ?`).get(itemId);
		if (!lostItem || lostItem.type !== 'lost') {
			return res.status(404).json({ error: 'Lost report not found' });
		}

		const foundItems = db.prepare(`${MATCH_ITEM_SQL} WHERE i.Type = 'found'`).all();

		// findPotentialMatch returns null unless the pair scores at least 50
		const matches = foundItems
			.map((foundItem) => findPotentialMatch(lostItem, foundItem))
			.filter((match) => match !== null)
			.sort((a, b) => b.score - a.score)
			.map((match) => ({
				id: match.foundItem.id,
				name: match.foundItem.name,
				categoryName: match.foundItem.categoryName,
				locationName: match.foundItem.locationName,
				date: match.foundItem.date,
			}));

		return res.status(200).json(matches);
	} catch (error) {
		console.error('Failed to get matches:', error);
		return res.status(500).json({ error: 'Failed to get matches' });
	}
});

// POST /api/v1/items/:id/claim   body: { foundItemId }
// The owner of a lost report claims one of its matches.
// The found item is held for them and the report becomes ready for pickup.
router.post('/:id/claim', (req, res) => {
	const lostItemId = Number(req.params.id);
	const foundItemId = Number((req.body || {}).foundItemId);

	if (!Number.isInteger(lostItemId) || !Number.isInteger(foundItemId)) {
		return res.status(400).json({ error: 'Invalid item ID' });
	}

	try {
		const getItem = db.prepare(`${MATCH_ITEM_SQL} WHERE i.Id = ?`);
		const lostItem = getItem.get(lostItemId);
		const foundItem = getItem.get(foundItemId);

		if (!lostItem || lostItem.type !== 'lost') {
			return res.status(404).json({ error: 'Lost report not found' });
		}
		if (!foundItem || foundItem.type !== 'found') {
			return res.status(404).json({ error: 'Found item not found' });
		}

		// only a real match can be claimed: this is null when the report is
		// not open, the item is already held or claimed, or the score is too low
		if (findPotentialMatch(lostItem, foundItem) === null) {
			return res.status(409).json({ error: 'This item cannot be claimed for this report' });
		}

		// save the claim and both new statuses together
		let result;
		try {
			db.exec('BEGIN');
			result = db
				.prepare('INSERT INTO Claim (LostItemId, FoundItemId) VALUES (?, ?)')
				.run(lostItemId, foundItemId);
			const setStatus = db.prepare('UPDATE Item SET Status = ? WHERE Id = ?');
			setStatus.run('ready', lostItemId);
			setStatus.run('held', foundItemId);
			db.exec('COMMIT');
		} catch (error) {
			db.exec('ROLLBACK');
			throw error;
		}

		return res.status(201).json({
			id: Number(result.lastInsertRowid),
			message: 'Item claimed',
		});
	} catch (error) {
		console.error('Failed to claim item:', error);
		return res.status(500).json({ error: 'Failed to claim item' });
	}
});

// POST /api/v1/items/:id/pickup
// Marks a claimed item as picked up. The id may be the lost report
// (from the owner's inbox) or the held found item (from the staff page).
// Both items become "resolved", which closes the report.
router.post('/:id/pickup', (req, res) => {
	const itemId = Number(req.params.id);

	if (!Number.isInteger(itemId)) {
		return res.status(400).json({ error: 'Invalid item ID' });
	}

	try {
		const claim = db
			.prepare(
				`SELECT cl.LostItemId, cl.FoundItemId, lost.Status AS LostStatus
				 FROM Claim cl
				 JOIN Item lost ON lost.Id = cl.LostItemId
				 WHERE cl.LostItemId = ? OR cl.FoundItemId = ?`,
			)
			.get(itemId, itemId);

		if (!claim) {
			return res.status(404).json({ error: 'No claimed item found for this ID' });
		}
		if (claim.LostStatus !== 'ready') {
			return res.status(409).json({ error: 'This item has already been picked up' });
		}

		// close the report and the found item together
		try {
			db.exec('BEGIN');
			const setStatus = db.prepare("UPDATE Item SET Status = 'resolved' WHERE Id = ?");
			setStatus.run(claim.LostItemId);
			setStatus.run(claim.FoundItemId);
			db.exec('COMMIT');
		} catch (error) {
			db.exec('ROLLBACK');
			throw error;
		}

		return res.status(200).json({ message: 'Item picked up' });
	} catch (error) {
		console.error('Failed to mark item as picked up:', error);
		return res.status(500).json({ error: 'Failed to mark item as picked up' });
	}
});

// POST /api/v1/items/:id/cancel
// The owner cancels a lost report they no longer need.
// Only a report that is still searching can be cancelled; once an item
// is held for it (status "ready"), it is closed by picking it up instead.
router.post('/:id/cancel', (req, res) => {
	const itemId = Number(req.params.id);

	if (!Number.isInteger(itemId)) {
		return res.status(400).json({ error: 'Invalid item ID' });
	}

	try {
		const report = db.prepare('SELECT Type, Status FROM Item WHERE Id = ?').get(itemId);

		if (!report || report.Type !== 'lost') {
			return res.status(404).json({ error: 'Lost report not found' });
		}
		if (report.Status !== 'open') {
			return res.status(409).json({ error: 'Only an open report can be cancelled' });
		}

		db.prepare("UPDATE Item SET Status = 'cancelled' WHERE Id = ?").run(itemId);

		return res.status(200).json({ message: 'Report cancelled' });
	} catch (error) {
		console.error('Failed to cancel report:', error);
		return res.status(500).json({ error: 'Failed to cancel report' });
	}
});

// POST /api/v1/items/check-duplicate
// Check whether an item already exists
router.post('/check-duplicate', (req, res) => {
    const { type, name, categoryId, locationId } = req.body || {};

    // Check required fields
    if (!type || !name || !categoryId || !locationId) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }
	// try to check for duplicate item in the database
    try {
        const duplicate = db.prepare(`
            SELECT 1
            FROM Item
			WHERE Type = ?
            AND Name = ?
            AND CategoryId = ?
            AND LocationId = ?
            LIMIT 1
        `).get(type, name.trim(), categoryId, locationId);
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
			WHERE Type = ?
            AND Name = ?
            AND CategoryId = ?
            AND LocationId = ?
            LIMIT 1
        `).get(type, name.trim(), categoryId, locationId);
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
		// an item that is held for someone can't be removed until it is
		// picked up, or the owner's report would point at a missing item
		const activeClaim = db.prepare(`
			SELECT 1
			FROM Claim cl
			JOIN Item lost ON lost.Id = cl.LostItemId
			WHERE (cl.LostItemId = ? OR cl.FoundItemId = ?)
			AND lost.Status = 'ready'
		`).get(itemId, itemId);

		if (activeClaim) {
			return res.status(409).json({
				error: 'This item is held for pickup. Mark it picked up before removing it.'
			});
		}

		// rows in other tables point at the item, so delete them first
		// (foreign keys are enforced), all in one transaction
		let result;
		try {
			db.exec('BEGIN');
			db.prepare('DELETE FROM Claim WHERE LostItemId = ? OR FoundItemId = ?').run(itemId, itemId);
			db.prepare('DELETE FROM LostReportContact WHERE ItemId = ?').run(itemId);
			db.prepare('DELETE FROM Image WHERE ItemId = ?').run(itemId);
			result = db.prepare('DELETE FROM Item WHERE Id = ?').run(itemId);
			db.exec('COMMIT');
		} catch (error) {
			db.exec('ROLLBACK');
			throw error;
		}

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
