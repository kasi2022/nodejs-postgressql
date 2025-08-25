require('dotenv').config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host : "smtp.gmail.com",
  port : 465,
  auth : {
    user : process.env.sender,
    pass : process.env.password,
  },
});

const main = async (mailinfo ) => {
  try{

    const maildata = {
      from : process.env.password,
      to : mailinfo.email,
      subject : mailinfo.subject,
      text : mailinfo.text,
    };

    
    
    const info = await transporter.sendMail(maildata);
    
    console.log("Message sent: %s", info.messageId);
  }
  catch{
    console.error;
  }
};


module.exports = main;