// set up config constants
// in the future, this can be moved to a file (e.g config.json)
// or environment variables (e.g using dotenv)
const PORT = 8080;
const HOSTNAME = "127.0.0.1";


// pull in dependencies
const express = require('express');

// create app
const app = express();

// basic logging middleware
app.use((req, _, next) => {
	console.log(`[HTTP] ${req.method} ${req.originalUrl}`);

	next();
});

// placeholder API route until we have more blocked out
app.get("/api/v1/health", async (req, res) => {
	return res.status(200).json({
		code: "healthy",
		message: "The server is currently healthy."
	})
});


// serve static files from /public/ as backup
app.use("/", express.static("../public/"));


// listen on configured port
app.listen(PORT, HOSTNAME, (err) => {
	if (err) {
		console.error("[Express] " + err);
		return;
	}

	console.log(`[Express] The server is live at http://${HOSTNAME}:${PORT}.`);
});
