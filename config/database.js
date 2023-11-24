const mongoose = require("mongoose");
const dbConnection = async() => {
  await mongoose.connect(process.env.CONNECTION_URL);
  await mongoose.connection.syncIndexes();
  console.log(`DataBase Connected Successfully 💌`);
};

module.exports = dbConnection;
