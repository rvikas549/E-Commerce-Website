// Packages
import express from "express";
import pg from "pg";
import env from "dotenv";
import bodyParser from "body-parser";
import multer from "multer";
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import fs from "fs";
import path from "path";
import { log } from "console";
import bcrypt from 'bcryptjs';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import sendOrderConfirmation from './emailService.js';


// Database Connection
// env.config();
// const db = new pg.Client({
//     user: process.env.PG_USER,
//     host: process.env.PG_HOST,
//     database: process.env.PG_DATABASE,
//     password: process.env.PG_PASSWORD,
//     port: process.env.PG_PORT,
// });
// db.connect();






// Load environment variables
env.config();
const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Render's managed PostgreSQL
    },
});

// Connect to the database
db.connect()
    .then(() => console.log("✅ Connected to PostgreSQL database!"))
    .catch(err => console.error("❌ Database connection error:", err));

export default db;  // ✅ Correct ES Module Export









// Run Server
const app = express();
const port = 3000;

// Image upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set("views", "./views");

// Error Handler
app.get('/favicon.ico', (req, res) => res.status(204).end());


//Email Service
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());




/////Google Login/////
// Session Configuration for Passport
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Configuration for Google OAuth
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;

                // Check if the user exists in the database
                const result = await db.query("SELECT * FROM users WHERE email = $1", [
                    email,
                ]);
                if (result.rows.length === 0) {
                    // If user doesn't exist, add them
                    await db.query("INSERT INTO users (email) VALUES ($1)", [email]);
                }

                return done(null, { email });
            } catch (err) {
                console.error("Error during Google authentication", err);
                return done(err);
            }
        }
    )
);

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
    done(null, user.email);
});
passport.deserializeUser(async (email, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            done(null, { email });
        } else {
            done(null, false);
        }
    } catch (err) {
        done(err);
    }
});









//////Page Routes/////

// Home Page
app.get("/", async (req, res) => {
    try {
        res.render("index.ejs");
    } catch (err) {
        console.log(`Cannot Render Home Page`, err);
    }
});



////Mens////
// Menswear Page
app.get("/mens", (req, res) => {
    try {
        res.render("mens.ejs");
    } catch (err) {
        console.log(`Cannot Render Mens Page`, err);
    }
});

// Mens-Oversized Page
app.get("/menoversized", (req, res) => {
    try {
        res.render("mens_oversized.ejs");
    } catch (err) {
        console.log(`Cannot Render Mens Page`, err);
    }
});

// Mens-OldMoney Page
app.get("/oldmoney", (req, res) => {
    try {
        res.render("mens_oldmoney.ejs");
    } catch (err) {
        console.log(`Cannot Render Mens Page`, err);
    }
});

// Mens-Traditional Page
app.get("/mentraditional", (req, res) => {
    try {
        res.render("mens_traditional.ejs");
    } catch (err) {
        console.log(`Cannot Render Mens Page`, err);
    }
});



////Womens////
// Womenswear Page
app.get("/womens", async (req, res) => {
    try {
        res.render("womens.ejs");
    } catch (err) {
        console.log(`Cannot Render Womens Page`, err);
    }
});

// Womenswear-top Page
app.get("/womenstop", async (req, res) => {
    try {
        res.render("womens_top.ejs");
    } catch (err) {
        console.log(`Cannot Render Womens Page`, err);
    }
});

// Womenswear-Oversized Page
app.get("/womensoversized", async (req, res) => {
    try {
        res.render("womens_oversized.ejs");
    } catch (err) {
        console.log(`Cannot Render Womens Page`, err);
    }
});

// Womenswear-printedShirt Page
app.get("/womensprinted", async (req, res) => {
    try {
        res.render("womens_printed.ejs");
    } catch (err) {
        console.log(`Cannot Render Womens Page`, err);
    }
});







/////Resell Page/////
app.get("/resell", async (req, res) => {
    try {
        res.render("resell.ejs");
    } catch (err) {
        console.log(`Cannot Render Resell Page`, err);
    }
});

// Refurbished Page Hit Route
app.post("/addresell", upload.single("resellImg"), async (req, res) => {
    try {
        const resellImg = req.file.buffer;
        const resellName = req.body["resellName"];
        const resellPrice = req.body["resellPrice"];

        await db.query(
            "INSERT INTO resell (refurbimg, refurbname, refurbprice) VALUES ($1, $2, $3)", 
            [resellImg, resellName, resellPrice]
        );

        res.redirect("/resell");
    } catch (err) {
        console.log(`Error processing resell form:`, err);
        res.status(500).send("Error processing form.");
    }
});

// Function to Get Refurb Items from Database
async function getList() {
    let list = [];
    const result = await db.query("SELECT * FROM resell");
    result.rows.forEach(item => {
        if (item.refurbimg) {
            item.refurbimg = `data:image/jpeg;base64,${item.refurbimg.toString('base64')}`;
        }
        list.push({
            refurbImg: item.refurbimg,
            refurbName: item.refurbname,
            refurbPrice: item.refurbprice,
        });
    });
    return list;
}

// Designer Page Route
app.get("/designer", async (req, res) => {
    try {
        let list = await getList();
        res.render("designer.ejs", {
            List: list,
        });
    } catch (err) {
        console.log(`Cannot Render Designer Page`, err);
        res.status(500).send("Error rendering designer page");
    }
});



/////Cart/////
// Cart Page Route
app.get("/cart", async (req, res) => {
    try {
        res.render("cart.ejs");
    } catch (err) {
        console.log(`Cannot Render Cart Page`, err);
    }
});

// Product Page Route
function generateUniqueId(productName) {
    // Ensure productName is a string before using replace
    if (typeof productName !== 'string') {
        throw new Error('productName must be a string');
    }

    return productName.replace(/\s+/g, '-').toLowerCase(); // Replacing spaces with dashes and converting to lowercase
}

app.get('/product', (req, res) => {
    const { id, name, image, price, sizes } = req.query;

    // Generate a unique ID using the product name (or keep the id passed from the query)
    const productId = id;  // You can use the ID passed directly or generate it if needed

    res.render('product', {
        id: productId,
        name: name,
        image: image,
        price: price,
        sizes: sizes
    });
});

// Add Item to Cart
app.post("/add-to-cart", async (req, res) => {
    try {
        const { id, name, price, quantity, image, size } = req.body;

        // Check for missing details
        if (!id || !name || !price || !quantity || !image || !size) {
            return res.status(400).send("Missing cart item details.");
        }

        // Convert price to a number (strip currency symbols and spaces)
        const numericPrice = parseFloat(price.replace(/[^\d.-]/g, ''));

        // Check if the price is a valid number
        if (isNaN(numericPrice)) {
            return res.status(400).send("Invalid price format.");
        }

        // Check if the item already exists in the cart
        const existingItem = await db.query(
            "SELECT * FROM cart WHERE id = $1 AND size = $2",
            [id, size]
        );

        if (existingItem.rows.length > 0) {
            // If item exists, update the quantity
            await db.query(
                "UPDATE cart SET quantity = quantity + $1 WHERE id = $2 AND size = $3",
                [quantity, id, size]
            );
        } else {
            // Otherwise, insert a new item with the numeric price
            await db.query(
                "INSERT INTO cart (id, name, price, quantity, image, size) VALUES ($1, $2, $3, $4, $5, $6)",
                [id, name, numericPrice, quantity, image, size]
            );
        }

        // res.status(200).send("Item added to cart.");
        res.redirect("/mens");
    } catch (err) {
        console.error("Error adding item to cart:", err);
        res.status(500).send("Error adding item to cart.");
    }
});

// Fetch Cart Items (GET)
app.get("/cart-items", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM cart");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching cart items:", err);
        res.status(500).send("Error fetching cart items.");
    }
});


// Remove Item from Cart (DELETE)
app.delete("/remove-from-cart/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { size } = req.body; // For size-specific removal

        // Make sure size is included in the request body
        if (!size) {
            return res.status(400).send("Size is required to remove the item.");
        }

        // Perform the delete operation
        await db.query("DELETE FROM cart WHERE id = $1 AND size = $2", [id, size]);
        res.status(200).send("Item removed from cart.");
    } catch (err) {
        console.error("Error removing item from cart:", err);
        res.status(500).send("Error removing item from cart.");
    }
});



// Clear the Cart (POST)
app.post("/clear-cart", async (req, res) => {
    try {
        await db.query("DELETE FROM cart");
        res.status(200).send("Cart cleared.");
    } catch (err) {
        console.error("Error clearing cart:", err);
        res.status(500).send("Error clearing cart.");
    }
});




/////Login/////
//Login Page Route
app.get("/login" ,async (req,res)=>{
    try{
        res.render("login.ejs");
    }
    catch(err){
        console.log(`Failed to open Login Page`,err);
    }
});

// Google Login Routes
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        req.session.email = req.user.email;
        res.redirect("/checkout");
    }
);

// Logout Route
app.get("/logout", (req, res) => {
    req.logout(err => {
        if (err) console.error("Error during logout:", err);
        req.session.destroy(); // Destroy session
        res.redirect("/login"); // Redirect to login page
    });
});

//Registration Page Route
app.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send("All fields are required");
        }

        // Hash password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user with the hashed password
        await db.query("INSERT INTO users(email, password) VALUES($1, $2)", [
            email,
            hashedPassword,
        ]);

        // Log the user in after registration (set session)
        req.session.email = email;

        // Redirect to the checkout page
        res.redirect("/checkout");
    } catch (err) {
        console.error(`Error during registration`, err);
        res.status(400).send("Failed registration");
    }
});




/////Mail-Confirmation/////
//Checkout Route
app.get("/checkout", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.email) {
            return res.redirect("/login");
        }

        // Pass email to the checkout page
        res.render("checkout.ejs", { email: req.session.email });
    } catch (err) {
        console.error("Error rendering checkout page:", err);
        res.status(500).send("Error loading checkout page.");
    }
});

//Blog page route
app.get("/blog", async (req, res) => {
    try {
        res.render("blog.ejs");
    } catch (err) {
        console.log(`Cannot Render Cart Page`, err);
    }
});


// Endpoint to send confirmation email
app.get('/invoice', async (req, res) => {
    try {
      const email = req.session?.email;
      if (!email) {
        return res.status(400).json({ message: 'User not logged in.' });
      }
  
      const result = await db.query("SELECT name, price, quantity, size FROM cart;");
      const cartItems = result.rows.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
      }));
  
      console.log('Cart Items:', cartItems);
  
      // Check if cart is empty
      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty.' });
      }
  
      // Calculate total amount
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
  
      console.log('Total Amount:', totalAmount);
  
      // Render the email content
      const emailContent = await ejs.renderFile(
        path.join(__dirname, 'views', 'orderConfirmation.ejs'),
        {
          customerName: email, // Assuming email is used as customer name for now
          orderDetails: cartItems,
          totalAmount,
        }
      );
  
      // Send the email
      await sendOrderConfirmation(email, 'Order Confirmation', emailContent);
      
      await db.query("DELETE FROM cart ");

      // Respond with success
      res.redirect('/checkout');
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Failed to send email.' });
    }
  });
  


// Start Server
app.listen(port, () => {
    console.log(`Listening on Port ${port}...`);
});
