const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });

module.exports = async (req, res, next) => {
  const authHeader = await req.get('Authorization');
  if (!authHeader) {
    return res.status(401).json({message: 'Unauthorized', authHeader});
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(authHeader, process.env.JWT_SECRET);
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    res.status(401).json({message: " Unauthorized"});
  }
};