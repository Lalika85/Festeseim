require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    // TODO: Store tokens securely
    res.send('Authentication successful! You can close this window.');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed.');
  }
});

app.get('/events', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = response.data.items;
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events.');
  }
});

// CREATE
app.post('/events', async (req, res) => {
  try {
    const { summary, description, start, end } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const event = {
      summary: summary,
      description: description,
      start: { date: start },
      end: { date: end },
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    res.json({ id: response.data.id });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).send('Error creating event.');
  }
});

// UPDATE
app.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, description, start, end } = req.body;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    // First get the event to keep other properties if needed, or just overwrite
    const event = {
      summary: summary,
      description: description,
      start: { date: start },
      end: { date: end },
    };
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: id,
      resource: event,
    });
    res.json({ id: response.data.id });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).send('Error updating event.');
  }
});

// DELETE
app.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: id,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).send('Error deleting event.');
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
