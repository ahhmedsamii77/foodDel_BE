import userModel from "../models/userModel.js";
import foodModel from "./../models/foodModel.js";

// ➕ Add to cart
const addToCart = async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.userId; // ✅ بدل req.body.userId

    const userData = await userModel.findById(userId);
    if (!userData)
      return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};

    if (!cartData[itemId]) {
      cartData[itemId] = 1;
    } else {
      cartData[itemId] += 1;
    }
    await userModel.findByIdAndUpdate(userId, { cartData });
    res.json({ success: true, message: "Item added to cart successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};
// ➖ Remove from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.userId;

    const userData = await userModel.findById(userId);
    if (!userData)
      return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};

    if (cartData[itemId] > 0) {
      cartData[itemId] -= 1;
      if (cartData[itemId] === 0) {
        delete cartData[itemId];
      }
    }

    await userModel.findByIdAndUpdate(userId, { cartData });
    res.json({ success: true, message: "Item removed from cart successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.userId; // هنا نأخذ الـ userId من الميدل وير (authMiddleware)

    const userData = await userModel.findById(userId);
    if (!userData)
      return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};
    const itemIds = Object.keys(cartData); // Array of food item IDs

    const items = await foodModel.find({ _id: { $in: itemIds } });

    // دمج التفاصيل مع الكمية
    const cartDetails = items.map((item) => ({
      _id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      quantity: cartData[item._id] || 0,
    }));

    res.json({ success: true, cartData: cartDetails });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error" });
  }
};

// 🔁 Update item quantity in cart
const updateCartQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.userId;

    if (quantity < 0)
      return res.json({ success: false, message: "Invalid quantity" });

    const userData = await userModel.findById(userId);
    if (!userData)
      return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};

    if (quantity === 0) {
      delete cartData[itemId];
    } else {
      cartData[itemId] = quantity;
    }

    await userModel.findByIdAndUpdate(userId, { cartData });

    res.json({ success: true, message: "Cart item quantity updated" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error updating quantity" });
  }
};

export { addToCart, removeFromCart, getCart, updateCartQuantity };
