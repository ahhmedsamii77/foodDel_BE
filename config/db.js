import mongoose from 'mongoose'
 export const connectDB = async ()=> {
  await mongoose.connect('mongodb+srv://ahmdsami:30102003@cluster0.izxm0jk.mongodb.net/food-del').then(()=>{
    console.log('DB connected');
  });
}