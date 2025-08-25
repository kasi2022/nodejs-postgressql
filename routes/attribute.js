const express = require('express');
const router = express.Router();
const pool = require('../pg');

router.get('/all', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        console.log('language', langcode);
        const attqry = await pool.query("SELECT a.attrcode attcode, sacatalog.simpletranslator('attributes', a.attrcode, " + langcode + ") description, a.value, a.uomcode, a.urefcode FROM sacatalog.attributes a");
        console.log(attqry.rows)
        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of attributes"
        })                
    }
});

router.get('/:attrcode', async (req, res) => {
    try {
        let lcode = req.query.langcode;
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;
        const attqry = await pool.query("SELECT a.attrcode" + '"attcode"' + ", sacatalog.simpletranslator('attributes', a.attrcode, " + langcode + ") description, a.value, a.uomcode, a.urefcode FROM sacatalog.attributes a where a.attrcode = $1", [req.params.attrcode]);
        console.log(attqry.rows);
        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of attributes"
        })                
    }
});

router.post('/', async (req, res) =>{

    try{

        let attrdesc = req.body.attrdesc;
        let tagcode = req.body.tagcode;
        let value = req.body.value;
        let uomcode = req.body.uomcode;
        let urefcode = req.body.urefcode;
        let creationdate = new Date();

        const attqry = await pool.query("INSERT INTO sacatalog.attributes (attrdesc, tagcode, value, uomcode, creationdate, urefcode) VALUES($1, $2, $3, $4, $5, $6) RETURNING attrcode", [attrdesc, tagcode, value, uomcode, creationdate, urefcode]);

        res.status(200).json(attqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add attribute entry"
    });
    }

});

router.put('/:attrcode', async (req, res) =>{

    try{
        let attrcode = String(req.params.attrcode);
        let attrdesc = req.body.attrdesc;
        let tagcode = req.body.tagcode;
        let value = req.body.value;
        let uomcode = req.body.uomcode;
        let urefcode = req.body.urefcode;

        const attqry = await pool.query("UPDATE sacatalog.attributes SET attrdesc = $2, tagcode = $3, value = $4, uomcode = $5, urefcode = $6 WHERE attrcode = $1", [attrcode, attrdesc, tagcode, value, uomcode, urefcode]);

        res.status(200).json(
            {success : true,
            message : "Attribute updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update attribute"
    });
    }

});

router.delete('/:attrcode', async (req, res) =>{

    try{
        let attrcode = req.params.attrcode;
 
        const attqry = await pool.query("DELETE FROM sacatalog.attributes WHERE attrcode = $1", [attrcode]);

        res.status(200).json({success : true,
                              message : "attribute entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete attribute entry"
    });
    }

});

router.get('/mappedattributes/:attrcode', async (req, res) =>{
    try {
        let attrcode = req.params.attrcode;

        const attqry = await pool.query("SELECT mappedattrcode FROM sacatalog.attributemappings WHERE attrcode = $1", [attrcode]);

        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to retreive attribute mapping for this attribute code"
    });
        
    }
});

router.get('/attributemappings/:attrcode', async (req, res) =>{
    try {
        let attrcode = req.params.attrcode;

        const attqry = await pool.query("SELECT attrcode FROM sacatalog.attributemappings WHERE mappedattrcode = $1", [attrcode]);

        res.status(200).json(attqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to retreive attribute mapping for this attribute code"
    });
        
    }
});

router.post('/attributemappings/', async (req, res) =>{
    try {
        let attrcode = req.body.attrcode;
        let mappedattrcode = req.body.mappedattrcode;
        
        const attqry = await pool.query("INSERT INTO sacatalog.attributemappings (attrcode, mappedattrcode) VALUES ($1, $2)", [attrcode,mappedattrcode]);

        res.status(200).json({
            success : true,
            message : "Successfully created the attribute mapping"
    });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to create attribute mapping"
     });
    }
});

router.delete('/mapping/attributemappings/', async (req, res) =>{
    try {
        let attrcode = req.body.attrcode;
        let mappedattrcode = req.body.mappedattrcode;
        
        const attqry = await pool.query("DELETE FROM sacatalog.attributemappings WHERE attrcode = $1 AND mappedattrcode = $2", [attrcode, mappedattrcode]);

        res.status(200).json({
            success : true,
            message : "Successfully deleted the attribute mapping"
    });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete the attribute mapping"
     });
    }
});

module.exports = router;