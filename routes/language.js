const express = require('express');
const router = express.Router();
const pool = require('../pg');
const format = require('pg-format');

router.get('/all', async (req, res) => {
    try {
        const umqry = await pool.query("SELECT * FROM sacatalog.languages");

        res.status(200).json(umqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch the list of languages"
        })                
    }
});

router.get('/:langcode', async (req, res) => {
    try {

        const langcode = req.params.langcode;
        const umqry = await pool.query("SELECT * FROM sacatalog.languages WHERE langcode = $1", [langcode]);

        res.status(200).json(umqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch details of the requested language"
        })                
    }
});

router.post('/', async (req, res) =>{

    try{

        let langcode = req.body.langcode;
        let language = req.body.language;
        let baselang = req.body.baselang;

        const umqry = await pool.query("SELECT sacatalog.langaddfn($1, $2, $3)", [langcode, language, baselang]);

        res.status(200).json(
            {success : true,
            message : "Language added"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add language entry"
    })
    }

});

router.put('/:langcode', async (req, res) =>{

    try{
        let langcode = req.params.langcode;
        let language = req.body.language;
        let baselang = req.body.baselang;

        const umqry = await pool.query("SELECT sacatalog.langupdatefn($1, $2, $3)", [langcode, language, baselang]);

        res.status(200).json(
            {success : true,
            message : "Language information updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to update language"
    })
    }

});

router.delete('/:langcode', async (req, res) =>{

    try{
        let langcode = req.params.langcode;
 
        const umqry = await pool.query("DELETE FROM sacatalog.languages WHERE langcode = $1", [langcode]);

        res.status(200).json({success : true,
                              message : "Language entry deleted"
        });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to delete language entry"
    })
    }
});

router.get('/otherlangdatadesc/', async (req, res) => {
    try {

        const langcode = req.body.langcode;
        const context = req.body.context;
        let tstmt = "select t.tagdesc, o.content, o.refcode from sacatalog.tags t LEFT OUTER JOIN sacatalog.otherlangdata o ON t.tagcode = o.refcode WHERE o.langcode = $1 AND o.context = 'tags' ORDER BY t.tagcode";
        let astmt = "select a.attrdesc, o.content, o.refcode from sacatalog.attributes a LEFT OUTER JOIN sacatalog.otherlangdata o ON a.attrcode = o.refcode WHERE o.langcode = $1 AND o.context = 'attributes'  ORDER BY a.attrcode";
        let lstmt = tstmt + " UNION " + astmt;
        let qstmt = "";
        if (context === 'tags'){
            qstmt = tstmt;
        } else if (context === 'attributes'){
            qstmt = astmt;
        } else{
            qstmt = lstmt;
        }
        
        const olqry = await pool.query(qstmt, [langcode]);

        res.status(200).json(olqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch data for the requested language"
        })                
    }
});

router.get('/otherlangdatapara/', async (req, res) => {
    try {

        const topic = req.body.topic;
        const langcode = req.body.langcode;
        const porder = req.body.porder;

        let qstmt = "select p.paragraph, o.content, o.refcode from sacatalog.paragraphs p LEFT OUTER JOIN sacatalog.otherlangdata o ON p.paraid = o.refcode WHERE o.langcode = $1 AND porder = $2 AND p.topic = $3 ORDER BY p.paraid";
        
        const olqry = await pool.query(qstmt, [langcode, porder, topic]);

        res.status(200).json(olqry.rows);

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Unable to fetch content for the requested language"
        })                
    }
});


router.post('/otherlangdatapara/', async (req, res) =>{

    try{

        let logid = req.body.logid;
        let context = req.body.context;
        let refcode = req.body.refcode;
        let langcode = req.body.langcode;
        let content = req.body.content;

        if (logid === null){
            const iqry = await pool.query("INSERT INTO sacatalog.otherlangdata (context, refcode, langcode, content) VALUES ($1, $2, $3, $4)", [context, refcode, langcode, content]);
        } else{
            const uqry = await pool.query("UPDATE sacatalog.otherlangdata SET content = $2 WHERE logid = $1",[logid, content]);
        }
        

        res.status(200).json(
            {success : true,
            message : "Paragraph added"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add language entry"
    })
    }

});

router.post('/otherlangdata/descriptions', async (req, res) =>{

    try{
        let iarr = [];
        let carr = [];
        let ularr = [];
        let ucarr = [];
        let lcnt = 0;
        lcode = req.body.langcode;
        ctxt = req.body.context;
 
        for (let i = 0;i < req.body.details.length;i++){
            
            if(req.body.details[i].logid === ""){
                lcnt = lcnt + 1;
                iarr.push(ctxt, req.body.details[i].refcode, lcode, req.body.details[i].content);
                carr[i] = iarr;
                iarr = [];
             } else{
                
                ularr.push(req.body.details[i].logid);
                ucarr.push(req.body.details[i].content)
             }
            }

        if (lcnt > 0){
            let qstring = format("INSERT INTO sacatalog.otherlangdata (context, refcode, langcode, content) VALUES %L", carr);
            let iqry = await pool.query(qstring);
        }

        if(ularr.length != 0 && ucarr.length != 0) {
            console.log(ucarr);

            console.log(ularr);
            let uqry = await pool.query("select sacatalog.olupdatefn($1, $2)", [ucarr, ularr]);            
        }


        res.status(200).json(
            {success : true,
            message : "Other language content updated"
            });

    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success : false,
            message : "Failure to add language entry"
    })
    }

});



module.exports = router;