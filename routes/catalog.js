const express = require('express');
const router = express.Router();
const pool = require('../pg');

router.get('/catalogitems', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const tagqry = await pool.query("SELECT t.tagcode, sacatalog.simpletranslator('tags', t.tagcode, " + langcode + ") description FROM sacatalog.tags t where t.catitem = true");
        console.log(tagqry.rows);
        res.status(200).json(tagqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the catalog"
        })                
    }
});

router.get('/catalogitem/:itemcode', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const tagqry = await pool.query("SELECT t.tagcode, sacatalog.simpletranslator('tags', t.tagcode, " +  langcode + ") FROM sacatalog.tags t where t.tagcode = $1", [req.params.itemcode]);
        console.log(tagqry.rows);
        res.status(200).json(tagqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of products for this catalog item"
        })                
    }
});

router.post('/catalogitem', async (req, res) =>{

    try{
        let tagdesc = req.body.tagdesc;
        console.log(tagdesc);
        let cdate = new Date();
        let creatorcode = 'GRP';
        let category = 'product';
        let catitem = true;

        const tagqry = await pool.query("INSERT INTO sacatalog.tags (tagdesc, creationdate, creatorcode, category, catitem) VALUES($1, $2, $3, $4, $5) RETURNING tagcode", [tagdesc, cdate, creatorcode, category, catitem]);

        res.status(200).json(tagqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add catalog item entry"
    })
    }

});

router.put('/catalogitem/:itemcode', async (req, res) =>{

    try{
        let tagcode = req.params.itemcode;
        let tagdesc = req.body.tagdesc;
        console.log(tagcode, tagdesc);
        const tagqry = await pool.query("UPDATE sacatalog.tags SET tagdesc = $2 WHERE tagcode = $1", [tagcode, tagdesc]);

        res.status(200).json(
            {success : true,
            message : "Catalog item updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update item details"
    })
    }

});

router.delete('/catalogitem/:itemcode', async (req, res) =>{

    try{
        let tagcode = req.params.itemcode;
 
        const taxqry = await pool.query("DELETE FROM sacatalog.tags WHERE tagcode = $1", [tagcode]);

        res.status(200).json({success : true,
                              message : "item entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete catalog item entry"
    });
    }

});

module.exports = router