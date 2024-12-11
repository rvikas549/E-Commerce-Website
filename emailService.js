//Packages
import nodemailer from 'nodemailer';


// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vikasxgowda@gmail.com',
    pass: 'clzwuhsedqmyrwsd',   
  },
});

// Function to send an email
const sendOrderConfirmation = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: 'vikasxgowda@gmail.com', // Sender's email
    to : to,                           // Recipient's email
    subject:'This is message from nodejs',                  
    html: htmlContent,          
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
};

export default sendOrderConfirmation;