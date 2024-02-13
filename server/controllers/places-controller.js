const { validationResult } = require("express-validator");
// const fs=require('fs');
const HttpError = require("../Models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../Models/place");
const User = require("../Models/users");
const { default: mongoose } = require("mongoose");

const getPlaceByID = async (req, res, next) => {
  const placeID = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeID);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    return next(new HttpError("Could not find a place with the given id", 404));
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserID = async (req, res, next) => {
  const userID = req.params.uid;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userID).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place with given user ID",
      500
    );
    return next(error);
  }
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places with the given user id", 404)
    );
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invaid inputs passed", 422));
  }

  const { title, desc, address } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    desc,
    url: 'https://tfipost.in/wp-content/uploads/sites/2/2022/02/Place-strategy-4.jpg',
    address,
    location: coordinates,
    creatorID:req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError("Creating place failed.", 500));
  }
  if (!user) {
    return next(
      new HttpError("Could not find user for the provided user ID", 404)
    );
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Place could not be created", 500);
    return next(error);
  }
  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid inputs passed"));
  }
  const placeID = req.params.pid;
  const { title, desc } = req.body;

  let updatedPlace;
  try {
    updatedPlace = await Place.findById(placeID);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update a place.", 500)
    );
  }
  if(updatedPlace.creatorID.toString() !==req.userData.userId){
    return next(
      new HttpError("You are not allowed to edit this place.", 401)
    );
  }
  updatedPlace.title = title;
  updatedPlace.desc = desc;

  try {
    await updatedPlace.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update a place.", 500)
    );
  }

  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeID = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeID).populate("creatorID");
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete a place", 500)
    );
  }
  if (!place) {
    return next(new HttpError("Could not find place for the provided ID", 404));
  }
  if(place.creatorID.id!==req.userData.userId){
    return next(new HttpError("You are not allowed to delete this place", 401));
  }
  // const imagePath=place.url;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creatorID.places.pull(place);
    await place.creatorID.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete a place", 500)
    );
  }
  // fs.unlink(imagePath,err=>{
  //   console.log(err);
  // });
  res.status(200).json({ message: "Deleted Place" });
};

exports.getPlaceByID = getPlaceByID;
exports.getPlacesByUserID = getPlacesByUserID;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
