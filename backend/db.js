const { DatabaseSync } = require('node:sqlite');
const migrations = require('./migrations');

const db = new DatabaseSync("lost-and-found.db");

module.exports = {
	runMigrations: function () {
		for (let i = 0; i < migrations.length; ++i)
		{
			db.exec(migrations[i]);
		}
	},
	query: function (text, ...params) {
		return db.prepare(text).all(...params);
	},
	db
}