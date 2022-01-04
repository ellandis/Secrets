//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

//basic encryption
// const encrypt = require("mongoose-encryption");

//md5 encryption
// const md5 = require("md5");

//bcrypt
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

//very important where you place this
//1st
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//Google oauth20 setup
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

//github probs

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
     extended: true
}));

app.use(session({
     secret: "Our Little secret.",
     resave: false,
     saveUninitialized: false
}));

//2nd
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
     useNewUrlParser: true
});
// mongoose.set("useCreateIndex",true);

//this is a mongoose style Schema
const userSchema = new mongoose.Schema({
     // email: {
     //      type: String,
     //      required: true
     // },
     // password: {
     //      type: String,
     //      required: true
     // }
     email: String,
     password: String,
     googleId: String,
     secret: String
});

//3rd
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



// basic encryption
//do this before model is set for mongoose-encryption
// userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ['password']});

//model
const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
//4th
passport.use(User.createStrategy());

//local identification for user
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

///Dynamic identification ============Passport serialization and deserialization--------------------------
passport.serializeUser(function(user, done) {
     done(null, user.id);
});

passport.deserializeUser(function(id, done) {
     User.findById(id, function(err, user) {
          done(err, user);
     });
});

//Passport for Google OAuth20 setup----------------------------------------
//structured in order
passport.use(new GoogleStrategy({
          clientID: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          callbackURL: "http://localhost:3000/auth/google/secrets"
     },
     function(accessToken, refreshToken, profile, cb) {
          // console.log(profile);
          User.findOrCreate({
               googleId: profile.id
          }, function(err, user) {
               return cb(err, user);
          });
     }
));


//--------------Home Page setup--------------------
app.get("/", function(req, res) {
     res.render("home");
});

//from passport docs==============================
app.get("/auth/google", passport.authenticate("google", {
     scope: ['profile']
}));

//passport docs =================================
app.get('/auth/google/secrets',
     passport.authenticate('google', {
          failureRedirect: '/login'
     }),
     function(req, res) {
          // Successful authentication, redirect home.
          res.redirect('/secrets');
     });


// -----------------Login page--------------------
app.get("/login", function(req, res) {
     res.render("login");
});

app.get("/register", function(req, res) {
     res.render("register");
});
//
// app.post("/register",function(req,res){
//
//      // Technique 2 (auto-gen a salt and hash):
//      bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//           // Store hash in your password DB.
//           const newUser = new User({
//                email: req.body.username,
//                password: hash
//           });
//           newUser.save(function(err){
//                if(err){
//                     console.log(err);
//                }else{
//                     res.render("secrets");
//                }
//           });
//      });
//      //
//      //how to setup md5 encryption
//      // const newUser = new User({
//      //      email: req.body.username,
//      //      password: md5(req.body.password),//md5 encryption
//      // });
//      // newUser.save(function(err){
//      //      if(err){
//      //           console.log(err);
//      //      }else{
//      //           res.render("secrets");
//      //      }
//      // });
//
//
// });
//
// app.post("/login",function(req,res){
//      const username = req.body.username;
//      const password = req.body.password;
//
//      User.findOne({email: username},function(err,foundUser){
//           if(err){
//                console.log(err);
//           }else{
//                if(foundUser){
//                     // Load hash from your password DB.
//                     bcrypt.compare(password, foundUser.password, function(err,result) {
//                          if(result === true){
//                               res.render("secrets");
//                          }
//                     });
//                          res.render("secrets");
//                     }
//                }
//           });
//
//      // const username = req.body.username;
//      // const password = md5(req.body.password);//md5 encryption
//      //
//      // User.findOne({email: username},function(err,foundUser){
//      //      if(err){
//      //           console.log(err);
//      //      }else{
//      //           if(foundUser){
//      //                if(foundUser.password === password){
//      //                     res.render("secrets");
//      //                }else{
//      //                     console.log(err);
//      //                }
//      //           }
//      //      }
//      // });
//
// });


//this app.post("/register") and app.post("/login") route is for using passport and following node_modules===================================================
//this app.get makes you login first if you try to jump straight to the SECRETS page
app.get("/secrets", function(req, res) {
     // if (req.isAuthenticated()) {
     //      res.render("secrets");
     // } else {
     //      res.redirect("/login");
     // }
     User.find({"secret": {$ne:null}},function(err,foundUsers){
          if(err){console.log(err);}
          else{
               if(foundUsers){
                    res.render("secrets",{usersWithSecrets: foundUsers})
               }
          }
     })
});

app.get("/submit", function(req, res) {
     if (req.isAuthenticated()) {
          res.render("submit");
     } else {
          res.redirect("/login");
     }
});

app.post("/submit",function(req,res){
     const submittedSecret = req.body.secret;
     console.log(req.user.id);

     User.findById(req.user.id, function(err,foundUser){
          if(err){console.log(err);}
          else{
               if(foundUser){
                    foundUser.secret = submittedSecret;
                    foundUser.save(function(){
                         res.redirect("/secrets");
                    });
               }
          }
     });
});

app.post("/register", function(req, res) {
     User.register({
          username: req.body.username
     }, req.body.password, function(err, newUser) {
          if (err) {
               console.log(err);
               res.redirect("/register");
          } else {
               passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
               });
          }
     });
});

app.post("/login", function(req, res) {
     const user = new User({
          username: req.body.username,
          password: req.body.password
     });
     req.login(user, function(err) {
          if (err) {
               console.log(err);
          } else {
               passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
               });
          }
     });
});

app.get("/logout", function(req, res) {
     req.logout();
     res.redirect("/");
});



app.listen(3000, function() {
     console.log("Server running on port 3000");
});
