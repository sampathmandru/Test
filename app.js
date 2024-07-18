const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {SpacesServiceClient} = require('@google-apps/meet').v2;
const { auth } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3001;
const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'];
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const token = JSON.parse(process.env.GOOGLE_TOKEN);

// Use these variables instead of reading from files
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function createSpace(authClient) {
  const meetClient = new SpacesServiceClient({
    authClient: authClient
  });
  const request = {};
  const response = await meetClient.createSpace(request);
  return response[0].meetingUri;
}

app.get('/', (req, res) => {
  res.send('Express server is running');
});

app.get('/api/create-meet', async (req, res) => {
  try {
    const authClient = await authorize();
    const meetUrl = await createSpace(authClient);
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
