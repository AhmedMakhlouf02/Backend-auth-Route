const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail} = require('validator');
const bcrypt = require('bcrypt');
const userSchema = new Schema({
    email: {
      type: String,
      unique: [true, "There is an account attached to this email"],
      required: [true, "email is required"],
      lowercase: true,
      validate: [isEmail, "please Enter a valid email"]
    },
    phoneNumber: {
      type: String,
      unique: [true, "There is an account attached to this phone number"],
      sparse: true
    },
    password: {
      type: String
    },
    name: {
      type: String,
      required: true
    },
    facebookId: {
      type: String
    },
    googleId: {
      type: String
    },
    oneTimePasswordChangeToken: {
      type: String,
      expires: 3600
    }
},{
  timestamps: true
})

userSchema.statics.login = async function(phoneNumber, password){
  const user = await this.findOne({phoneNumber});
  let passwordError = "", phoneNumberError="";
  if (user){
      const auth = await bcrypt.compare(password, user.password);
      if (!auth) passwordError = "Incorrect password";
  }
  else phoneNumberError = "There is no account attached to this phone number";
  return {
      phoneNumberError,
      passwordError,
      user
  };
}

userSchema.statics.changePasswordPermission = async function(userId, token){
  const user = await this.findOne({_id: userId});
  if (user){
    const status = await bcrypt.compare(token, user.oneTimePasswordChangeToken);
    if (!status) return false;
    else return true;
  }
  else return false;
}

userSchema.pre("save", async function (next) {
  if (this.isModified('password')){
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('oneTimePasswordChangeToken') && this.oneTimePasswordChangeToken != ""){
    const salt = await bcrypt.genSalt();
    this.oneTimePasswordChangeToken = await bcrypt.hash(this.oneTimePasswordChangeToken, salt);
  }
  next();
});

module.exports = mongoose.model('user', userSchema);