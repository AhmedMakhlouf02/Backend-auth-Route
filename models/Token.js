const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const tokenSchema = new Schema({
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600,// this is the expiry time in seconds
    },
});

tokenSchema.pre("save", async function (next) {
    const salt = await bcrypt.genSalt();
    this.token = await bcrypt.hash(this.token, salt);
    next();
});

tokenSchema.statics.check = async function(userId, code){
  const token = await this.findOne({ userId });
  if (token){
      const status = await bcrypt.compare(code, token.token);
      if (!status) return false;
      else return true;
  }
  else return false;
}

module.exports = mongoose.model("Token", tokenSchema);