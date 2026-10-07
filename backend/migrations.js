// This isn't the optimal way of doing things,
// but it works for the time being.

module.exports = [
	`CREATE TABLE IF NOT EXISTS Item (
		Id			INTEGER PRIMARY KEY,
		Name		STRING NOT NULL,
		Description	STRING
	);`
];