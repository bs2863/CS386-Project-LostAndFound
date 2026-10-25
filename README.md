# NAU Lost and Found System
The NAU Lost and Found System is a full stack web application designed to help members of the Northern Arizona University community report and find lost items on the Flagstaff Mountain Campus. The system allows users to report found items and search for items, making it easier for people to reconnect with their belongings. The project is being developed as part of the CS386 semester long group project.

## Getting Started
These instructions explain how to set up the project on your local machine for development and testing.
### Prerequisites
Before installing the project make sure you have:
```
*Node.js
*npm (which should be included with NOde.js)
*Git to clone the repository
*A code editor
```

### Installing

1. Open a terminal and run:
```
git clone https://github.com/bs2863/CS386-Project-LostAndFound.git
cd CS386-Project-LostAndFound
```

2. Install the backend dependencies

Move into the backend directory and install the required packages:
```
cd backend
npm install
```

3. Load data

To populatethe database with data and run:
```
npm run seed
```

4. Start the application

Start the backend server with:
```
npm start
```

The backend instructions indicate that the local server runs at http://127.0.0.1:8080. Open this address in a browser to try the application locally.

## Running the tests

The project uses the Node.js built-in test runner (node:test) and node:assert. We chose this approach because the backend already requires a recent version of Node.js for its built-in SQLite module. The test runner is included with Node.js, so no additional testing framework is needed. It also supports setup and cleanup hooks and mocking, which allows us to test route logic separately from the database.

All automated tests can be run with one command from the backend directory.
```
npm test
```

### Test Location
The automated tests are located in [backend/tests/](https://github.com/bs2863/CS386-Project-LostAndFound/tree/main/backend/tests).

*[items.test.js](https://github.com/bs2863/CS386-Project-LostAndFound/blob/main/backend/tests/items.test.js): Uses a mocked database to test item routes, including listing items, saving a valid item, and rejecting an item with missing fields.
*[api.test.js](https://github.com/bs2863/CS386-Project-LostAndFound/blob/main/backend/tests/api.test.js): ses a real SQLite database held in memory to test SQL queries and API behavior, including category and location endpoints, type and search filters, category and location names in results, saving items, and rejecting unknown categories.

These approaches complement each other. Mocking keeps route tests focused, while the in-memory database checks that the SQL queries return the expected results. The data in api.test.js is reset before each test, so tests do not depend on each other, and the real lost-and-found.db file is not modified by these tests.

## Deployment
The project currently includes instructions for running the application locally. Before deploying it to a live system, the team would need to configure a hosting environment, production settings, and the required database setup.

## Built with
*HTML: Structures the web packages
*CSS: Styles the user interface
*JavaScript: Adds interactive behavior
*Node.js: Runs the backend
*Express: Handles backend routes and requests
*SQLite: Stores application data

## Contributing

Please read [CONTRIBUTING.md](https://github.com/bs2863/CS386-Project-LostAndFound/blob/main/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/bs2863/CS386-Project-LostAndFound).

## Authors

This project is developed by:
*Lareine Han
*Brennan Smith
*Amaya Gillison
*Jake Domabyl
*Rose Hankins
*Evelyn Torres

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknoledgments
*Northern Arizona University and the CS386 course for the project context.
*The project team members who contributed to the design, implementation, and testing of the system.

