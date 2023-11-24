const User = require('../models/user');
const Token = require('../models/Token');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { sendSMS, confirmSMS } = require('../utils/twilioSMS');
const sendEmail = require('../utils/sendEmail');
const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });


// Create Token
const createToken = (email, userId) => {
    let session = '30d';
    return jwt.sign({ email, userId }, process.env.JWT_SECRET, { expiresIn: session });
};



const handleErrors = (err) => {
    let errors = { email : "", password : "", phoneNumber : "", statusCode: { type: Number } };
    //validation failed
    if (err.message.includes("validation failed")){
        Object.values(err.errors).forEach(({properties}) => {
            errors[properties.path] = properties.message;
        });
        errors.statusCode = 400;
    }
    //Email or phone number already exist
    else if (err.code === 11000){
      if (err.message.includes('phone')) {
        errors.phoneNumber =  "There is an account attached to this phone number";
        errors.statusCode = 400;
      }
      if (err.message.includes('email')) {
        errors.email =  "There is an account attached to this email";
        errors.statusCode = 400;
      }
    }
    else return err;
    return errors;
};



const signup = async (req, res) => {
  try{
    const { email, phoneNumber, password, name } = await req.body;
    const newUser = await User.create({ email, phoneNumber, password, name });
    const token = createToken(email, newUser._id);
    res.status(201).json({
      token,
      message: 'User created !',
      name
    });
  } catch(error){
      error = handleErrors(error);
      if (!error.statusCode){
        error.statusCode = 500;
      }
      res.status(error.statusCode).json({ error });
  }
};

const login = async (req, res, next)  => {
try{
  const { phoneNumber, password } = req.body;
  const login = await User.login(phoneNumber, password);
  if (login.phoneNumberError != "") res.status(400).json({ message: login.phoneNumberError });
  else if (login.passwordError != "") res.status(400).json({ message: login.passwordError });
  else {
      const token = createToken(login.user.phoneNumber, login.user._id);
      res.status(201).json({
        token,
        message : "Success !", 
        name: login.user.name
      });
    }
  } catch (error) {
      res.status(error.statusCode).json({ error });
  }
};

const signupWithFacebook = async (req, res) => {
  const { accessToken } = req.body;
  try{
    const response = await axios.get(`https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${accessToken}`);
    const userData = response.data;
    // Extract necessary user data
    const { id, name, email } = userData;
    const user = await User.findOne({ facebookId: id });
    if (user) res.status(400).json({ message: "there is an account attached to this facebook user " })
    else {
      const newUser = await User.create({ email, name, facebookId: id });
      const token = createToken(email, newUser._id);
      res.status(201).json({
        token,
        message: 'User created !',
        name
      }); 
    }
  } catch(error) {
      error = handleErrors(error);
      if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const signupWithGoogle = async (req, res) => {
  const { accessToken } = req.body;
  try{
    const response = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`);
    const userData = response.data;
    // Extract necessary user data
    const { sub, name, email } = userData;
    const user = await User.findOne({ googleId: sub });
    if (user) res.status(400).json({ message: "there is an account attached to this google user " })
    else {
      const newUser = await User.create({ email, name, googleId: sub });
      const token = createToken(email, newUser._id);
      res.status(201).json({
        token,
        message: 'User created !',
        name
      });
    }
  } catch(error) {
      error = handleErrors(error);
      if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const loginWithFacebook = async (req, res) => {
  const { accessToken } = req.body;
  try{
    const response = await axios.get(`https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${accessToken}`);
    const userData = response.data;
    // Extract necessary user data
    const { id, name, email } = userData;
    const user = await User.findOne({facebookId: id});
    if (!user) {
      res.status(404).json({ error: "There is no account attached to this facebook account" })
    }
    else {
      const token = createToken(email, user._id);
      res.status(201).json({
        token,
        message: 'Success !',
        name
      });
    }
  } catch(error) {
      error = handleErrors(error);
      if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const loginWithGoogle = async (req, res) => {
  const { accessToken } = req.body;
  try{
    const response = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`);
    const userData = response.data;
    // Extract necessary user data
    const { sub, name, email } = userData;
    const user = await User.findOne({googleId: sub});
    if (!user) {
      res.status(404).json({ error: "There is no account attached to this google account" })
    }
    else {
      const token = createToken(email, user._id);
      res.status(201).json({
        token,
        message: 'Success !',
        name
      });
    }
  } catch(error) {
      error = handleErrors(error);
      if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const sendToken = async (req, res) => {
  const { info, isPhoneNumber } = req.body;
  try{
    if (isPhoneNumber) {
      const user = await User.findOne({phoneNumber: info});
      if (!user) res.status(404).json ({ message: "There is no account attached to this phone number" });
      else {
        await sendSMS(info);
        res.status(200).json({ message: "OTP sent !", phoneNumber : info });
      }
    }
    else {
      const user = await User.findOne({email: info});
      if (!user) res.status(404).json ({ message: "There is no account attached to this email"});
      else {
        let token = await Token.findOne({ userId: user._id });
        if (token) await token.deleteOne();
        let resetToken = crypto.randomBytes(6).toString("hex");
        token = await Token.create({
          userId: user._id,
          token: resetToken,
          createdAt: Date.now(),
        });
        await sendEmail(user.email , user.name , resetToken);
        res.status(200).json({ message : "Email sent !"});
      }
    }
  } catch(error) {
      if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const confirmToken = async (req, res) => {
  const { info, token, isPhoneNumber } = req.body;
  try{
    if (isPhoneNumber){
      const status = await confirmSMS(info, token);
      const user = await User.findOne({ phoneNumber: info });
      if (!status || user) res.status(400).json({ message: "invalid information" });
      else {
        const oneTimePasswordChangeToken = crypto.randomBytes(6).toString("hex");
        user.oneTimePasswordChangeToken = oneTimePasswordChangeToken;
        await user.save();
        res.status(200).json({
          oneTimePasswordChangeToken,
          message: 'Success !'
        });
      }
    }
    else {
      const user = await User.findOne({ email: info });
      const dbToken = await Token.findOne({ userId: user._id });
      if (!user || !dbToken) res.status(400).json({ message: "invalid information" });
      else {
        const status = await Token.check(user._id, token);
        if (!status) res.status(400).json({ message: "invalid information" });
        else {
          const oneTimePasswordChangeToken = crypto.randomBytes(6).toString("hex");
          user.oneTimePasswordChangeToken = oneTimePasswordChangeToken;
          await user.save();
          res.status(200).json({
            oneTimePasswordChangeToken,
            message: 'Success !'
          });
        }
      }
    }
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
};

const changePassword = async (req, res) => {
  const { info, isPhoneNumber, oneTimePasswordChangeToken, newPassword } = req.body;
  try {
    let user;
    if (isPhoneNumber) user = await User.findOne({ phoneNumber: info });
    else user = await User.findOne({ email: info });
    if (!user) res.status(400).json({ message: "invalid information" });
    else {
      const status = await User.changePasswordPermission(user._id, oneTimePasswordChangeToken);
      if (!status) res.status(400).json({ message: "invalid information" });
      else {
        const token = createToken(user.email, user._id);
        user.password = newPassword;
        user.oneTimePasswordChangeToken = "";
        await user.save();
        res.status(200).json({ token, message: "Success !"});
      }
    }
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
      res.status(error.statusCode).json({ error });
  }
}

module.exports = {
  login,
  signup,
  signupWithFacebook,
  signupWithGoogle,
  loginWithFacebook,
  loginWithGoogle,
  sendToken,
  confirmToken,
  changePassword
};