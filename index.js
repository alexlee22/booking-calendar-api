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
// FUNCTIONS
// - - - - - - - - - - - - - - - - - - - -

const APPOINTMENT_START_HOUR = 9;
const APPOINTMENT_END_HOUR = 18;
const APPOINTMENT_DURATION_MINUTES = 40;
const APPOINTMENT_BREAK_MINUTES = 5;

function checkWeekday(date){
  if (0 < date.getDay() && date.getDay() < 6){
    return true;
  } else {
    return false;
  }
}

//
function getAppointmentTimes(year, month, day){
  //Check if weekend, return empty list
  let constDate = new Date(Date.UTC(year, month-1, day, 0, 0, 0));
  if (!checkWeekday(constDate)){
    return []; 
  }

  let datetime_list = [];
  for (let i = APPOINTMENT_START_HOUR; i < APPOINTMENT_END_HOUR; i = i + (APPOINTMENT_DURATION_MINUTES + APPOINTMENT_BREAK_MINUTES)/60){
    let constData = {
      startTime: new Date(Date.UTC(year, month-1, day, Math.floor(i), (i%1)*60, 0)),
      endTime: new Date(Date.UTC(year, month-1, day, Math.floor(i), (i%1)*60+APPOINTMENT_DURATION_MINUTES, 0))
    }
    if (check24Hours(constData.endTime)){
      datetime_list.push(constData);
    }
  }
  return(datetime_list);
}

function check24Hours(date){
  const today = new Date();
  today.setHours(today.getHours()+24);
  return date > today;
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

function checkIfNaN(num){
  return Number.isNaN(num);
}
function checkYear(year, today){
  if (checkIfNaN(year)){ return false; }
  return true;
}
function checkMonth(month, today){
  if (checkIfNaN(month)){ return false; }
  if (month < 1 || month > 12 ){ return false; }
  return true;
}
function checkDay(day, month, year){
  if (checkIfNaN(day)){ return false; }
  let constDate = new Date(Date.UTC(year, month, 0, 0, 0, 0));
  console.log(day, constDate, constDate.getDate())
  if (day < 0 || day > constDate.getDate() ){ return false; }
  return true;
}
function checkHour(hour, today){
  if (checkIfNaN(hour)){ return false; }
  if (hour < 0 || hour >= 24 ){ return false }
  return true;
}
function checkMinutes(minutes, today){
  if (checkIfNaN(minutes)){ return false; }
  if (hour < 0 || minutes >= 60 ){ return false }
  return true;
}

function checkDateRequirements(date, today){
  let paddedDate = today
  paddedDate.setHours(paddedDate.getHours() + 24);
}







// - - - - - - - - - - - - - - - - - - - -
// ROUTES
// - - - - - - - - - - - - - - - - - - - -

async function getBookableDays(req, res) {
  console.log(req.query)
  // Validate querys
  const today = new Date();
  if (
    !checkYear(+req.query.year, today) ||
    !checkMonth(+req.query.month, today)
  ){
    res.send({
      "success": false,
      "days": "Invalid input"
    });
    return
  }

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
  console.log(req.query)
  // Validate querys
  const today = new Date();
  if (
    !checkYear(+req.query.year, today) ||
    !checkMonth(+req.query.month, today) ||
    !checkDay(+req.query.day, +req.query.month, +req.query.year)
  ){
    res.send({
      "success": false,
      "days": "Invalid input"
    });
    return
  }
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