const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config()

// const { connect } = require("./src/helpers/db.helper");

module.exports.connect = () => mongoose.connect(process.env.DB_URL);
module.exports.disconnect = () => mongoose.disconnect();