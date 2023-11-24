const express = require("express");
const dotenv = require("dotenv");
const dbConnection = require("./config/database");
const globalError = require("./middlewares/errorMiddleware");
const authRoutes = require('./routes/authRoute');
const ApiError = require("./utils/ApiError");
const morgan = require("morgan");

// Load config
dotenv.config({ path: "config.env" });

// Connect to database
try {
  dbConnection();
} catch(err) {
  console.log(err);
};

const app = express();

//Middlewares
app.use(express.urlencoded({extended : true}));
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Routes
app.use('/auth', authRoutes);

//Mount Routes
app.use("*", (req, res, next) => {
  next(new ApiError(`Cannot Find This Route: ${req.originalUrl}`, 400));
});

//Error Handling MiddleWare (Global Error Handling)
app.use(globalError);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, (req, res) => {
  console.log(`App Running On Port ${PORT}`);
});

//Handling UnHandldedRejections
process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Errors: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting Down... 😥`);
    process.exit(1);
  });
});
