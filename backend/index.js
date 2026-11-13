// set up config constants
// in the future, this can be moved to a file (e.g config.json)
// or environment variables (e.g using dotenv)
const PORT = 8080;
const HOSTNAME = '127.0.0.1';

// pull in dependencies
const express = require('express');

const { runMigrations, query } = require('./db');

//matching functions for lost and found items
const { groupMatchingItems } = require('./matching');

// initialize database
runMigrations();

// create app
const app = express();

// now express can read json as req.body
app.use(express.json());

// basic logging middleware
app.use((req, _, next) => {
	console.log(`[HTTP] ${req.method} ${req.originalUrl}`);

	next();
});

// placeholder API route until we have more blocked out
app.get('/api/v1/health', async (req, res) => {
	return res.status(200).json({
		code: 'healthy',
		message: 'The server is currently healthy.',
	});
});

// not real API endpoints, but add full stack demo for reference purposes
app.use('/api/v1/full-stack-demo/', require('./full-stack-demo/index'));

// Item API routes
app.use('/api/v1/items', require('./items'));

//find and group possible matches between items
app.get('/api/v1/items/matches', (req, res) => {

    //get all items from database
    const items = query(`
        SELECT
            Id AS id,
            Type AS type,
            Name AS name,
            CategoryId AS categoryId,
            Color AS color,
            Brand AS brand,
            Description AS description,
            Date AS date,
            LocationId AS locationId,
            Status AS status
        FROM Item
    `);

    //group items that could match
    const matchingGroups = groupMatchingItems(items);

    //return possible matches
    return res.status(200).json(matchingGroups);
});
// Dropdown options for the report forms
// ("AS id" / "AS name" so the JSON matches public/data/mockData.json)
app.get('/api/v1/categories', (req, res) => {
	return res.status(200).json(query('SELECT Id AS id, Name AS name FROM Category ORDER BY Id;'));
});

app.get('/api/v1/locations', (req, res) => {
	return res.status(200).json(query('SELECT Id AS id, Name AS name FROM Location ORDER BY Name ASC;'));
});

// serve static files from /public/ as backup
app.use('/', express.static('../public/'));

// listen on configured port
// Start server only when running index.js directly
if (require.main === module) {
	app.listen(PORT, HOSTNAME, () => {
		console.log(`Server running at http://${HOSTNAME}:${PORT}`);
	});
}

// Export app for automated testing
module.exports = app;
