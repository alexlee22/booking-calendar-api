# booking-calendar-api

A NodeJS that can read and book appointment using Google's Calendar API. The server authentication is based off the [Google Node.JS Sample.](https://developers.google.com/calendar/quickstart/nodejs). All times are in UTC.

*Designed for specific requirements*

## Requirements

Before running the site, ensure the following are installed and your terminal can run the following (developed on the following):

node v11.11.0
npm v6.7.0

You will also need a Google account to use their API. Create a project [here](https://console.developers.google.com/apis/) and create the credentials:

- API Key (with Google Calendar API enabled), and an
- OAuth (download the file and move it to the root folder location. rename it as `credentials.json`)


## Running the server

Before running the server, you will need to install npm packages by running the command `npm install` in the root folder (eg. `.booking-calendar-api/`)

To start the server, input the command `node .` into your terminal to start the server. You can also run a hot-loading server by using the command `nodemon .`.

## Authenticating the application

You will be required to authenticate the application if a token has not been created beforehand. Follow the prompts on the

1. Paste the URL into a browser and follow the prompts,
2. In the `redirect` URL, look for the `code` value parameter (should appear in the following: `http://localhost:3000/?code=<VALUE>&scope=...`)
3. Paste the `<VALUE>` parameter value into the terminal and press enter.

Once generated, you do not need to generate a token unless it requires refreshing (if password changes, greater than 30 days, etc.). More information can be found on the [Google Node.JS Sample.](https://developers.google.com/calendar/quickstart/nodejs)