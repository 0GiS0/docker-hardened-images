const express = require('express');
const path = require('path');
const { buildStatusReport } = require('./lib/runtime-status');
const { buildPageModel } = require('./lib/page-model');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const staticDir = path.join(__dirname, 'app');
const imageFlavor = process.env.IMAGE_FLAVOR || 'unknown';
const startupStatus = buildStatusReport(port);
const pageModel = buildPageModel({ imageFlavor, status: startupStatus });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/status.json', (_req, res) => {
  res.json(startupStatus);
});

app.use(express.static(staticDir));

app.get('/', (_req, res) => {
  res.render('index', pageModel);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Node server listening on ${port}`);
});