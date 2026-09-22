# Backend API Quick-Start Guide
The backend for this project is pretty straightforward,
but if you're not already familiar with Node or NPM it
can be a little overwhelming at first.

## Install Node.js
You can get a prebuilt binary installer for Node and NPM
from [here](https://nodejs.org/en/download/current). You
can also follow the instructions above the installer links
if you prefer to install from the command line.

Once you have installed Node, you can run the following
commands to make sure everything is installed properly:

```sh
node --version # should display the installed version of Node
npm --version # should also display the version of NPM
```

If both of those succeed and give you version numbers, you
should be good to go.

## Set up the project
You will need to do this whenever the project config or
project lockfile (`package.json` and `package-lock.json`,
respectively) change. This step installs all the dependencies
of the backend, notably Express and sqlite.

First, navigate to the `backend` directory in your terminal.
This should be `{your-repo-directory}/backend/`, and should
contain the `package.json` and `index.js` files.

Once you have pulled the most recent version of the project
using `git pull` (or merging in the most recent version from
`main` if you're on a branch), you can run the following
command to install all the packages we need:

```sh
npm install --no-save
```

The `--no-save` option is *technically* not necessary, but
it means that whenever packages have minor updates or patches
we will be less likely to have a bunch of people trying to
commit updated files at the same time. It prevents NPM
from changing the version of packages, and we instead
opt for manually updating as needed.

Your project should now be set up.

## Running the project
You will need to do this whenever you want to test the project.
Simply navigate to your project's `/backend/` directory again,
and run `node .`. The backend should print something like this:

```
[Express] The server is live at http://127.0.0.1:8080.
```

You can open the link in a browser and it will serve up the website,
as well as running the backend server (allowing us to interact with
the sqlite database on disk).

When you're done testing the website, you can go back to the terminal
in which you ran `node .`, and press Ctrl+C to interrupt the process.
The local server will shut down.
