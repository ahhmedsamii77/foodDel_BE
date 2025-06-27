import Stripe from "stripe";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const palceOrder = async (req, res) => {
  const frontEndUrl = process.env.FRONTEND_URL;
  try {
    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing!");
      return res.json({
        success: false,
        message: "Payment configuration error",
      });
    }

    // Log the request data for debugging
    console.log("Order request data:", {
      userId: req.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });

    // Create new order
    const newOrder = new orderModel({
      userId: req.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });

    await newOrder.save();

    // Clear user's cart
    await userModel.findByIdAndUpdate(req.userId, { cartData: {} });

    // Create line items for Stripe
    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency: "EGP",
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    // Add delivery charges
    line_items.push({
      price_data: {
        currency: "EGP",
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: 5000,
      },
      quantity: 1,
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${frontEndUrl}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontEndUrl}/verify?success=false&orderId=${newOrder._id}`,
    });

    // Return success with session URL
    res.json({ success: true, session_url: session.url });
  } catch (error) {
    // Detailed error logging
    console.log("Error details:", error);

    // Return specific error message based on error type
    if (error.type === "StripeCardError") {
      res.json({ success: false, message: "Payment failed: " + error.message });
    } else if (error.name === "ValidationError") {
      res.json({
        success: false,
        message: "Invalid order data: " + error.message,
      });
    } else {
      res.json({
        success: false,
        message: error.message || "Error processing order",
      });
    }
  }
};
const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    if (success == "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      res.json({ success: true, message: "Paid" });
    } else {
      await orderModel.findByIdAndDelete(orderId, { payment: true });
      res.json({ success: false, message: "Not Paid" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};
// const userOrders = async (req, res) => {
//   try {
//     // Use req.userId from auth middleware instead of req.body.userId
//     const userId = req.userId;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: "User ID is required" });
//     }

//     const orders = await orderModel.find({ userId });

//     if (!orders || orders.length === 0) {
//       return res.status(404).json({ success: false, message: "No orders found for this user" });
//     }

//     res.json({ success: true, orders });
//   } catch (error) {
//     console.log("Error fetching user orders:", error);
//     res.status(500).json({ success: false, message: "Error: " + error });
//   }
// };
export { palceOrder, verifyOrder, userOrders };
