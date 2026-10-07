const { Router, urlencoded } = require('express');
const { query } = require('../db.js');
const router = Router();

module.exports = router;

router.use("/items", urlencoded());
router.post("/items", async (req, res) => {
	try
	{
		// in the real world, we would validate input,
		// but in this case it's really not necessary

		const { name, description } = req.body;

		if (!name || !description)
		{
			return res.status(422).json({
				title: "Invalid Input Parameters",
				status: 422,
				detail: "You did not provide one of the input parameters (name, description)."
			});
		}

		query(
			"INSERT INTO Item (Name, Description) VALUES (?, ?);",
			name, description
		);
		
		return res.redirect("/full-stack-demo");
	}
	// handle any uncaught exceptions
	catch (ex)
	{
		// provide an error response to the client
		res.status(500).json({
			title: "Internal Server Error",
			status: 500,
			detail: "An exception was thrown while trying to serve your request.",
			errors: [
				ex
			]
		});
		
		// re-throw the error to continue normal error handling
		// (or lack thereof)
		throw ex;
	}
});


router.get("/items", async (req, res) => {
	try
	{
		const results = query(
			"SELECT Id, Name, Description FROM Item;"
		);

		return res.status(200).json(results);
	}
	// handle any uncaught exceptions
	catch (ex)
	{
		// provide an error response to the client
		res.status(500).json({
			title: "Internal Server Error",
			status: 500,
			detail: "An exception was thrown while trying to serve your request.",
			errors: [
				ex
			]
		});
		
		// re-throw the error to continue normal error handling
		// (or lack thereof)
		throw ex;
	}
});
