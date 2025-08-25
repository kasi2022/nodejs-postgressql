require('dotenv').config();
const pool = require('../pg');
const main = require('../nodemail');
const express = require('express');
const router = express.Router();
const bodyparser = require('body-parser');
const {body,validationResult} = require('express-validator');
const mailBuilder = require('../mailBuilder');
const {generateOTP, orouter} = require('../otp');

const custavail = async (ucode) => {
    
    let sel = "select 1 from sacatalog.customers where primecontactnum = $1 union select 1 from sacatalog.customers where email = $1";
    
    let qry = await pool.query(sel,[ucode]);
    
    if(qry.rows.length > 0) {
        return true;
        }
    else{
        return false;
    }
    
};

let validationSchema = [
     body('email').notEmpty()
                 .withMessage("Email cannot be empty")
                 .isEmail()
                 .withMessage("Please enter a valid e-mail ID")];

router.post('/register', async (req, res) => {

    /*const errors = validationResult(req);
    
    if (!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }*/
    try {
   
    let cfname = req.body.cfname;
    let cmname = req.body.cmname;
    let clname = req.body.clname;
    let corg = req.body.corg;
    let mobile = req.body.mobile;
    let email = req.body.email;
    let ctime = new Date();
    let aflag = '0';
    let rflag = '1';

    let ucode = mobile||email;

    const uavail = await custavail(ucode);

    if (!uavail){
        let uadd = await pool.query('INSERT INTO sacatalog.customers (cfname, cmname, clname, corg, primecontactnum, email, creationdate, activeflag, reqflag) VALUES($1,$2,$3,$4,$5,$6,$7,$8, $9) RETURNING custid',[cfname, cmname, clname, corg, mobile, email, ctime, aflag, rflag]);
	    let custid = uadd.rows[0].custid;
        const otp = await generateOTP(custid);
        const subject = "Here's your OTP for registration";
        const ttext = process.env.otptemplate;

        let mtext = mailBuilder({cfname : cfname, clname : clname, otp : otp}, ttext);

        await main({email : email, subject : subject, text : mtext});

            res.status(200).json({
                    success : true,
                    custid : custid,
                    message : "check email for otp message"
                    });
    }
    else{
        res.status(400).json({
            success : false,
            message : "Customer already exists"    
        });
    }        
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to receive resgistration request"
        })        
    }


});

router.put('/confirm/:custid/:otp', async (req, res) => {

    let custid = req.params.custid;
    let otp = req.params.otp;
    let ointerval = process.env.otpinterval;

    try {
        
    let uadd = await pool.query('select sacatalog.otpcheckfn($1,$2,$3)', [String(custid), String(otp), ointerval]);
	
	if (uadd.rows[0].otpcheckfn.success) {
        let cadd = await pool.query('UPDATE sacatalog.customers SET activeflag = $2 WHERE custid = $1', [custid, '1']);
		let ueml = await pool.query('select cfname, clname, email from sacatalog.customers where custid = $1',[custid]);
		let email = ueml.rows[0].email;
		let cfname = ueml.rows[0].cfname;
		let clname = ueml.rows[0].clname;
		const ttext = process.env.crctemplate;
		let subject = "Confirmation of Registration with SAFire";
		let mtext = mailBuilder({cfname : cfname, clname : clname}, ttext);

		await main({email : email, subject : subject,text : mtext});
	    
	    res.status(200).json({success : true, message : uadd.rows[0].otpcheckfn.message});
        } else {
	        res.status(400).json({
        	success : false,
            message : uadd.rows[0].otpcheckfn.message
		})
	}
    
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to confirm the customer"
        })        
  
    }
});

router.get('/:custid', async (req, res) => {

    try {
        let custid = req.params.custid;
    
        let uadd = await pool.query('SELECT custid, cfname, cmname, clname, corg, email, primecontactnum FROM sacatalog.customers WHERE custid = $1',[custid]);
    
        res.status(200).json(uadd.rows);
            
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to fetch the details of the customer"
        })        
    }        
});

router.put('/:custid', async (req, res) => {

    try {
        let custid = req.params.custid;
        let cfname = req.body.cfname;
        let cmname = req.body.cmname;
        let clname = req.body.clname;
        let corg = req.body.corg;
    
        let uadd = await pool.query('UPDATE sacatalog.customers SET cfname = $2, cmname  = $3, clname = $4, corg = $5 WHERE custid = $1',[custid, cfname, cmname, clname, corg]);
    
        res.status(200).json({success : true, message : "Name of the customer updated"});
            
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update the name of the customer"
        })        
    }
        
});

router.delete('/:custid', async (req, res) => {
    
    try {
        let custid = req.params.custid;
 
        let uadd = await pool.query('UPDATE sacatalog.customers SET activeflag = $2 WHERE custid = $1',[custid, '0']);
    
        res.status(200).json({success : true, message : "Customer is no longer active"});
            
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to deactivate customer"
        })        
    }        

} );

router.get('/identity/:ucinfo', async (req, res) => {
    try {
            const ucinfo = req.params.ucinfo;

            let sel = "select custid from sacatalog.customers where primecontactnum = $1 union select custid from sacatalog.customers where email = $1";
            
            let qry = await pool.query(sel,[ucinfo]);

            res.status(200).json(qry.rows);    

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the customer id for the contact information provided"
        })                
    }
});

module.exports = router;