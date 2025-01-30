if (process.env.NODE_ENV != "production") {
    require("dotenv").config();  // Ensure this is properly loading environment variables
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const method_override = require("method-override");
const ejs_mate = require("ejs-mate");
const express_error = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const listing_router = require("./routes/listing.js");
const review_router = require("./routes/review.js");
const user_router = require("./routes/user.js");

main()
    .then(() => {
        console.log("MongoDB connection successful");
    })
    .catch((err) => {
        console.log("Error connecting to MongoDB:", err);
    });

async function main() {
    await mongoose.connect('mongodb+srv://TRY_OWN:2005@cluster0.6hhoa.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(method_override("_method"));
app.engine("ejs", ejs_mate);
app.use(express.static(path.join(__dirname, "/public")));

// Mongo session store
const store = MongoStore.create({
    mongoUrl: 'mongodb+srv://TRY_OWN:2005@cluster0.6hhoa.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0',
    crypto: {
        secret: process.env.SECRET || 'yourSecretKeyHere',  // Use the environment variable or a fallback string
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("Error in MongoDB session store:", err);
});

// Session and flash settings
const sessionOptions = {
    store,
    secret: process.env.SECRET || 'yourSecretKeyHere',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,  // Session expiry time
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to pass current user and flash messages to all views
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;  // Make sure this is set
    next();
});

// Routes
app.use("/listings", listing_router);
app.use("/listings/:id/reviews", review_router);
app.use("/", user_router);

// 404 error handling
app.all("*", (req, res, next) => {
    next(new express_error(404, "PAGE NOT FOUND"));
});

// General error handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!!" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

// Server listening
const port = 3000;
app.listen(port, () => {
    console.log("App is listening on port:", port);
});
