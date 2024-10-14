const express= require('express');
const mongoose = require('mongoose'); 
const router= express.Router();
const productSchema = require("../models/product-model");
const isloggedin = require("../middlewares/isLoggedIn");
const userModel = require('../models/user-model');
const csrf = require('csurf');

// Initialize CSRF protection
const csrfProtection = csrf({ cookie: true });


router.get("/", (req, res) => {
  let error = req.flash("error"); 
  let success = req.flash("success");
  res.render("index", { error, success, loggedin: false }); 
});


router.get("/shop", isloggedin, async (req,res)=>{
    let products = await productSchema.find();
    let success = req.flash("success");
    res.render('shop',{products,success});
})

router.get("/cart", isloggedin, csrfProtection, async (req, res) => {
  try {
    // Fetch the user and populate the cart
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("cart");

    // Check if the cart is empty
    if (!user || user.cart.length === 0) {
      return res.render('cart', { user, bill: 0, csrfToken: req.csrfToken() });
    }

    // Calculate the total bill for each item in the cart
    let totalBill = 0;

    // Loop through each item in the cart
    user.cart.forEach((item) => {
      const itemPrice = Number(item.price);        // Item's price
      const itemDiscount = Number(item.discount);  // Item's discount
      const quantity = item.quantity || 1;         // Default quantity to 1 if not set

      // Calculate the total for this item (Price - Discount) * Quantity + Platform Fee (₹20)
      const netPrice = (itemPrice - itemDiscount) * quantity + 20;
      totalBill += netPrice;  // Add the item's net price to the total bill
    });

    // Render the cart page with the user data, total bill, and CSRF token
    res.render('cart', { user, bill: totalBill, csrfToken: req.csrfToken() });

  } catch (error) {
    console.error("Error fetching cart: ", error);
    res.status(500).send("Server Error");
  }
});


// removing product form cart
router.get("/discart/:id", isloggedin, async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });

    // Find the index of the product in the cart
    const productIndex = user.cart.indexOf(req.params.id);

    // Check if the product exists in the cart
    if (productIndex > -1) {
      // Remove the product from the cart using splice
      user.cart.splice(productIndex, 1);
      await user.save();
      req.flash("success", "Removed from Cart.");
    } else {
      req.flash("success", "Product not found in cart.");
    }

    res.redirect("/cart");
  } catch (error) {
    console.error(error);
    req.flash(
      "success",
      "An error occurred while removing the product from the cart."
    );
    res.redirect("/shop");
  }
});
router.get("/addtocart/:id", isloggedin, async (req,res)=>{
  let user = await userModel.findOne({email: req.user.email});
    user.cart.push(req.params.id);
   await user.save();
   req.flash("success", "Added to cart");
   res.redirect("/shop");
})

module.exports = router;