const twilio = require('twilio');
const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VSID;
const client = twilio(accountSid, authToken);

const sendSMS = async (phoneNumber) => {
  try {
    await client.verify.v2
    .services(verifySid)
    .verifications.create({
       to: phoneNumber,
       channel: "sms" 
      })
    .then((verification) => console.log(verification.status));
    console.log('Success !');
    
  } catch (error) {
    console.log(error);
  }
};

const confirmSMS = async (phoneNumber, OTP) => {
    try {
      await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phoneNumber, code: OTP })
      .then((verification_check) => console.log(verification_check.status));
    } catch(error) {
        console.log(error);
    }
}

module.exports = {
    sendSMS,
    confirmSMS
};