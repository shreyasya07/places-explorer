const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../Models/http-error");

const User = require("../Models/users");

const showAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not show users.", 500)
    );
  }
  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid user details", 422));
  }
  const { name, email, password } = req.body;
  let hasUser;
  try {
    hasUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Signup failed.", 500));
  }
  if (hasUser) {
    return next(new HttpError("User already registered. Login Instead", 422));
  }
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user.", 500);
    return next(error);
  }
  const createdUser = new User({
    name,
    email,
    password:hashedPassword,
    image: 'https://t3.ftcdn.net/jpg/05/53/79/60/360_F_553796090_XHrE6R9jwmBJUMo9HKl41hyHJ5gqt9oz.jpg',
    places: [],
  });
  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("User could not be registered", 500);
    return next(error);
  }
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("User could not be registered", 500);
    return next(error);
  }
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let loginUser;
  try {
    loginUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Login failed.", 500));
  }
  if (!loginUser) {
    const error = new HttpError(
      "Could not find the user. Wrong credentials.",
      403
    );
    return next(error);
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, loginUser.password);
  } catch (err) {
    const error = new HttpError("Could not log you in", 401);
    return next(error);
  }
  if (!isValidPassword) {
    const error = new HttpError(
      "Could not find the user. Wrong credentials.",
      403
    );
    return next(error);
  }
  let token;
  try {
    token = jwt.sign(
      { userId: loginUser.id, email: loginUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging in failed", 500);
    return next(error);
  }
  res.status(201).json({
    userId:loginUser.id,
    email:loginUser.email,
    token:token
  });
};

exports.showAllUsers = showAllUsers;
exports.signup = signup;
exports.login = login;
