const express = require('express');
const router = express.Router();
const pool = require('../pg');

router.get('/article', async (req, res) => {
    try {
        let topic = req.body.topic;
        let lcode = req.query.langcode;
        
        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const pqry = await pool.query("SELECT paraid, sacatalog.simpletranslator('paragraphs', paraid, " + langcode + ") paragraph, subtopic, porder FROM sacatalog.paragraphs WHERE topic = $1 ORDER BY porder ASC", [topic]);

        res.status(200).json(pqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the content for this topic"
        });
    }
});

router.get('/byparagraph', async (req, res) => {
    try {
        let topic = req.body.topic;
        let lcode = req.query.langcode;
        let porder = req.body.porder;

        const lqry = await pool.query("SELECT langcode from sacatalog.languages WHERE baselang = true");
        const lang = "'" + lqry.rows[0].langcode + "'";
        let langcode = lcode||lang;

        const pqry = await pool.query("SELECT paraid, sacatalog.simpletranslator('paragraphs', paraid, " + langcode + ") paragraph, subtopic, porder FROM sacatalog.paragraphs WHERE topic = $1 and porder = $2", [topic, porder]);

        res.status(200).json(pqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the content for this topic"
        })                
    }
});

router.post('/', async (req, res) =>{

    try{

        let topic = req.body.topic;
        let subtopic = req.body.subtopic;
        let porder = req.body.porder;
        let paragraph = req.body.paragraph;
        
        const pqry = await pool.query("INSERT INTO sacatalog.paragraphs (topic, subtopic, porder, paragraph) VALUES($1, $2, $3, $4) RETURNING paraid", [topic, subtopic, porder, paragraph]);

        res.status(200).json(pqry.rows);

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add the paragraph"
    })
    }

});

router.put('/:paraid', async (req, res) =>{

    try{
        let paraid = req.params.paraid;
        let topic = req.body.topic;
        let subtopic = req.body.subtopic;
        let paragraph = req.body.paragraph;
        let porder = req.body.porder;

        const umqry = await pool.query("UPDATE sacatalog.paragraphs SET topic = $2, subtopic = $3, paragraph = $4, porder = $5 WHERE paraid = $1", [paraid, topic, subtopic, paragraph, porder]);

        res.status(200).json({success : true,
                              "message" : "Paragraph updated"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to the paragraph"
    })
    }

});

router.delete('/:paraid', async (req, res) =>{

    try{
        let paraid = req.params.paraid;
 
        const umqry = await pool.query("UPDATE sacatalog.paragraphs SET paragraph = '' WHERE paraid = $1", [paraid]);

        res.status(200).json({success : true,
                              message : "Paragraph removed"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to remove the paragraph"
    })
    }
});


module.exports = router;