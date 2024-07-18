if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');  // Add this line
const { SpacesServiceClient } = require('@google-apps/meet').v2;
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3001;
const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'];

function getOAuth2Client() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = JSON.parse(process.env.GOOGLE_TOKEN);
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

const oauth2Client = getOAuth2Client();

async function createSpace(authClient) {
  const meetClient = new SpacesServiceClient({
    authClient: authClient
  });
  const request = {};
  const response = await meetClient.createSpace(request);
  return response[0].meetingUri;
}

// Redirect root to /api/create-meet
app.get('/', (req, res) => {
  res.redirect('/api/create-meet');
});

// Keep the original root route as a separate endpoint
app.get('/home', (req, res) => {
  res.send('Express server is running');
});
app.use(cors());
app.get('/api/create-meet', async (req, res) => {
  try {
    const meetUrl = await createSpace(oauth2Client);
    res.json({ meetUrl });
  } catch (error) {
    console.error('Error creating Meet URL:', error);
    res.status(500).json({ error: 'Failed to create Meet URL' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Visit http://localhost:${port}/api/create-meet to create a Google Meet URL`);
});