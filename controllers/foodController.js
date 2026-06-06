import foodModel from "../models/foodModel.js";

//  add food item — image stored as base64 data URL (Vercel has no persistent disk)
const addFood = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: "Image file is required" });
    }
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const food = new foodModel({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      image: base64Image,
      category: req.body.category,
    });
    await food.save();
    res.json({ success: true, message: "Food added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};

// all food list
const listFood = async (req, res) => {
  try {
    const foods = await foodModel.find({});
    res.json({ success: true, data: foods });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};

// remove food item
const removeFood = async (req, res) => {
  try {
    await foodModel.findByIdAndDelete(req.body.id);
    res.json({ success: true, message: "Food removed successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};

// get single food by id
const getFoodById = async (req, res) => {
  try {
    const food = await foodModel.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found' });
    res.json({ success: true, data: food });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error' });
  }
};

export { addFood, listFood, removeFood, getFoodById };
