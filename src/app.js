const express = require('express');
const { getUsersWithPostCount } = require('./controllers/user.controller');

const app = express();
// const port = process.env.PORT || 6000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/users', getUsersWithPostCount);

module.exports = app;


// app.listen(port , () => {
//     console.log(`server is listening to port ${port}`);

// })