import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

export const connectData = async()=>{

    try{
   await mongoose.connect(process.env.MONGO_URL);
   console.log('succefully connect to database');
    }catch(err){
        console.log("failed to connect",err);
    }

}