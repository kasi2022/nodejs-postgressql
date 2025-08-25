const pool = require('./pg');
const exp = require('express');
const router = exp.Router();
const mailBuilder = require('./mailBuilder');
const main = require('./nodemail');

const generateOTP = async (custid)=>{
    const length = 6
    const characters = '0123456789'

    let otp = ''
    for (let o=0; o<length; o++) {
        const getRandomIndex = Math.floor(Math.random() * characters.length);
        otp += characters[getRandomIndex];
    }

    let uadd = await pool.query('INSERT INTO sacatalog.otp (custid, otp) values ($1, $2)',[custid, otp]);

    return otp;
};

router.get('/otprequest/:custid/:cxt', async (req, res) => {
    try {
        let cls = ""; 
        if (cxt === "crc") {
            cls = "registration";
        } else
        if (cxt === "qrc"){
            cls = "submission of quotation request";
        }

        let ueml = await pool.query('select cfname, clname, email from sacatalog.customers where custid = $1)',[custid]);
        let email = ueml.rows[0].email;
        let cfname = ueml.rows[0].cfname;
        let clname = ueml.rows[0].clname;
        const otp = await generateOTP(custid);
        const ttext = process.env.orstemplate;
        let subject = "OTP has been resent to you";
        let mtext = mailBuilder({cfname : cfname, clname : clname, otp : otp, cls : cls}, ttext);

        await main({email : email, subject : subject,text : mtext});
                
        res.status(200).json({success : true, message : "OTP has been. Please check your email"});

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to resend OTP"
        })                
    }
});

module.exports = {generateOTP,
                  router
                };
