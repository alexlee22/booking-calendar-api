const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require('express')

const app = express()
const port = 3000


// If modifying these scopes, delete token.json.
/*
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];
*/
const SCOPES = [
  'https://www.googleapis.com/auth/calendar'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';


/*
function accessGoogle(selectedFunction) {
  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), selectedFunction);
  });
}


function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
    //return oAuth2Client;
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listEvents(auth) {
  //console.log(auth)
  const calendar = google.calendar({version: 'v3', auth});
  return calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
    
  });
}
*/

// - - - - - - - - - - - - - - - - - - - -
//  GOOGLE API
// - - - - - - - - - - - - - - - - - - - -
function listEvents(auth, timeMin, timeMax) {
  const calendar = google.calendar({version: 'v3', auth});
  return new Promise(resolve => {
    calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      //maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = res.data.items;
      resolve(events)
    });
  });
}










function createEvent(auth, year, month, day, hour, minute){
  let postStartDateTime = new Date(Date.UTC(year, month, day, hour, minute, 0))
  let postEndDateTime = new Date(Date.UTC(year, month, day, hour, minute + APPOINTMENT_DURATION_MINUTES + APPOINTMENT_BREAK_MINUTES, 0))
  console.log(postStartDateTime, postEndDateTime)
  const calendar = google.calendar({version: 'v3', auth});

  return new Promise(resolve => {
    calendar.events.insert({
      'calendarId': 'primary',
      'resource': {
        'summary': 'Booked Event',
        //'location': '800 Howard St., San Francisco, CA 94103',
        //'description': 'A chance to hear more about Google\'s developer products.',
        'start': {
          'dateTime': postStartDateTime.toISOString(),
          'timeZone': 'UTC'
        },
        'end': {
          'dateTime': postEndDateTime.toISOString(),
          'timeZone': 'UTC'
        }
      }
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const event = res.data;
      resolve(event)
    });
  });
  
}

function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  return new Promise(resolve => {
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err){
        let accessToken = getAccessToken(oAuth2Client);
        resolve(accessToken);
      } else {
        oAuth2Client.setCredentials(JSON.parse(token));
        resolve(oAuth2Client);
      } 
    });
  });
}

function getAuthCredentials() {
  return new Promise(resolve => {
    return fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      var auth = authorize(JSON.parse(content));
      resolve(auth);
    });
  });
}

function getAccessToken(oAuth2Client) {
  return new Promise(resolve => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        resolve(oAuth2Client);
      });
    });
  })
}

// - - - - - - - - - - - - - - - - - - - -
//
// - - - - - - - - - - - - - - - - - - - -



const APPOINTMENT_START_HOUR = 9;
const APPOINTMENT_END_HOUR = 18;
const APPOINTMENT_DURATION_MINUTES = 40;
const APPOINTMENT_BREAK_MINUTES = 5;

function getAppointmentTimes(year, month, day){
  let datetime_list = [];
  for (let i = APPOINTMENT_START_HOUR; i < APPOINTMENT_END_HOUR; i = i + (APPOINTMENT_DURATION_MINUTES + APPOINTMENT_BREAK_MINUTES)/60){
    datetime_list.push({
      startTime: new Date(Date.UTC(year, month-1, day, Math.floor(i), (i%1)*60, 0)),
      endTime: new Date(Date.UTC(year, month-1, day, Math.floor(i), (i%1)*60+APPOINTMENT_DURATION_MINUTES, 0))
    })
  }
  return(datetime_list)
}

function checkInsideDates(date, start, end){
  if (start < date && date < end ){
    return true
  } else {
    return false
  }
}

function checkOusideDates(date, start, end){
  if (start <= date && end <= date || start >= date && end >= date){
    return true
  } else {
    return false
  }
}

function checkDateAvailability(event_times, year, month, day){
  let appointmentTimes = getAppointmentTimes(year, month, day);
  let availableTimes = appointmentTimes.filter(i => {
    let checkEvents = event_times.map(e => {
      if (
        checkInsideDates(i.startTime, e.startTime, e.endTime)
        || checkInsideDates(i.endTime, e.startTime, e.endTime))
      {
        return false;
      } else {
        return true;
      }
    });
    return !checkEvents.includes(false)
  })

  return availableTimes;
}


async function getBookableDays(req, res) {
  console.log(req.query)
  //CHECK: valid year
  //CHECK: valid month
  //CHECK: GT then min month/year
  //var minTime = new Date()
  var minTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, 1, 0, 0, 0));
  var maxTime = new Date(Date.UTC(+req.query.year, +(req.query.month), 1, 0, 0, 0));
  maxTime.setDate(maxTime.getDate() - 1) //Pick first day of month then subtract 1 day
  
  let auth = await getAuthCredentials();
  let events = await listEvents(auth, minTime, maxTime);
  let event_times = events.map((e) => {
    return({
      startTime: new Date(e.start.dateTime),
      endTime: new Date(e.end.dateTime)
    })
  });
  
  //https://stackoverflow.com/a/44957114
  const rangeDays = Array(maxTime.getDate()).fill(1).map((x, y) => x + y);

  let availableDates = rangeDays.map(i => {
    let getTimesForDate = checkDateAvailability(event_times, +req.query.year, +req.query.month, i);
    if (getTimesForDate.length > 0){
      return { "day": i,  "hasTimeSlots": true };
    } else {
      return { "day": i,  "hasTimeSlots": false };
    }
  });
  
  res.send({
    "success": true,
    "days": availableDates
  })
}


/*
  //GET  /timeslots?year=yyyy&month=mm&day=dd
*/
async function getTimeSlots(req, res) {
  console.log(req.query);
  //CHECK: valid year
  //CHECK: valid month
  //CHECK: valid day
  //CHECK: GT then min month/year

  var minTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_START_HOUR, 0, 0));
  var maxTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_END_HOUR, 0, 0));
  
  let auth = await getAuthCredentials();
  let events = await listEvents(auth, minTime, maxTime);
  
  let event_times = events.map((e) => {
    return({
      startTime: new Date(e.start.dateTime),
      endTime: new Date(e.end.dateTime)
    });
  });
  let availableTimeSlots = checkDateAvailability(event_times, +req.query.year, +req.query.month, +req.query.day);
  
  res.send({
    "success": true,
    "timeSlots": availableTimeSlots
  });
}


/*
//POST  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm
*/
async function bookTimeSlot(req, res) {
  console.log(req.query);

  var createDateTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), +(req.query.hour), +(req.query.minute), 0));
  
  let auth = await getAuthCredentials();
  let asd = await createEvent(auth, +req.query.year, +(req.query.month)-1, +(req.query.day), +(req.query.hour), +(req.query.minute))
  console.log(asd);
  
  res.send({
    "success": true,
    "startTime": "asd",
    "endTime": "dsa"
  });
}


/*
- All appointments are 40 minutes long and have fixed times, starting from 9–9:40 am
- Ensure there is always a 5 minute break in between each appointment
- Appointments can only be booked during weekdays from 9 am to 6 pm
- Bookings can only be made at least 24 hours in advance
- Appointments cannot be booked in the past
- For simplicity, use UTC time for all bookings and days
*/



/*
PATHS
*/


app.get('/', (req, res) => res.send('Hello World!'))

//GET  /days?year=yyyy&month=mm
app.get('/days', (req, res) => getBookableDays(req, res));
//GET  /timeslots?year=yyyy&month=mm&day=dd
app.get('/timeslots', (req, res) => getTimeSlots(req, res));
//POST  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm
app.post('/book', (req, res) => bookTimeSlot(req, res));


app.listen(port, () => console.log(`Example app listening on port ${port}!`))