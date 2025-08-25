const express = require('express');
const router = express.Router();
const pool = require('../pg');
const generateOTP = require('../otp');
const main = require('../nodemail');
const mailBuilder = require('../mailBuilder');


router.get('/cartitem/:cartid', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        let qry = "SELECT cartitemid, cartid, sacatalog.simpletranslator('attributes', trim(both '" + '"' +"' " + "from json_extract_path(configdetails, 'product', 'attcode')::text), " + langcode + ") product FROM sacatalog.cartitems where cartid = $1"
        
        const ciqry = await pool.query(qry, [req.params.cartid]);
        
        res.status(200).json(ciqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of items in the cart"
        })                
    }
});

router.get('/cartitem/bycartitemid/:cartitemid', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
               
        const ciqry = await pool.query("SELECT cartitemid, cartid,  configdetails FROM sacatalog.cartitems where cartitemid = $1", [req.params.cartitemid]);
        
        let iptext = JSON.stringify(ciqry.rows);
        let orgtxt = iptext;
        let stpoint = 1;
        let ssspoint = 1; 
        let cdval = '';
        let edpoint = iptext.length;
        let lblarray = [];
        let codearray = [];
        let srcharray = ['tagcode', 'attcode'];
        let newarr = [];
        let wodarr = [];
        let codarr = [];
                
        for (let i = 0; i < srcharray.length; i++){
            for (let j = 0; j < iptext.length; j++){
                ssspoint = iptext.indexOf(srcharray[i]);
                cdval = iptext.substring(ssspoint + 10, ssspoint + 17);
                if (ssspoint >= 0) {
                    if (cdval != '') {
                        codearray.push(cdval);
                    }
                }                
               
                iptext = iptext.substring(ssspoint + 17, iptext.length);
            }
            iptext = orgtxt;
        }
        
        let qry = await pool.query("select sacatalog.jsonParser($1, " + langcode + ")", [codearray]);
        newarr = qry.rows[0].jsonparser;
 
        codarr = [...new Set(codearray)];
        wodarr = [...new Set(newarr)];
 
        if (codarr.length === wodarr.length){
            for (let k = 0; k < codearray.length; k++){
                orgtxt = orgtxt.replaceAll(codarr[k], wodarr[k]);
            }
        }

        let tt = JSON.parse(orgtxt);
        
        res.status(200).json(tt);
        
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of items in the cart"
        })                
    }
});


router.post('/cartitem/', async (req, res) =>{

    try{

        let configdetails = req.body.configdetails;
        let quantity = req.body.quantity;
        const ciqry = await pool.query("INSERT INTO sacatalog.cartitems (configdetails, quantity) VALUES($1, $2) RETURNING cartitemid", [configdetails, quantity]);

        res.status(200).json(ciqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add attribute entry"
     })
    }

});

router.put('/cartitem/:cartitemid', async (req, res) =>{

    try{
        let configdetails = req.body.configdetails;
        let quantity = req.body.quantity;
    	let cartitemid = req.params.cartitemid;

        const ciqry = await pool.query("UPDATE sacatalog.cartitems SET configdetails = $1, quantity = $2 WHERE cartitemid = $3", [configdetails, quantity, cartitemid]);

        res.status(200).json(
            {success : true,
            message : "Attribute updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update the cart item"
    })
    }

});

router.delete('/cartitem/:cartitemid', async (req, res) =>{

    try{
        let cartitemid = req.params.cartitemid;
 
        const ciqry = await pool.query("DELETE FROM sacatalog.cartitems WHERE cartitemid = $1", [cartitemid]);

        res.status(200).json({success : true,
                              message : "Cart item entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete cart item entry"
     });
    }

});

router.get('/bycustid/:custid', async (req, res) => {
    try {
        let custid = 'U_' + req.params.custid;
        let cartid = null;        
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const cqry = await pool.query("SELECT sacatalog.fetchcartdetails($1, " + langcode + ")", [custid]);

        res.status(200).json(cqry.rows);


    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete cart entry"
     });        
    }
});

router.get('/bycartid/:cartid', async (req, res) => {
    try {
        
        let custid = null;
        let cartid = 'A_' + req.params.cartid;
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const cqry = await pool.query("SELECT sacatalog.fetchcartdetails($1, " + langcode + ")", [cartid]);

        res.status(200).json(cqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete cart entry"
     });        
    }
});

router.post('/', async (req, res) =>{

    try{

        let cdate = new Date();

        const cartqry = await pool.query("INSERT INTO sacatalog.carts (creationdate) VALUES($1) RETURNING cartid", [cdate]);

        res.status(200).json(
            {success : true,
            message : "Cart added"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to create a cart"
    })
    }

});

router.put('/assoicatecustomer/:cartid/:custinfo', async (req, res) =>{

    try{

	    let cartid = req.params.cartid;
	    let custinfo = req.params.custinfo;
        let custid = '';
        let cdate = new Date();
        let sel = "select custid from sacatalog.customers where primecontactnum = $1 union select custid from sacatalog.customers where email = $1";
        const cqry = (sel,[custinfo]);
        custid = cqry.rows[0].custid;
        const cartqry = await pool.query("UPDATE sacatalog.carts set custid = $1 WHERE cartid = $2", [custid, cartid]);

        res.status(200).json(cartqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update the cart"
    })
    }

});

router.put('/addtocart/:cartid/:cartitemid', async (req, res) =>{

    try{

        let cartid = req.params.cartid;
        let cartitemid = req.params.cartitemid;
        let cdate = new Date();

        const cartqry = await pool.query("UPDATE sacatalog.cartitems set cartid = $1 WHERE cartitemid = $2", [cartid, cartitemid]);

        res.status(200).json(cartqry.rows);

    }

    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add the item to the cart"
    })
    }

});

router.put('/removefromcart/:cartitemid', async (req, res) =>{

    try{

        let cartid = req.params.cartid;
        let cartitemid = req.params.cartitemid;
        let cdate = new Date();

        const cartqry = await pool.query("UPDATE sacatalog.cartitems set cartid = null WHERE cartitemid = $2", [cartid, cartitemid]);

        res.status(200).json(cartqry.rows);

    }

    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to remove the item from the cart"
    })
    }

});

router.put('/requestquote/:cartid', async (req, res) =>{

    try{

        let cartid = req.params.cartid;
        let link = req.params.link;
        let cdate = new Date();

        const cartqry = await pool.query("UPDATE sacatalog.carts set qron = $2 WHERE cartid = $1", [cartid, cdate]);

        let uadd = await pool.query('SELECT c.cfname, c.clname, ec.mail from sacatalog.customers c, carts t where c.custid = t.custid and t.cartid = $1',[cartid]);

        let cfname = uadd.rows[0].cfname;
        let clname = uadd.rows[0].clname;
        let email = uadd.rows[0].email;
        const otp = await generateOTP(custid);
        
        const subject = "Here's your OTP for confirming your Quotation Request";
        const ttext = process.env.qrtemplate;
        
        let mtext = mailBuilder({cfname : cfname, clname : clname, rlink : link, otp : otp}, ttext);
        
        await main({email : email, subject : subject, text : mtext});
        
        res.status(200).json({
                            success : true,
                            message : "check email for otp message"
                     });

        res.status(200).json(cartqry.rows);
    }

    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to make a request for quotation for the items selected"
     });
    }

});

router.put('/requestquoteconfirm/:cartid/:custid/:otp/', async (req, res) => {

    try {
        let cartid = req.params.cartid;
        let custid = req.params.custid;
        let otp = req.params.otp;
        let link = req.query.link;
        let ointerval = process.env.otpinterval;
    
        let uadd = await pool.query('select from sacatalog.otpcheckfn($1,$2,$3)',[custid, otp, ointerval]);
	
        if (uadd.rows[0].otpcheckfn.success) {
            let cadd = await pool.query("UPDATE sacatalog.carts set qrcon = $2 WHERE cartid = $1", [cartid, cdate]);
            let ueml = await pool.query('select cfname, clname, email from sacatalog.customers where custid = $1)',[custid]);
            let email = ueml.rows[0].email;
            
            let cfname = ueml.rows[0].cfname;
            let clname = ueml.rows[0].clname;
            const ttext = process.env.qrctemplate;
            let subject = "Confirmation of Request for Quotation";
            let mtext = mailBuilder({cfname : cfname, clname : clname, rlink : link}, ttext);

            await main({email : email, subject : subject, text : mtext});
            
                res.status(200).json({success : true, message : "Your request for quotation has been submitted"});
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
                message : "Failure to submit the quotation request"
            });        
    
        }
});

router.delete('/:cartid', async (req, res) =>{

    try{

    	let cartid = req.params.cartid;

        const cartqry = await pool.query("DELETE FROM sacatalog.carts WHERE cartid = $1", [cartid]);

        res.status(200).json(cartqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete the cart"
     });
    }

});

module.exports = router;