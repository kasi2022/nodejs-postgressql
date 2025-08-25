const express = require('express');
const router = express.Router();
const pool = require('../pg');

router.get('/all', async (req, res) => {
    try {
        const umqry = await pool.query("SELECT * FROM sacatalog.uoms");

        res.status(200).json(umqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of UOMs"
        })                
    }
});

router.get('/:uomcode', async (req, res) => {
    try {

        const uomcode = req.params.uomcode;
        const umqry = await pool.query("SELECT * FROM sacatalog.uoms WHERE uomcode = $1", [uomcode]);

        res.status(200).json(umqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch details of the requested UOM"
        })                
    }
});

router.post('/', async (req, res) =>{

    try{

        let uomcode = req.body.uomcode;
        let uomname = req.body.uomname;
        let application = req.body.application;
        let creatorcode = 'GRP';
        let cdate = new Date();

        const umqry = await pool.query("INSERT INTO sacatalog.uoms VALUES($1, $2, $3, $4, $5) RETURNING uomcode", [uomcode, uomname, application, creatorcode, cdate]);

        res.status(200).json(umqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add UOM entry"
    })
    }

});

router.put('/:uomcode', async (req, res) =>{

    try{
        let uomcode = req.params.uomcode;
        let uomname = req.body.uomname;
        let application = req.body.application;

        const umqry = await pool.query("UPDATE sacatalog.uoms SET uomname = $2, application = $3 WHERE uomcode = $1", [uomcode, uomname, application]);

        res.status(200).json({success : true,
                              "message" : "UOM updated"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update UOM"
    })
    }

});

router.delete('/:uomcode', async (req, res) =>{

    try{
        let uomcode = req.params.uomcode;
 
        const umqry = await pool.query("DELETE FROM sacatalog.uoms WHERE uomcode = $1", [uomcode]);

        res.status(200).json({success : true,
                              message : "UOM entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete UOM entry"
    })
    }
});


module.exports = router;