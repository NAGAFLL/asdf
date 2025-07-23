//I am adjusting search history overriding and I need this file
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// CORS setup
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/override', (req, res) => {
    const { url } = req.body;
    res.send({ success: true, url });
});

app.get('/change-location', (req, res) => {
    const location = req.query.loc;
    const locationNames = {
        'ic': 'Iceland',
        'na': 'North America',
        'sa': 'South America',
        'eu': 'Europe',
        'uk': 'United Kingdom',
        'as': 'Asia',
        'ru': 'Russia',
        'oc': 'Oceania'
    };
    
    if (location && locationNames[location]) {
        res.json({ success: true, name: locationNames[location] });
    } else {
        res.status(400).json({ success: false, error: 'Invalid location' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
