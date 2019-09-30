const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require('express')


// - - - - - - - - - - - - - - - - - - - -
// PARAMETERS
// - - - - - - - - - - - - - - - - - - - -

const SERVER_PORT = 3000
const APPOINTMENT_START_HOUR = 9;
const APPOINTMENT_END_HOUR = 18;
const APPOINTMENT_DURATION_MINUTES = 40;
const APPOINTMENT_BREAK_MINUTES = 5;

// Google API Scope
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
//Token file location from/for Google Auth
const TOKEN_PATH = 'token.json';

const MINUTE_MILLISECONDS = 60000;

// - - - - - - - - - - - - - - - - - - - -
//  GOOGLE API
// - - - - - - - - - - - - - - - - - - - -

// 
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
      let events = res.data.items.map((e) => {
        return({
          startTime: new Date(e.start.dateTime),
          endTime: new Date(e.end.dateTime)
        })
      });
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
// FUNCTIONS - VERIFICATIONS
// - - - - - - - - - - - - - - - - - - - -

//Verification of parameters (checking to see if they are numbers & fit in appropriate ranges)
function checkIfNaN(num){
  return Number.isNaN(num);
}
function checkYear(year){
  if (checkIfNaN(year)){ return false; }
  return true;
}
function checkMonth(month){
  if (checkIfNaN(month)){ return false; }
  if (month < 1 || month > 12 ){ return false; }
  return true;
}
function checkDay(day, month, year){
  if (checkIfNaN(day)){ return false; }
  //Checks for max days (use date to check for leap year)
  let constDate = new Date(Date.UTC(year, month, 0, 0, 0, 0));
  if (day < 0 || day > constDate.getDate() ){ return false; }
  return true;
}
function checkHour(hour){
  if (checkIfNaN(hour)){ return false; }
  if (hour < 0 || hour >= 24 ){ return false }
  return true;
}
function checkMinute(minute){
  if (checkIfNaN(minute)){ return false; }
  if (minute < 0 || minute >= 60 ){ return false }
  return true;
}

//Checks that all parameters exist in the requests
function checkParamsExist(params, keys){
  let missingKeys = keys.filter((k) => !(k in params));
  if (missingKeys.length > 0){
    return false;
  } else {
    return true;
  }
}

//Check if day is a weekday (condition: cannot book on a weekend)
function checkWeekday(date){
  if (0 < date.getDay() && date.getDay() < 6){
    return true;
  } else {
    return false;
  }
}


// - - - - - - - - - - - - - - - - - - - -
// FUNCTIONS - 
// - - - - - - - - - - - - - - - - - - - -

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
    //Do not add if it is less than 24 hours (condition)
    if (check24Hours(constData.endTime)){
      datetime_list.push(constData);
    }
  }
  return(datetime_list);
}

//Verify if date is less than 24 hours from today (set condition for booking)
function check24Hours(date){
  const today = new Date();
  today.setHours(today.getHours()+24);
  return date > today;
}

//Check if a date is inside 2 dates (can't book a start/end within another booking)
function checkIfInsideDates(date, start, end){
  if (start < date && date < end ){
    return true
  } else {
    return false
  }
}

/////////
function checkOusideDates(date, start, end){
  if (start <= date && end <= date || start >= date && end >= date){
    return true
  } else {
    return false
  }
}

//Check all available days on date, and against each event from Google Cal to see if the timeslot is avalible
function checkDateAvailability(event_times, year, month, day){
  let appointmentTimes = getAppointmentTimes(year, month, day);
  
  let availableTimes = appointmentTimes.filter(i => {
    //Add padding break before & after (5 minutes required)
    let adjusted_startTime = new Date(i.startTime.getTime() - (APPOINTMENT_BREAK_MINUTES * MINUTE_MILLISECONDS));
    let adjusted_endTime = new Date(i.endTime.getTime() - (APPOINTMENT_BREAK_MINUTES * MINUTE_MILLISECONDS));
    
    //Verify each events against appointment times
    let checkEvents = event_times.map(e => {
      if (
        checkIfInsideDates(adjusted_startTime, e.startTime, e.endTime) ||
        checkIfInsideDates(adjusted_endTime, e.startTime, e.endTime))
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



//Response error format
function responseError(res, message){
  res.send({
    "success": false,
    "message": message
  })
  return;
}



// - - - - - - - - - - - - - - - - - - - -
// ROUTES
// - - - - - - - - - - - - - - - - - - - -

/*
GET  /days?year=yyyy&month=mm
- - Gets all days with atleast 1 bookable day
*/
async function getBookableDays(req, res) {
  //VERIFICATION: Check params
  if (checkParamsExist(req.query, ['year', 'month']) === false){
    res.send({
      "success": false,
      "days": "Missing param"
    });
    return
  }

  //VERIFICATION: Check param values
  const today = new Date();
  if (
    !checkYear(+req.query.year) ||
    !checkMonth(+req.query.month)
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

  //VERIFICATION: Check if book in past (checks against max date)
  if (today > maxTime){
    responseError(res, "Cannot book time in the past");
    return
  }
  //VERIFICATION: Cannot book with less than 24 hours in advance
  if (check24Hours(maxTime, today) === false){
    responseError(res, "Cannot book with less than 24 hours in advance");
    return
  }

  /* 
  - - PASS STANDARD VERIFICATION
  */

  //Get events from Google Calendar
  let auth = await getAuthCredentials();
  let events = await listEvents(auth, minTime, maxTime);
  
  //Create an array of indices (pre-ES6 from https://stackoverflow.com/a/44957114)
  const rangeDays = Array(maxTime.getDate()).fill(1).map((x, y) => x + y);

  let availableDates = rangeDays.map(i => {
    let getTimesForDate = checkDateAvailability(events, +req.query.year, +req.query.month, i);
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
GET /timeslots?year=yyyy&month=mm&day=dd
- Book date and receive confirmation
*/
async function getTimeSlots(req, res) {
  //VERIFICATION: Check params
  if (checkParamsExist(req.query, ['year', 'month', 'day']) === false){
    responseError(res, "Missing input");
    return
  }

  const today = new Date();
  //VERIFICATION: Check param values
  if (
    !checkYear(+req.query.year) ||
    !checkMonth(+req.query.month) ||
    !checkDay(+req.query.day, +req.query.month, +req.query.year)
  ){
    responseError(res, "Invalid input");
    return
  }
  
  //VERIFICATION: The time slot provided was not on a weekday between 9 am and 5 pm
  if (+(req.query.hour) < APPOINTMENT_START_HOUR && +(req.query.hour) > APPOINTMENT_END_HOUR){
    responseError(res, "Cannot book outside bookable timeframe");
    return
  }
  
  //CHECK: GT then min month/year
  var minTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_START_HOUR, 0, 0));
  var maxTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_END_HOUR, 0, 0));

  //VERIFICATION: Check if book in past
  if (today > maxTime){
    responseError(res, "Cannot book time in the past");
    return
  }
  //VERIFICATION: Cannot book with less than 24 hours in advance
  if (check24Hours(maxTime, today) === false){
    responseError(res, "Cannot book with less than 24 hours in advance");
    return
  }

  /* 
  - - PASS STANDARD VERIFICATION
  */
  
  let auth = await getAuthCredentials();
  let events = await listEvents(auth, minTime, maxTime);
  let availableTimeSlots = checkDateAvailability(events, +req.query.year, +req.query.month, +req.query.day);
  
  res.send({
    "success": true,
    "timeSlots": availableTimeSlots
  });
}


/*
POST  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm
- Book date and receive confirmation
*/
async function bookTimeSlot(req, res) {
  //VERIFICATION: Check params
  if (checkParamsExist(req.query, ['year', 'month', 'day', 'hour', 'minute']) === false){
    responseError(res, "Missing input");
    return
  }
  
  //VERIFICATION: Check param values
  const today = new Date();
  if (
    !checkYear(+req.query.year, today) ||
    !checkMonth(+req.query.month, today) ||
    !checkDay(+req.query.day, +req.query.month, +req.query.year) ||
    !checkHour(+req.query.hour) ||
    !checkMinute(+req.query.minute)
  ){
    responseError(res, "Invalid input"); //correct?
    return
  }
  
  //VERIFICATION: The time slot provided was not on a weekday between 9 am and 5 pm
  if (+(req.query.hour) < APPOINTMENT_START_HOUR && +(req.query.hour) > APPOINTMENT_END_HOUR){
    responseError(res, "Cannot book outside bookable timeframe");
    return
  }

  //Need to create time for testing
  var createDateTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), +(req.query.hour), +(req.query.minute), 0));
  
  //VERIFICATION: Check if book in past
  if (today > createDateTime){
    responseError(res, "Cannot book time in the past");
    return
  }
  
  //VERIFICATION: Cannot book with less than 24 hours in advance
  if (check24Hours(createDateTime, today) === false){
    responseError(res, "Cannot book with less than 24 hours in advance");
    return
  }

  /* 
  - - PASS STANDARD VERIFICATION
  */

  //Get events from Google Calendar
  let auth = await getAuthCredentials();
  var minTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_START_HOUR, 0, 0));
  var maxTime = new Date(Date.UTC(+req.query.year, +(req.query.month)-1, +(req.query.day), APPOINTMENT_END_HOUR, 0, 0));
  let events = await listEvents(auth, minTime, maxTime);
  let availableTimeSlots = checkDateAvailability(events, +req.query.year, +req.query.month, +req.query.day);
  console.log(createDateTime)
  console.log(availableTimeSlots)
  console.log(availableTimeSlots.map((e) => createDateTime - e.startTime))
  console.log(availableTimeSlots.filter((e) => (createDateTime - e.startTime) === 0).length > 0)
  //Check to see if event exists (if dates are same, diffrence should be 0)
  if (availableTimeSlots.filter((e) => (createDateTime - e.startTime) === 0).length > 0){
    //Event space found!
    console.log('woop')
    let googleCalEvent = await createEvent(auth, +req.query.year, +(req.query.month)-1, +(req.query.day), +(req.query.hour), +(req.query.minute))
    
    res.send({
      "success": true,
      "startTime": googleCalEvent.startTime,
      "endTime": googleCalEvent.endTime
    });
    
  } else {
    //No space found
    console.log('boop')
    responseError(res,  "Invalid time slot");
  }
  
}


// - - - - - - - - - - - - - - - - - - - -
// PATHS
// - - - - - - - - - - - - - - - - - - - -

const app = express()

//GET  /days?year=yyyy&month=mm
app.get('/days', (req, res) => getBookableDays(req, res));
//GET  /timeslots?year=yyyy&month=mm&day=dd
app.get('/timeslots', (req, res) => getTimeSlots(req, res));
//POST  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm
app.post('/book', (req, res) => bookTimeSlot(req, res));

app.listen(SERVER_PORT, () => console.log(`Example app listening on port ${SERVER_PORT}!`))