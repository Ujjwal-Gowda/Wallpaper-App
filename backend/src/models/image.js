import mongoose from "mongoose";
  
const imageSchema=new mongoose.Schema({
    url:{
        type:String,
        required:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    publicID:{
        type:String,
        required:true,
    },
    Title:{
        type:String,
        trim:true,
    },
    tags:[{
        type:String,
    }],
},{timestamps:true});

imageSchema.index({ Title: "text" });
imageSchema.index({ tags: 1 });

imageSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Image=mongoose.model("Image",imageSchema);