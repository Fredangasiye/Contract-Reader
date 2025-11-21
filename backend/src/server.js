const express = require('express');
const app = express();
const port = 8080;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});
