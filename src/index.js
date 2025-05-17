// index.js
const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./route');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/webhook', routes);

app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
