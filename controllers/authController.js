const userModel = require("../models/user-model");
const bcrypt = require('bcrypt');

const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");



module.exports.registerUser = async function (req, res) {
    try {
        // Destructure the request body
        let { email, password, fullname } = req.body;

        // Check if the user already exists
        let user = await userModel.findOne({ email });
        
        if (user) {
            req.flash("error", "You already have an account, please login");
            return res.redirect("/");  // Stop further execution
        }

        // Generate salt and hash the password using async/await
        const salt = await bcrypt.genSalt(10); // Generate salt
        const hash = await bcrypt.hash(password, salt); // Hash the password

        // Create the user in the database
        user = await userModel.create({
            email,
            password: hash,
            fullname
        });

        // Generate a token for the user and set it as a cookie
        const token = generateToken(user);
        res.cookie("token", token);

        // Flash success message and redirect to home page
        req.flash("success", "User created successfully");
        return res.redirect("/");

    } catch (err) {
        // Catch and log any errors
        console.log(err.message);
        return res.send("Server error");
    }
};

// Login User
module.exports.loginUser = async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email: email });

        if (user) {
            // Compare the password
            bcrypt.compare(password, user.password, async (err, result) => {
                if (err) {
                    console.log(err.message);
                    return res.send("Error during password comparison");
                }

                if (result) {
                    user.usertype = "user";
                    await user.save();
                    
                    let token = generateToken(user);
                    res.cookie("token", token);
                    return res.redirect("/shop");  // Add return
                } else {
                    req.flash("error", "Email or password incorrect");
                    return res.redirect("/");  // Add return
                }
            });
        } else {
            req.flash("error", "Email or password incorrect");
            return res.redirect("/");  // Add return
        }
    } catch (err) {
        console.log(err.message);
        return res.send("Server error");
    }
};

// Logout User
module.exports.logout = async (req, res) => {
    res.cookie("token", "", { expires: new Date(0) });  // Set the cookie to expire
    return res.redirect("/");  // Add return
};
