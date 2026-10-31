import mongoose from "mongoose";
import { settings } from "./env.js";

const connectDb = () => mongoose.connect(settings.mongo.uri);

const withId = ({ _id, __v, ...doc }) => ({ id: String(_id), ...doc });

export { connectDb, withId };
