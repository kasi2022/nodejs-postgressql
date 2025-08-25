require('dotenv').config()
const pool = require('../pg');
const main = require('../nodemail')
const express = require('express')
const router = express.Router()
const uuid = require('uuid');
const bodyparser = require('body-parser');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const cookieparser = require('cookie-parser');
const mailBuilder = require('../mailBuilder');
const jwt = require('jsonwebtoken');


router.use(cookieparser());

router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());

const checkuname = async (ucode) => {

    let sel = "select 1 from sacatalog.employees where mobile = $1 union select 1 from sacatalog.employees where email = $1 union select 1 from sacatalog.employees where ecode = $1";

    let qry = await pool.query(sel, [ucode]);

    if (qry.rows.length > 0) {
        return true;
    }
    else {
        return false;
    }

}

let validationSchema = [
    body('email').notEmpty()
        .withMessage("Email cannot be empty")
        .isEmail()
        .withMessage("Please enter a valid e-mail ID"),
    body('password').isLength({ min: 8 })
        .withMessage("Password cannot be lesser than 8 characters in length")
        .isLength({ max: 15 })
        .withMessage("Password length cannot exceed 15 characters")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i")
        .withMessage("Password needs to have special characters")
]

router.post('/signup', async (req, res) => {

    //const errors = validationResult(req);

    //if (!errors.isEmpty()){
    //  return res.status(400).json({errors: errors.array()});
    // }

    if (req.body.password != req.body.re_password) {

        res.status(400).json({
            success: false,
            message: "Re-entered password does not match the initially entered password"
        })

    }

    let efname = req.body.efname;
    let emname = req.body.emname;
    let elname = req.body.elname;
    let ecode = req.body.ecode;
    let mobile = req.body.mobile;
    let email = req.body.email;
    let ctime = new Date();
    let aflag = '1';

    let lid = uuid.v4();
    let salt = await bcrypt.genSalt(10);
    let pswd = await bcrypt.hash(req.body.password, salt);

    let ucode = mobile || email || ecode;

    const uavail = await checkuname(ucode);

    if (!uavail) {
        let uadd = await pool.query('INSERT INTO sacatalog.employees (efname, emname, elname, ecode, mobile, email, creationdate, activeflag) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING empid, ecode', [efname, emname, elname, ecode, mobile, email, ctime, aflag]);
        let empid = uadd.rows[0].empid;
        console.log(empid);
        let pwd = await pool.query('INSERT INTO sacatalog.passwords VALUES($1,$2,$3,$4)', [lid, empid, pswd, ctime]);

        res.status(200).json(uadd.rows);
    }
    else {
        res.status(400).json({
            success: false,
            message: "User already exists"
        });
    }

})

router.get('/all', verifyToken, async (req, res) => {

    try {

        let uadd = await pool.query('SELECT empid, efname, emname, elname, ecode, email, mobile FROM sacatalog.employees');

        res.json(uadd.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to fetch the details of employees"
        })
    }
});

router.get('/:empid', verifyToken, async (req, res) => {

    try {

        let empid = req.params.empid;

        let uadd = await pool.query('SELECT empid, efname, emname, elname, ecode, email, mobile FROM sacatalog.employees WHERE empid = $1', [empid]);

        res.json(uadd.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to fetch the details of the employee"
        })
    }
});

router.put('/:empid', verifyToken, async (req, res) => {

    try {
        if (res.ulogin === null) return res.sendStatus(403).json({ success: true, message: "Employee needs to log in" });
        let empid = req.params.empid;
        let efname = req.body.efname;
        let emname = req.body.emname;
        let elname = req.body.elname;

        let uadd = await pool.query('UPDATE sacatalog.employees SET efname = $2, emname  = $3, elname = $4 WHERE empid = $1', [empid, efname, emname, elname]);

        res.status(200).json({ success: true, message: "Name of the employee updated" });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to update the name of the employee"
        })
    }
})

router.delete('/:empid', verifyToken, async (req, res) => {

    try {
        let empid = req.params.empid;

        if (res.ulogin === null) return res.sendStatus(403).json({ success: true, message: "Employee needs to log in" });
        let uadd = await pool.query('UPDATE sacatalog.employees SET activeflag = $2 WHERE empid = $1', [empid, "0"]);

        res.status(200).json({ success: true, message: "Employee is no longer active" });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to deactivate employee"
        })
    }
})

router.post('/signin', async (req, res) => {

    try {
        let elogin = req.body.elogin;
        let passwd = req.body.password;

        const usrcheck = await checkuname(elogin);

        if (!usrcheck) {
            res.status(400).json({
                success: false,
                message: "Employee does not exist"
            });
        }

        const pwdqry = await pool.query('select password from sacatalog.passwords where userid = (select empid from sacatalog.employees where mobile = $1 union select empid from sacatalog.employees where email = $1 union select empid from sacatalog.employees where ecode = $1)', [elogin]);
        let sel = "select empid from sacatalog.employees where mobile = $1 union select empid from sacatalog.employees where email = $1 union select empid from sacatalog.employees where ecode = $1";
        const eqry = await pool.query(sel, [elogin]);
        let empid = eqry.rows[0].empid;

        if (pwdqry.rows.length > 0) {

            const validpassword = await bcrypt.compare(passwd, pwdqry.rows[0].password);

            if (validpassword) {
                const options = {
                    httpOnly: true,
                    expiresIn: new Date(Date.now()) + 1 * 60 * 60 * 1000
                }

                const accesstoken = jwt.sign({ userlogin: elogin, empid: empid }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
                const refreshtoken = jwt.sign({ userlogin: elogin, empid: empid }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1h" });

                res.status(200)
                    .cookie('refreshtoken', refreshtoken, options)
                    .json({ accesstoken });

            }
            else {
                res.status(400).json({
                    success: false,
                    message: "You have entered an invalid password"
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: "Password needs to be entered"
            });
        }

    }
    catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to sign in"
        })
    }
})


function verifyToken(req, res, next) {
    try {

        let authHeader = req.headers['authorization'];

        if (authHeader === undefined) {
            res.status(400).json({ success: false, message: "Employee needs to log in" });
            return;
        }
        token = authHeader && authHeader.split(' ')[1];                 //token.replace(/^"(.*)"$/, '$1');
        console.log(token);
        if (token === undefined || token === null) return res.status(401).res.json({ message: "User needs to log in" });
        
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
            if (error) return res.status(403).json({ error: "jo" });
            res.ulogin = user.elogin;
            res.empid = user.empid;
            console.log('ulogin ', user);
            next();
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Unable to verify user"
        })
    }
}

router.get('/token/refreshToken', verifyToken, (req, res) => {
    try {
        const token = req.cookies.refreshtoken;

        if (token === null) return res.sendStatus(401).res.json({ message: "User needs to log in" })

        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {

            if (err) return res.sendStatus(403).json({ err: err.message })

            const accessToken = jwt.sign({ userlogin: user.elogin, empid: user.empid }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

            res.json({ accessToken: accessToken })
        })
    } catch (error) {
        res.sendStatus(401).json({ error: error.message })
    }

})

router.delete('/employee/logout', verifyToken, (req, res) => {
    try {
        res.clearCookie('refreshtoken');
        res.json({ success: true, message: "Successfully logged out" })

    } catch (error) {

        res.sendStatus(401).json({ error: error.message })
    }
})

router.post('/resetpassword/:empid/', validationSchema, async (req, res) => {

    try {

        let empid = req.params.empid;
        let passwd = req.body.password;
        const link = req.query.link;
        const subject = "Here's your link for resetting your password";
        const ttext = process.env.rsttemplate;

        const pwdqry = await pool.query('select password from sacatalog.passwords where userid = $1', [empid]);

        if (pwdqry.rows.length > 0) {

            const validpassword = await bcrypt.compare(passwd, pwdqry.rows[0].password);

            if (validpassword) {
                if (req.body.newpassword != req.body.re_password) {

                    res.status(400).json({
                        success: false,
                        message: "Re-entered password does not match the initially entered password"
                    })
                }

                let edata = await pool.query('SELECT efname, elname, email FROM sacatalog.employees WHERE empid = $1', [empid]);

                let efname = edata.rows[0].efname;
                let elname = edata.rows[0].elname;
                let email = edata.rows[0].email;

                let mtext = mailBuilder({ efname: efname, elname: elname, rlink: link }, ttext);

                let mailinfo = { email: email, subject: subject, text: mtext };
                await main(mailinfo);

                res.status(200).json({
                    success: true,
                    message: "check email for the link for confirming your password reset"
                });

            }
            else {
                res.status(400).json({
                    success: false,
                    message: "You have entered an invalid password"
                });
            }

        } else {
            res.status(400).json({
                success: false,
                message: "Password needs to be entered"
            });
        }

    }
    catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to reset password"
        })
    }
})

router.post('/passwordresetconfirm/:empid', async (req, res) => {

    let empid = req.params.empid;

    try {

        let ctime = new Date();
        let aflag = '1';
        let lid = uuid.v4();
        let salt = await bcrypt.genSalt(10);
        let pswd = await bcrypt.hash(req.body.password, salt);

        let pwd = await pool.query('INSERT INTO sacatalog.passwords VALUES($1,$2,$3,$4)', [lid, empid, pswd, ctime]);

        let ueml = await pool.query('select efname, elname, email from sacatalog.employees where empid = $1)', [empid]);

        let email = ueml.rows[0].email;
        let efname = ueml.rows[0].efname;
        let elname = ueml.rows[0].elname;
        const ttext = process.env.prctemplate;
        let subject = "Your password has been reset";
        let mtext = mailBuilder({ efname: efname, elname: elname }, ttext);

        await main({ email: email, subject: subject, text: mtext });

        res.status(200).json({ success: true, message: "Password has been reset" });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to confirm the password reset"
        })

    }
})

router.post('/forgottenpassword/:ecinfo', validationSchema, async (req, res) => {

    try {

        let ecinfo = req.params.ecinfo;
        const rlink = req.query.link;
        const subject = "Here's your link for resetting your password";
        const ttext = process.env.rsttemplate;
        let eqry = await pool.query('SELECT empid FROM sacatalog.employees WHERE email = $1 UNION SELECT empid FROM sacatalog.employees WHERE mobile = $1 UNION SELECT empid FROM sacatalog.employees WHERE ecode = $1', [ecinfo]);
        let empid = eqry.rows[0].empid;

        if (empid !== null) {


            let edata = await pool.query('SELECT efname, elname, email FROM sacatalog.employees WHERE empid = $1', [empid]);

            let efname = edata.rows[0].efname;
            let elname = edata.rows[0].elname;
            let email = edata.rows[0].email;

            let mtext = mailBuilder({ efname: efname, elname: elname, rlink: rlink }, ttext);

            await main({ email: email, subject: subject, text: mtext });

            res.status(200).json({
                success: true,
                message: "check email for otp message"
            });

        } else {
            res.status(200).json({
                success: false,
                message: "Invalid user login info"
            });
        }


    }
    catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: "Failure to reset password"
        })
    }
})


module.exports = router;