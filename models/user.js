import mongoose from "mongoose"
import bcrypt from "bcrypt"
import validator from "validator"

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
     DP:{
    type:String,
  },
  IsAdmin:{
    type:Boolean,
    default:false,
  },
//  adding address feild
address:{
  type:String
},
// adding feilds for reset password
resetotp:{
  type:String,
  default:"",
},
resetOtpExpiresAt:{
  type:Number,
  default:0,
},

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid email"],
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// module.exports = mongoose.model("User", UserSchema);
export const UserModel=mongoose.model("User",UserSchema)
