import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_document, value) => {
    delete value.passwordHash;
    delete value.__v;
    value.id = String(value._id);
    delete value._id;
    return value;
  },
});

const User = mongoose.model("User", userSchema);

export { User };
