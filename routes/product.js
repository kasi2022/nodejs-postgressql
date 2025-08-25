const express = require('express');
const router = express.Router();
const pool = require('../pg');
const { stringify } = require('uuid');

router.get('/all', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const attqry = await pool.query("SELECT a.attrcode attcode, sacatalog.simpletranslator('attributes', a.attrcode, " + langcode + ") description, a.value, a.uomcode, a.urefcode FROM sacatalog.attributes a inner join sacatalog.tags t on t.tagcode = a.tagcode and t.catitem = TRUE");
        
        res.status(200).json(attqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of products"
        });                
    }
});

router.get('/bycatitemcode/:catitemcode', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const attqry = await pool.query("SELECT a.attrcode" + '"attcode"' + ", sacatalog.simpletranslator('attributes', a.attrcode, " + langcode + "), a.value, a.uomcode, a.urefcode FROM sacatalog.attributes a inner join sacatalog.tags t on t.tagcode = a.tagcode and t.catitem = TRUE and t.tagcode = $1", [req.params.catitemcode]);
        
        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of products for this catelog item"
        })                
    }
});

router.get('/byprodcode/:productcode', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const attqry = await pool.query("SELECT a.attrcode" + '"attcode"' + ", sacatalog.simpletranslator('attributes', a.attrcode, " + langcode + "), a.value, a.uomcode, a.urefcode FROM sacatalog.attributes a where a.attrcode = $1", [req.params.productcode]);
        console.log('hi', attqry.rows);
        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the attribute information"
        })                
    }
});

router.post('/', async (req, res) => {

try {

	let attrdesc = req.body.attrdesc;
	let tagcode = req.body.catitemcode;
	let value = req.body.value;
	let uomcode = req.body.uomcode;
    let urefcode = req.body.urefcode;
	let creationdate = new Date();
   
    if (!req.body.attrcode) {

        const addprdqry = await pool.query("INSERT INTO sacatalog.attributes (attrdesc, tagcode, value, uomcode, creationdate, urefcode) VALUES($1, $2, $3, $4, $5, $6) RETURNING attrcode", [attrdesc, tagcode, value, uomcode, creationdate, urefcode]);

        res.status(200).json(addprdqry.rows);

    }
    else {

        let attrcode = req.body.attrcode;

        const upprdqry = await pool.query("UPDATE sacatalog.attributes SET attrdesc = $2, tagcode = $3, value = $4, uomcode = $5, urefcode = $6 WHERE attrcode = $1", [attrcode, attrdesc, tagcode, value, uomcode, urefcode]);

        res.status(200).json(
            {success : true,
            message : "Product information updated"
            });

    }    
} catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to save changes on the product"
        });
    }
});

router.put('/:productcode', async (req, res) =>{

    try{
        let attrcode = req.params.productcode;
        let attrdesc = req.body.attrdesc;
        let tagcode = req.body.catitemcode;
        let value = req.body.value;
        let uomcode = req.body.uomcode;
        let urefcode = req.body.urefcode;

        const attqry = await pool.query("UPDATE sacatalog.attributes SET attrdesc = $2, tagcode = $3, value = $4, uomcode = $5, urefcode = $6 WHERE attrcode = $1", [attrcode, attrdesc, tagcode, value, uomcode, urefcode]);

        res.status(200).json(
            {success : true,
            message : "Product information updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update product information"
    })
    }

});

router.delete('/:productcode', async (req, res) =>{

    try{
        let attrcode = req.params.productcode;
 
        const attqry = await pool.query("DELETE FROM sacatalog.attributes WHERE attrcode = $1", [attrcode]);

        res.status(200).json({success : true,
                              message : "product entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete product entry"
    })
    }

});

router.get('/producttags/existing/all', async (req, res) => {
    try {
        const attqry = await pool.query("SELECT * FROM sacatalog.producttagstruct");
        console.log(attqry.rows)
        res.status(200).json(attqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the product structure list"
        })                
    }
});

router.get('/producttag/existing/:productcode', async (req, res) => {
    try {
        const attqry = await pool.query("SELECT * FROM sacatalog.producttagstruct where productcode = $1", [req.params.productcode]);
        console.log(attqry.rows);
        res.status(200).json(attqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the tag structure for the product"
        })                
    }
});

router.post('/producttag/new', async (req, res) =>{ 

	let productcode = req.body.productcode;
	let productdesc = req.body.productdesc;
	let taghierarchy = req.body.taghierarchy;

    try{

        const attqry = await pool.query("INSERT INTO sacatalog.producttagstruct VALUES($1, $2, $3) RETURNING productcode", [productcode, productdesc, taghierarchy]);

        res.status(200).json(attqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add tag hierarchy entry"
        })

    }
});

router.put('/producttag/existing/:productcode', async (req, res) =>{

    try{
        let productcode = req.params.productcode;
        let productdesc = req.body.productdesc;
        let taghierarchy = req.body.taghierarchy;

        const attqry = await pool.query("UPDATE sacatalog.producttagstruct SET productdesc = $2, taghierarchy = $3 WHERE productcode = $1", [productcode, productdesc, taghierarchy]);

        res.status(200).json(
            {success : true,
            message : "Product information updated"
            });

   }
   catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update product information"
    })
   }

});

router.delete('/producttag/existing/:productcode', async (req, res) =>{

    try{
        let productcode = req.params.productcode;
 
        const attqry = await pool.query("DELETE FROM sacatalog.producttagstruct WHERE productcode = $1", [productcode]);

        res.status(200).json({success : true,
                              message : "product entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete product tag hierarchy entry"
     })
    }

});

router.get('/prodconfigstructures/all', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const attqry = await pool.query("SELECT * FROM sacatalog.prodconfigstruct");
        
        let iptext = JSON.stringify(attqry.rows);
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
            message : "Unable to fetch the product configuration structure list"
        })                
    }
});

router.get('/prodconfigstructure/existing/:productcode', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        
        const attqry = await pool.query("SELECT * FROM sacatalog.prodconfigstruct where prodcode = $1", [req.params.productcode]);
        
        let iptext = JSON.stringify(attqry.rows);
        let orgtxt = iptext;
        let stpoint = 1;
        let ssspoint = 1; 
        let cdval = '';
        let edpoint = iptext.length;
        let lblarray = [];
        let codearray = [];
        let srcharray = ['tagcode','attcode'];
        let newarr = [];
        let wodarr = [];
        let codarr = [];
                
        for (let i = 0; i < srcharray.length; i++){
            for (let j = 0; j < iptext.length; j++){
                ssspoint = iptext.indexOf(srcharray[i]);
                cdval = iptext.substring(ssspoint + 10, ssspoint + 17);
                if (ssspoint >= 0){
  //                  console.log(cdval);        
                    if (cdval != '') {
                        codearray.push(cdval);
                 }
                    
                    iptext = iptext.substring(ssspoint + 17, iptext.length);
      //              console.log(iptext);
                }

            }
            iptext = orgtxt;
        }
//        console.log(codearray);
//       console.log('"},{"attcode":"A100009"},{"attcode":"A100007"}]}}]'.indexOf('tagcode'));

        let qry = await pool.query("select sacatalog.jsonParser($1, "+ langcode + ")", [codearray]);
        newarr = qry.rows[0].jsonparser;
 
        codarr = [...new Set(codearray)];
        wodarr = [...new Set(newarr)];
 
        if (codarr.length === wodarr.length){
            for (let k = 0; k < codrr.length; k++){
                orgtxt = orgtxt.replaceAll(codarr[k], wodarr[k]);
                
            }
        }

        let tt = JSON.parse(orgtxt);
        //console.log(tt);
        res.status(200).json(tt);
        //console.log(JSON.stringify(attqry.rows[0]));
        //res.status(200).json(attqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the configuration structure for the product"
        })                
    }
});

router.post('/prodconfigstructure/new', async (req, res) =>{ 

	let productcode = req.body.productcode;
	let productdesc = req.body.productdesc;
	let configstruct = req.body.configframework;

    try{

        const attqry = await pool.query("INSERT INTO sacatalog.prodconfigstruct VALUES($1, $2, $3) RETURNING prodcode", [productcode, productdesc, configstruct]);

        res.status(200).json(
            {success : true,
            message : "Product Configuration Structure created"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add product configuration structure"
        })

    }
});

router.put('/prodconfigstructure/existing/:productcode', async (req, res) =>{

    try{
        let productcode = req.params.productcode;
        let productdesc = req.body.productdesc;
        let configframework = req.body.configframework;

        const attqry = await pool.query("UPDATE sacatalog.prodconfigstruct SET configframework = $2 WHERE prodcode = $1", [productcode, configframework]);

        res.status(200).json(
            {success : true,
            message : "Product configuration structure updated"
            });

   }
   catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update product configuration structure"
    })
   }

});

router.delete('/prodconfigstructure/existing/:productcode', async (req, res) =>{

    try{
        let productcode = req.params.productcode;
 
        const attqry = await pool.query("DELETE FROM sacatalog.prodconfigstruct WHERE prodcode = $1", [productcode]);

        res.status(200).json({success : true,
                              message : "product configuration entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete product configuration structure entry"
     })
    }

});

module.exports = router;