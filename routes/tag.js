const express = require('express');
const router = express.Router();
const pool = require('../pg');

router.get('/all/', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        let lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode;
        if(lcode === undefined) langcode = lang;
        
        const tagqry = await pool.query("SELECT t.tagcode, sacatalog.simpletranslator('tags', t.tagcode, " + langcode + ") description, t.category FROM sacatalog.tags t where catitem != true");
        console.log(tagqry.rows);
        res.status(200).json(tagqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of tags"
        })                
    }
});

router.get('/:tagcode', async (req, res) => {
    try {
        const tagcode = req.params.tagcode;
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const tagqry = await pool.query("SELECT t.tagcode, sacatalog.simpletranslator('tags', t.tagcode, " + langcode + "), t.category FROM sacatalog.tags t where t.tagcode = $1",[tagcode]);
        
        res.status(200).json(tagqry.rows);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the tag requested for"
        })                
    }
});

router.post('/', async (req, res) =>{

    try{

        let tagdesc = req.body.tagdesc;
        let cdate = new Date();
        let creatorcode = 'GRP';
        let category = req.body.category ;
        let catitem = false;

        const tagqry = await pool.query("INSERT INTO sacatalog.tags (tagdesc, creationdate, creatorcode, category, catitem) VALUES($1, $2, $3, $4, $5) RETURNING tagcode", [tagdesc,cdate, creatorcode, category, catitem]);

        res.status(200).json(tagqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add tag entry"
     })
    }

});

router.put('/:tagcode', async (req, res) =>{

    try{
        let tagcode = req.params.tagcode;
        let tagdesc = req.body.tagdesc;
        let category = req.body.category ;

        const tagqry = await pool.query("UPDATE sacatalog.tags SET tagdesc = $2, category = $3 WHERE tagcode = $1", [tagcode, tagdesc, category]);

        res.status(200).json(
            {success : true,
            message : "Tag updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update tag"
    });
    }

});

router.delete('/:tagcode', async (req, res) =>{

    try{
        let tagcode = req.params.tagcode;
 
        const taxqry = await pool.query("DELETE FROM sacatalog.tags WHERE tagcode = $1", [tagcode]);

        res.status(200).json({success : true,
                              message : "tag entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete tag entry"
    })
    }

});

module.exports = router;