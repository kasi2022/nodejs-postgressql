require('dotenv').config()
const testinguser = require('./usertestesting/router')
const pool = require('./config/db.config');
const express = require('express')
const app = express()
const format = require('pg-format');
app.use(express.json())


app.use('/testing',testinguser)

app.get('/', async (req, res) => {
    console.log('Welcome to SAFIRE Catalog');
    const qry = await pool.query("select tagcode||' '||tagdesc " + '"tagdata"' +", category from sacatalog.tags");
    console.log(JSON.stringify(qry));
    res.json(JSON.parse('{"title" : "Gautam is Great"}'));
});

app.post('/', async (req, res) => {
    let varr = [];
    let tarr = [];
    
        let iarr = [];
        let carr = [];
        let urarr = [];
        let ucarr = [];
        lcode = req.body.langcode;
        ctxt = req.body.context;
 
        for (let i = 0;i < req.body.details.length;i++){
            console.log(req.body.details[i].logid);
            if(req.body.details[i].logid === ""){
                iarr.push(ctxt, req.body.details[i].refcode, lcode, req.body.details[i].content);
                carr[i] = iarr;
                iarr = [];
             } else{
                urarr.push(req.body.details[i].refcode);
                ucarr.push(req.body.details[i].content)
             }
            }
        console.log('i',carr);
        console.log('ur',urarr);
        console.log('uc',ucarr);
    //let tt = req.body.tagdesc.replace(/\\/g,'');
 /*   for (let i = 0;i < req.body.length;i++){
        varr.push(req.body[i].configdetails.tagdesc, req.body[i].configdetails.category, req.body[i].configdetails.creatorcode);
        tarr[i] = varr;
        varr = [];
    }
    
    let qry = format("INSERT INTO sacatalog.tags (tagdesc, category, creatorcode) VALUES  %L",tarr);
    console.log(qry);*/
   /* qry = "SELECT sacatalog.dummyfn($1)",qry;*/  
    //let cqry = await pool.query(qry) 
    res.json(req.body);
});

const employee = require('./routes/employee');

app.use('/employee', employee);

const catalog = require('./routes/catalog');

app.use('/catalog', catalog);

const customer = require('./routes/customer');

app.use('/customer', customer);

const attribute = require('./routes/attribute');

app.use('/attribute', attribute);

const cart = require('./routes/cart');

app.use('/cart', cart);

const product = require('./routes/product');

app.use('/product', product);

const tag = require('./routes/tag');

app.use('/tag', tag);

const uom = require('./routes/uom');

app.use('/uom', uom);

const language = require('./routes/language');

app.use('/language', language);

const content = require('./routes/content');

app.use('/content', content);



// Insert user
app.post('/add/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and Email required" });
    }

    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Database insert failed" });
  }
});


app.listen(3000, () => (
    console.log('Server listening at Port 3000')
))