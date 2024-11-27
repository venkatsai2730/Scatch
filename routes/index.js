const express= require('express');
const mongoose = require('mongoose'); 
const router= express.Router();
const productSchema = require("../models/product-model");
const isloggedin = require("../middlewares/isLoggedIn");
const userModel = require('../models/user-model');
const csrf = require('csurf');
const upload =require ("../config/multer-config");
const productModel =require("../models/product-model");

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


router.get("/monitor", isloggedin, async (req, res) => {
  try {
      const products = await productModel.find();
      res.render("monitor", { products, success: req.flash("success"), error: req.flash("error") });
  } catch (err) {
      console.error(err);
      req.flash("error", "Failed to fetch products.");
      res.redirect("/shop");
  }
});

// Edit Product
router.post("/edit/:id", isloggedin, upload.single('image'), async (req, res) => {
  try {
      const { id } = req.params;
      const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

      // Prepare update object
      const updatedData = {
          name,
          price,
          discount,
          bgcolor,
          panelcolor,
          textcolor,
      };

      // Include image if a new file was uploaded
      if (req.file) {
          updatedData.image = req.file.buffer;
      }

      await productModel.findByIdAndUpdate(id, updatedData);
      req.flash("success", "Product updated successfully.");
      res.redirect("/shop"); // Redirect to admin dashboard after successful update
  } catch (err) {
      console.error(err);
      req.flash("error", "Failed to update product.");

      // Redirect to the update page with the current product ID
      res.redirect(`/product/edit/${req.params.id}`);
  }
});

// Delete Product
router.post("/delete/:id", isloggedin, async (req, res) => {
  try {
      const { id } = req.params;

      await productModel.findByIdAndDelete(id);
      req.flash("success", "Product deleted successfully.");
      res.redirect("/shop");
  } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete product.");
      res.redirect("/shop");
  }
});

router.get("/product/edit/:id", isloggedin, async (req, res) => {
  try {
      const product = await productModel.findById(req.params.id);

      if (!product) {
          req.flash("error", "Product not found.");
          return res.redirect("/shop");
      }

      res.render("edit", { product, success: req.flash("success"), error: req.flash("error") });
  } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load product details.");
      res.redirect("/shop");
  }
});



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