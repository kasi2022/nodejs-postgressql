--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgagent; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgagent;


ALTER SCHEMA pgagent OWNER TO postgres;

--
-- Name: SCHEMA pgagent; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA pgagent IS 'pgAgent system tables';


--
-- Name: sacatalog; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sacatalog;


ALTER SCHEMA sacatalog OWNER TO postgres;

--
-- Name: SCHEMA sacatalog; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA sacatalog IS 'location for SA Catalog data';


--
-- Name: pgagent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgagent WITH SCHEMA pgagent;


--
-- Name: EXTENSION pgagent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgagent IS 'A PostgreSQL job scheduler';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA sacatalog;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aflag; Type: TYPE; Schema: sacatalog; Owner: postgres
--

CREATE TYPE sacatalog.aflag AS ENUM (
    '0',
    '1'
);


ALTER TYPE sacatalog.aflag OWNER TO postgres;

--
-- Name: oenum; Type: TYPE; Schema: sacatalog; Owner: postgres
--

CREATE TYPE sacatalog.oenum AS ENUM (
    'h',
    'b',
    'f'
);


ALTER TYPE sacatalog.oenum OWNER TO postgres;

--
-- Name: pvalues; Type: TYPE; Schema: sacatalog; Owner: postgres
--

CREATE TYPE sacatalog.pvalues AS ENUM (
    'b',
    'n',
    'a'
);


ALTER TYPE sacatalog.pvalues OWNER TO postgres;

--
-- Name: attributefn(text, text[]); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.attributefn(attrcode text, taglst text[]) RETURNS TABLE(j json)
    LANGUAGE plpgsql
    AS $$
declare
	word text;
	tagrec RECORD;
	tagrd RECORD;
	tagarr text array;
	toarr integer array;
	fnarr text array;
	txtarr text array;
	txarr text array;
	i int := 0;
	j int := 0;
	tagc json;
	taf text;
	tagr RECORD;
begin
	txarr := taglst;
	tagarr[j] := attrcode;
	RAISE NOTICE 'attr code array at the start: %', tagarr;
	
	FOR tagrec IN SELECT t_order
				  FROM sacatalog.tags 
				  WHERE tagcode = ANY (taglst) 
				  ORDER  by t_order
	LOOP
		
		for tagr IN select distinct s.mappedattrcode lowercode
					from   sacatalog.attributemappings s,
						   sacatalog.attributes b,
						   sacatalog.attributes c
					where  s.attrcode = b.attrcode
					and    s.mappedattrcode = c.attrcode
					and    s.attrcode = any(tagarr)
					and    c.tagcode = any (txarr)

		LOOP
			
			
			txtarr[j] := tagr.lowercode;
			j := j + 1;
			RAISE NOTICE 'attr code array at this stage: %', txtarr;
		END LOOP;		
		
		
		fnarr  := array_cat(fnarr,tagarr);
		tagarr := null;
		tagarr := txtarr;
		txtarr := null;
		j := 0;
		
		RAISE NOTICE 'attr code array at each loop: %', tagarr;
		
	END LOOP;		
	
/*select floor(random()*(37-1))::int into ind1;
	select floor(random()*(37-1))::int into ind2;
	select floor(random()*(37-1))::int into ind3;
	select floor(random()*(37-1))::int into ind4;
	select floor(random()*(37-1))::int into ind5;
	word := 'a'||ind1||'b'||ind2;*/
	/*word := ind1||'***'||ind2;
	if (word is null) then
		word := 'abcde';
	end if;*/
	RAISE NOTICE 'final attr code array: %', fnarr;
	RAISE NOTICE 'tag code array: %', txarr;
	
		 return query SELECT row_to_json(t) TAG 
					   FROM 
					 (select distinct s.mappedattrcode lowercode, b.attrcode highercode, c.value, c.uomcode, t.t_order
						from   sacatalog.attributemappings s,
							   sacatalog.attributes b,
							   sacatalog.attributes c,
							   sacatalog.tags t
					   where   s.attrcode = b.attrcode
						and    s.mappedattrcode = c.attrcode
						and    t.tagcode = c.tagcode
						and    s.attrcode = any(fnarr)
						and    c.tagcode = any (txarr)
						order by t.t_order) t;
end;		
$$;


ALTER FUNCTION sacatalog.attributefn(attrcode text, taglst text[]) OWNER TO postgres;

--
-- Name: costlookup(json); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.costlookup(cartitem json) RETURNS TABLE(j json)
    LANGUAGE plpgsql
    AS $$
declare
	citem json;
	tagr RECORD;
	carray text[];
begin
		citem := cartitem;

		for tagr in select * from json_object_keys(citem)
		loop
			carray:= array_append(carray, json_extract_path_text(citem->tagr.json_object_keys, 'code'));
		end loop;

		raise notice '%', carray;
		
		return query select row_to_json(t) TAG from 
					 (select i.itemid, i.itemdesc, c.stdprice, c.movingprice from 
							 sacatalog.items i inner join
							 sacatalog.itemcosts c
						  on i.itemid = c.itemid
				  inner join sacatalog.attributes a
						  on a.itemid = i.itemid
					   where a.attrcode = any (carray)) t;
		 
		
end;		
$$;


ALTER FUNCTION sacatalog.costlookup(cartitem json) OWNER TO postgres;

--
-- Name: dummyfn(text); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.dummyfn(prod text) RETURNS json
    LANGUAGE plpgsql
    AS $$

declare
	k text;
	l text;
	v text;
	kb text;
	arr text [][];
	cnt numeric;
	b text;
begin
	cnt := 0;
	b := 'r1';
	raise notice 'A %', quote_literal(prod);
/*	foreach k in ARRAY prod 
	loop
		raise notice 'a %', k;
		--INSERT INTO sacatalog.contexts VALUES (k,l);
		cnt := cnt + 1;
	end loop;
--	b := k;
--	arr[0] := b;
--	raise notice '%, %', b, arr;
*/	
	return '1'::json;
	
end;
$$;


ALTER FUNCTION sacatalog.dummyfn(prod text) OWNER TO postgres;

--
-- Name: dummyfn(text[], text[]); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.dummyfn(prod text[], gg text[]) RETURNS json
    LANGUAGE plpgsql
    AS $$

declare
	k text;
	l text;
	v text;
	kb text;
	arr text [][];
	cnt numeric;
	b text;
begin
	cnt := 1;
	b := 'r1';
	raise notice 'A %, %', prod, gg;
	foreach k in ARRAY prod 
	loop
		raise notice 'B %, %', gg[cnt], prod[cnt];
		--INSERT INTO sacatalog.contexts VALUES (k,l);
		cnt := cnt + 1;
	end loop;
--	b := k;
--	arr[0] := b;
--	raise notice '%, %', b, arr;
	
	return '1'::json;
	
end;
$$;


ALTER FUNCTION sacatalog.dummyfn(prod text[], gg text[]) OWNER TO postgres;

--
-- Name: dupattributefn(text, text[]); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.dupattributefn(attrcode text, taglst text[]) RETURNS json
    LANGUAGE plpgsql
    AS $$
declare
	word text;
	tagrec RECORD;
	tagrd RECORD;
	tagarr text array;
	toarr integer array;
	txtarr text array;
	txarr text array;
	i int := 0;
	j int := 0;
	tagc json;
	taf text;
	tagr RECORD;
begin
	txarr := taglst;
	tagarr[j] := attrcode;
	
	FOR tagrec IN SELECT t_order
				  FROM sacatalog.tags 
				  WHERE tagcode = ANY (taglst) 
				  ORDER  by t_order
	LOOP
		
		for tagr IN select distinct s.mappedattrcode lowercode, b.attrcode highercode
					from   sacatalog.attributemappings s,
						   sacatalog.attributes b,
						   sacatalog.attributes c
					where  s.attrcode = b.attrcode
					and    s.mappedattrcode = c.attrcode
					and    s.attrcode = any(tagarr)
					and    c.tagcode = any (txarr)

		LOOP
			
			j := j + 1;
			txtarr[j] := tagr.lowercode;
			
				
		END LOOP;
		
		tagarr := array_cat(tagarr,txtarr);
		txtarr := null;
		j := 0;
		RAISE NOTICE 'attr code array at each loop: %', tagarr;
		
	END LOOP;	
	
	
	
/*select floor(random()*(37-1))::int into ind1;
	select floor(random()*(37-1))::int into ind2;
	select floor(random()*(37-1))::int into ind3;
	select floor(random()*(37-1))::int into ind4;
	select floor(random()*(37-1))::int into ind5;
	word := 'a'||ind1||'b'||ind2;*/
	/*word := ind1||'***'||ind2;
	if (word is null) then
		word := 'abcde';
	end if;*/
	RAISE NOTICE 'attr code array: %', tagarr;
	RAISE NOTICE 'tag code array: %', txarr;
	
	select distinct s.mappedattrcode lowercode, b.attrcode highercode, c.value, c.uomcode, t.t_order into tagrd
					from   sacatalog.attributemappings s,
						   sacatalog.attributes b,
						   sacatalog.attributes c,
						   sacatalog.tags t
					where  s.attrcode = b.attrcode
					and    s.mappedattrcode = c.attrcode
					and    t.tagcode = c.tagcode
					and    s.attrcode = any(tagarr)
					and    c.tagcode = any (txarr)
					order by t.t_order;

	RAISE NOTICE 'FINAL: %', tagrd;
	return '3'::json;
end;	
$$;


ALTER FUNCTION sacatalog.dupattributefn(attrcode text, taglst text[]) OWNER TO postgres;

--
-- Name: fetchcartdetails(bigint); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.fetchcartdetails(cartid bigint) RETURNS TABLE(j json)
    LANGUAGE plpgsql
    AS $$
declare
	acartid bigint;
	tagr RECORD;
	
begin
		acartid := cartid;

		return query select row_to_json(t) TAG from 
					 (select  t.cfname, t.clname, t.corg, c.cartid, c.creationdate, i.cartitemid, i.configdetails
						from  sacatalog.customers t,
							  sacatalog.carts c,
							  sacatalog.cartitems i
						where t.custid = c.custid::text
						and	  c.cartid = i.cartid
						and   c.cartid = acartid) t;
		 
		
end;		
$$;


ALTER FUNCTION sacatalog.fetchcartdetails(cartid bigint) OWNER TO postgres;

--
-- Name: fetchcartdetails(text, text); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.fetchcartdetails(cartid text, lcode text) RETURNS TABLE(j json)
    LANGUAGE plpgsql
    AS $$
declare
	acartid text;
	tagr RECORD;
	pref text;
	acode text;
begin
		acartid := cartid;
		SELECT split_part(acartid,'_',1) INTO pref;
		SELECT split_part(acartid, '_',2) INTO acode;
		IF pref = 'U' THEN
			return query select row_to_json(t) TAG from 
						 (select  t.cfname, t.clname, t.corg, c.cartid, c.creationdate, c.qron RequestedOn, c.qrcon ConfirmedOn, i.cartitemid, sacatalog.simpletranslator('attributes', trim(both '"' from json_extract_path(i.configdetails, 'product', 'attcode')::text), lcode) product, i.quantity
							from  sacatalog.customers t,
								  sacatalog.carts c,
								  sacatalog.cartitems i
							where t.custid = c.custid::text
							and	  c.cartid = i.cartid
							and   c.custid::text = acode) t;		
		ELSE
			raise notice '5 %', 'G';
			return query select row_to_json(t) TAG from 
						 (select  t.cfname, t.clname, t.corg, c.cartid, c.creationdate, c.qron RequestedOn, c.qrcon ConfirmedOn, i.cartitemid, sacatalog.simpletranslator('attributes', trim(both '"' from json_extract_path(i.configdetails, 'product', 'attcode')::text), lcode) product, i.quantity
							from  sacatalog.customers t,
								  sacatalog.carts c,
								  sacatalog.cartitems i
							where t.custid = c.custid::text
							and	  c.cartid = i.cartid
							and   c.cartid::text = acode) t;
		END IF;

end;		
$$;


ALTER FUNCTION sacatalog.fetchcartdetails(cartid text, lcode text) OWNER TO postgres;

--
-- Name: inventorycheck(json); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.inventorycheck(cartitem json) RETURNS TABLE(j json)
    LANGUAGE plpgsql
    AS $$
declare
	citem json;
	tagr RECORD;
	carray text[];
begin
		citem := '{
					"type" : {"code" : "VD"},
					"bdy" : {"code" : "CC491K2"},
					"flng" : {"code" : "150RF"},
					"trim" : {"code" : "D/E"}, 
					"lmswh" : {"code" : "DPMS"},
					"admndr" : {"code" : "DAMD"}
				  }'::json;

		for tagr in select * from json_object_keys(citem)
		loop
			
			carray:= array_append(carray, json_extract_path_text(citem->tagr.json_object_keys, 'code'));
		end loop;
		raise notice '%', carray;
		return query select row_to_json(t) TAG from 
			   (select i.itemid, i.itemdesc, sacatalog.location(v.loccode), a.attrdesc from 
						sacatalog.items i left outer join
						sacatalog.inventory v
						on i.itemid = v.itemid
				 inner join sacatalog.attributes a
						on a.itemid = i.itemid
				 where a.attrcode = any (carray)) t;
		 
		
end;		
$$;


ALTER FUNCTION sacatalog.inventorycheck(cartitem json) OWNER TO postgres;

--
-- Name: jsonparser(text[], text); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.jsonparser(prod text[], langcode text) RETURNS json
    LANGUAGE plpgsql
    AS $$

declare
	k text;
	
	v text;
	kb text;
	arr text [];
	cnt numeric;
	b text;
	context text;
begin
	cnt := 0;
	b := 'r';
	foreach k in ARRAY prod 
	loop
		raise notice 'a %', k;
		if substring(k,1,1) = 'A' then
			context := 'attributes';
		elsif substring(k,1,1) = 'T' then
			context := 'tags';
		end if;
		if sacatalog.simpletranslator(context, k, langcode) is not null then
			k := k||'_'||sacatalog.simpletranslator(context, k, langcode);
			arr[cnt] := REGEXP_REPLACE(k,'[^\w]+',' ','g');
		else
			arr[cnt] := k;
		end if;
		cnt := cnt + 1;
	end loop;
--	b := k;
--	arr[0] := b;
	raise notice 'a %', arr;
	
	return array_to_json(arr);
	
end;
$$;


ALTER FUNCTION sacatalog.jsonparser(prod text[], langcode text) OWNER TO postgres;

--
-- Name: langaddfn(text, text, boolean); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.langaddfn(plangcode text, planguage text, pbsflag boolean) RETURNS json
    LANGUAGE plpgsql
    AS $$
declare
   blf text;

begin
	
	select '1' into blf from sacatalog.languages where baselang = true;	
	
	if (blf is not null) then
		if (pbsflag = true) then
			return '{"success" : false, "message" : "Base language already exists"}'::json;
		end if;
	end if;

	INSERT INTO sacatalog.languages VALUES (plangcode, planguage, pbsflag);
	return '{"success" : true, "message" : "Language added"}'::json;
	
end;		
$$;


ALTER FUNCTION sacatalog.langaddfn(plangcode text, planguage text, pbsflag boolean) OWNER TO postgres;

--
-- Name: langupdatefn(text, text, boolean); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.langupdatefn(plangcode text, planguage text, pbsflag boolean) RETURNS json
    LANGUAGE plpgsql
    AS $$ 
declare
   blf text;

begin
	
	select '1' into blf from sacatalog.languages where baselang = true;	
	
	if (blf is not null) then
		if (pbsflag = true) then
			return '{"success" : false, "message" : "Base language already exists"}'::json;
		end if;
	end if;

	UPDATE sacatalog.languages SET language = planguage, baselang = pbsflag WHERE langcode = plangcode;
	return '{"success" : true, "message" : "Language updated"}'::json;
	
end;		
$$;


ALTER FUNCTION sacatalog.langupdatefn(plangcode text, planguage text, pbsflag boolean) OWNER TO postgres;

--
-- Name: location(text); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.location(baseloc text) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
	vloccode text;
	vlocdesc text;
	vvloccode text;
	vrefloccode text;
	lc text[];
	lv text[];
	i int := 0;
begin
	vloccode := baseloc;
	loop
		select b.locdesc, a.locdesc, a.refloccode into vlocdesc, vvloccode, vrefloccode  
		from sacatalog.locations a,
			 sacatalog.locations b
		where b.loccode = a.refloccode
		and a.loccode = vloccode;
		
		if vrefloccode is null then
			exit;
		end if;
		
		
		lc[i] := vlocdesc;
		lv[i] := vvloccode;
		raise notice '%,%', lc[i], lv[i];
		
		vloccode := vrefloccode;
		i := i + 1;
		
		
		
		
	end loop;
	lc := array_prepend(lv[0],lc);
	return  array_to_string(lc,' - ');
	
	
end;
$$;


ALTER FUNCTION sacatalog.location(baseloc text) OWNER TO postgres;

--
-- Name: olupdatefn(text[], text[]); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.olupdatefn(prod text[], gg text[]) RETURNS json
    LANGUAGE plpgsql
    AS $$

declare
	k text;
	l text;
	v text;
	kb text;
	arr text [][];
	cnt numeric;
	b text;
begin
	cnt := 1;
	b := 'r1';
	raise notice 'A %, %', prod, gg;
	foreach k in ARRAY prod 
	loop
		raise notice 'B %, %', gg[cnt], prod[cnt];
		UPDATE sacatalog.otherlangdata SET content = prod[cnt] WHERE logid = gg[cnt];
		cnt := cnt + 1;
	end loop;
	
	return '{"success" : true, "message" : "language feed updated"}'::json;
	
end;
$$;


ALTER FUNCTION sacatalog.olupdatefn(prod text[], gg text[]) OWNER TO postgres;

--
-- Name: otpcheckfn(text, text, numeric); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.otpcheckfn(acustid text, aotp text, ainterval numeric) RETURNS json
    LANGUAGE plpgsql
    AS $$
declare
   votp text;
   vcreatedon timestamp;
   vtstamp timestamp;
   vinterval numeric;
   vaflag boolean := '1';
   vrflag boolean := '1';
begin
	vtstamp := CURRENT_TIMESTAMP;
	
	select otp, createdon into votp, vcreatedon from sacatalog.otp where custid = acustid order by createdon desc limit 1;
	select floor(extract(epoch from (vtstamp::timestamp - vcreatedon::timestamp))) into vinterval;
	
	
	if (aotp is not null) then
		if (votp = aotp) then
			return '{"success" : true, "message" : "Customer Registration confirmed"}'::json;
			/*if (vinterval < ainterval) then
				
				return '{"success" : true, "message" : "Customer Registration confirmed"}'::json;
			else
				raise notice '%', vinterval;
				return '{"success" : false, "message" : "OTP expired"}'::json;
			end if;*/
		else
			return '{"success" : false, "message" : "OTP did not match"}'::json;
		end if;
	else
		return '{"success" : false, "message" : "OTP was not entered"}'::json;
	end if;

end;		
$$;


ALTER FUNCTION sacatalog.otpcheckfn(acustid text, aotp text, ainterval numeric) OWNER TO postgres;

--
-- Name: simpletranslator(text, text, text); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.simpletranslator(context text, refcode text, langcode text) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
	ctxt text;
	rfcd text;
	lncd text;
	rslt text;
	qry text;
	blflag boolean;
	
begin

	ctxt := context;
	rfcd := refcode;
	lncd := langcode;

	select l.baselang into blflag from sacatalog.languages l where l.langcode = lncd;

	if blflag = false then
		qry := 'select o.content
						from sacatalog.otherlangdata o
						where o.context = ' || quote_literal(ctxt)
					    || ' and o.refcode = ' || quote_literal(rfcd)
						|| ' and o.langcode = ' || quote_literal(lncd);
		raise notice 'query statement %', qry;		
		EXECUTE qry into rslt;
		
		raise notice '%', rslt;
		
		return  rslt;
	else
		if ctxt = 'tags' then
			
			select t.tagdesc into rslt from sacatalog.tags t where t.tagcode = rfcd;
			return rslt;
		elsif ctxt = 'attributes' then
			select a.attrdesc into rslt from sacatalog.attributes a where a.attrcode = rfcd;
			return rslt;
		elsif ctxt = 'paragraphs' then
			select paragraph into rslt from sacatalog.paragraphs where paraid = rfcd;
			return rslt;
		end if;
	end if;
	/*
	qry := 'select o.content
					from sacatalog.otherlangdata o
					inner join sacatalog.'||quote_ident(ctxt)||
					' t on o.refcode = t.tagcode 
					where o.context = ' || quote_literal(ctxt)
				    || ' and o.refcode = ' || quote_literal(rfcd)
					|| ' and o.langid = ' || quote_literal(lncd);
	
	EXECUTE qry into rslt;
	
	raise notice '%', qry;
	
	return  rslt;
	*/
	
end;
$$;


ALTER FUNCTION sacatalog.simpletranslator(context text, refcode text, langcode text) OWNER TO postgres;

--
-- Name: test(); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.test() RETURNS json
    LANGUAGE plpgsql
    AS $$
declare
begin

	return '{"success" : true,"username" : "Gautam"}'::json;
	
	
end;
$$;


ALTER FUNCTION sacatalog.test() OWNER TO postgres;

--
-- Name: testfn(json); Type: FUNCTION; Schema: sacatalog; Owner: postgres
--

CREATE FUNCTION sacatalog.testfn(prod json) RETURNS json
    LANGUAGE plpgsql
    AS $$
declare
	inprod json := '{
					  "product" : {"name": "A1", "attrid" : "a"},
					  "type" : {"code" : "B2", "attrid" : "b"},
					  "body" : {"code" : "C3", "size" : 3, "material" : {"code" : "F6"}, "attrid" : "c"},
					  "by" : {"code" : "C3", "size" : 3, "material" : {"code" : "F6"}, "attrid" : "c"},
					  "flange" : {"code" : "D4", "attrid" : "d"}, 
					  "trim" : {"code" : "E5", "attrid" : "e"}
					}';
	ky text;
	jk record;
	tbname text;
	vbval text;
	rslt text;
	tname text;
begin
	for jk in SELECT json_object_keys(inprod)
	loop
		raise notice 'a %', inprod->jk.json_object_keys->'attrid';
	end loop;
	raise notice '%', ky;
	
	tbname := 'tags';
	vbval := 'DLVLC';
	tname := 'sacatalog.tags';
	
	EXECUTE FORMAT('select concat(o.content, t.tagdesc)
					from sacatalog.otherlangdata o
					inner join '||tname||
					' t on o.refcode = t.tagcode 
					where o.context = ' || quote_literal(tbname)
				    || ' and o.refcode = ' ||quote_literal(vbval)) into rslt;
	
	raise notice '%', rslt;
	
	return  inprod;
	
	
end;
$$;


ALTER FUNCTION sacatalog.testfn(prod json) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.addresses (
    addid bigint NOT NULL,
    refid bigint NOT NULL,
    reftype character varying(6) NOT NULL,
    addtype character varying(6) NOT NULL,
    doornum character varying(6),
    poboxnum character varying(6),
    streetadd1 character varying(15),
    streetadd2 character varying(15),
    city character varying(25) NOT NULL,
    state character varying(25) NOT NULL,
    country character varying(25) NOT NULL,
    pincode character varying(10) NOT NULL,
    creationdate date NOT NULL
);


ALTER TABLE sacatalog.addresses OWNER TO postgres;

--
-- Name: addressseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.addressseq
    START WITH 1000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.addressseq OWNER TO postgres;

--
-- Name: attributemappings; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.attributemappings (
    attrcode character varying(10) NOT NULL,
    mappedattrcode character varying(10) NOT NULL,
    optional boolean DEFAULT false
);


ALTER TABLE sacatalog.attributemappings OWNER TO postgres;

--
-- Name: museq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.museq
    START WITH 100000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.museq OWNER TO postgres;

--
-- Name: attributes; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.attributes (
    attrcode character varying(10) DEFAULT ('A'::text || nextval('sacatalog.museq'::regclass)) NOT NULL,
    attrdesc character varying(40) NOT NULL,
    tagcode character varying(10) NOT NULL,
    value character varying(10),
    uomcode character varying(6),
    itemid bigint,
    creationdate date NOT NULL,
    urefcode character varying(10)
);


ALTER TABLE sacatalog.attributes OWNER TO postgres;

--
-- Name: cartitemseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.cartitemseq
    START WITH 4000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.cartitemseq OWNER TO postgres;

--
-- Name: cartitems; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.cartitems (
    cartitemid bigint DEFAULT nextval('sacatalog.cartitemseq'::regclass) NOT NULL,
    cartid bigint,
    configdetails json NOT NULL,
    modifydate date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    quantity integer DEFAULT 1
);


ALTER TABLE sacatalog.cartitems OWNER TO postgres;

--
-- Name: cartseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.cartseq
    START WITH 3000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.cartseq OWNER TO postgres;

--
-- Name: carts; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.carts (
    cartid bigint DEFAULT nextval('sacatalog.cartseq'::regclass) NOT NULL,
    custid bigint,
    creationdate date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    qron timestamp without time zone,
    qrcon timestamp without time zone
);


ALTER TABLE sacatalog.carts OWNER TO postgres;

--
-- Name: configtemplates; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.configtemplates (
    templcode character varying(6) NOT NULL,
    templname character varying(30) NOT NULL,
    template json NOT NULL
);


ALTER TABLE sacatalog.configtemplates OWNER TO postgres;

--
-- Name: contexts; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.contexts (
    context character varying(10) NOT NULL,
    code character varying(20) NOT NULL
);


ALTER TABLE sacatalog.contexts OWNER TO postgres;

--
-- Name: customerseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.customerseq
    START WITH 2000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sacatalog.customerseq OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.customers (
    custid character varying(10) DEFAULT nextval('sacatalog.customerseq'::regclass) NOT NULL,
    cfname character varying(15) NOT NULL,
    cmname character varying(10),
    clname character varying(15) NOT NULL,
    corg character varying(20),
    primecontactnum character varying(20) NOT NULL,
    email text NOT NULL,
    creationdate timestamp without time zone NOT NULL,
    reqflag sacatalog.aflag,
    activeflag sacatalog.aflag
);


ALTER TABLE sacatalog.customers OWNER TO postgres;

--
-- Name: empseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.empseq
    START WITH 100000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.empseq OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: sacatalog; Owner: postgres
--
CREATE SCHEMA IF NOT EXISTS sacatalog;

CREATE TABLE  sacatalog.employees (
	
    empid bigint DEFAULT nextval('sacatalog.empseq'::regclass) NOT NULL,
    efname character varying(30) NOT NULL,
    emname character varying(30),
    elname character varying(30),
    ecode character varying(25) NOT NULL,
    mobile character varying(20) NOT NULL,
    email character varying(40) NOT NULL,
    creationdate timestamp without time zone NOT NULL,
    activeflag sacatalog.aflag
);


ALTER TABLE sacatalog.employees OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.inventory (
    logid bigint NOT NULL,
    itemid bigint NOT NULL,
    serialnum bigint NOT NULL,
    loccode character varying(6) NOT NULL,
    quantity numeric NOT NULL,
    creationdate date NOT NULL
);


ALTER TABLE sacatalog.inventory OWNER TO postgres;

--
-- Name: inventoryseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.inventoryseq
    START WITH 6000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sacatalog.inventoryseq OWNER TO postgres;

--
-- Name: itemcosts; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.itemcosts (
    logid bigint NOT NULL,
    itemid bigint NOT NULL,
    costctrid uuid DEFAULT gen_random_uuid(),
    costelmid uuid DEFAULT gen_random_uuid(),
    stdprice numeric NOT NULL,
    movingprice numeric NOT NULL,
    creationdate date NOT NULL
);


ALTER TABLE sacatalog.itemcosts OWNER TO postgres;

--
-- Name: itemcostseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.itemcostseq
    START WITH 7000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.itemcostseq OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.items (
    itemid bigint NOT NULL,
    itemdesc character varying(60) NOT NULL,
    hsncode character varying(8) NOT NULL,
    uomcode character varying(10) NOT NULL,
    reorderpoint numeric,
    reoderqty numeric,
    creationdate date
);


ALTER TABLE sacatalog.items OWNER TO postgres;

--
-- Name: itemseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.itemseq
    START WITH 5000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sacatalog.itemseq OWNER TO postgres;

--
-- Name: languages; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.languages (
    langcode character varying(10) NOT NULL,
    language character varying(20) NOT NULL,
    baselang boolean DEFAULT false
);


ALTER TABLE sacatalog.languages OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.locations (
    loccode character varying(6) NOT NULL,
    locdesc character varying(30) NOT NULL,
    refloccode character varying(6),
    creationdate date NOT NULL
);


ALTER TABLE sacatalog.locations OWNER TO postgres;

--
-- Name: logseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.logseq
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sacatalog.logseq OWNER TO postgres;

--
-- Name: orderitems; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.orderitems (
    oritemid bigint NOT NULL,
    orderid bigint NOT NULL,
    orderdetails json[] NOT NULL,
    modifydate date NOT NULL
);


ALTER TABLE sacatalog.orderitems OWNER TO postgres;

--
-- Name: orderitemseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.orderitemseq
    START WITH 1100000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.orderitemseq OWNER TO postgres;

--
-- Name: otherlangdata; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.otherlangdata (
    logid character varying(10) DEFAULT ('L'::text || nextval('sacatalog.logseq'::regclass)) NOT NULL,
    context character varying(10) NOT NULL,
    refcode character varying(10) NOT NULL,
    langcode character varying(4) NOT NULL,
    content text NOT NULL
);


ALTER TABLE sacatalog.otherlangdata OWNER TO postgres;

--
-- Name: otheruserdata; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.otheruserdata (
    coninfoid character varying(10) NOT NULL,
    userid character varying(10) NOT NULL,
    usertype character varying(6) NOT NULL,
    coninfotype character varying(6) NOT NULL,
    coninfolabel character varying(25) NOT NULL,
    value character varying(25) NOT NULL
);


ALTER TABLE sacatalog.otheruserdata OWNER TO postgres;

--
-- Name: otp; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.otp (
    logid character varying(10) DEFAULT nextval('sacatalog.logseq'::regclass) NOT NULL,
    custid character varying(10) NOT NULL,
    otp character varying(6) NOT NULL,
    createdon timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE sacatalog.otp OWNER TO postgres;

--
-- Name: paragraphs; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.paragraphs (
    paraid character varying(10) DEFAULT ('P'::text || nextval('sacatalog.logseq'::regclass)) NOT NULL,
    topic character varying(25) NOT NULL,
    subtopic character varying(30),
    porder integer NOT NULL,
    paragraph text
);


ALTER TABLE sacatalog.paragraphs OWNER TO postgres;

--
-- Name: passwords; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.passwords (
    logid uuid NOT NULL,
    userid bigint NOT NULL,
    password character varying(100) NOT NULL,
    creationdate timestamp without time zone NOT NULL,
    expirationdate timestamp without time zone
);


ALTER TABLE sacatalog.passwords OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.payments (
    payid bigint NOT NULL,
    orderid bigint NOT NULL,
    custid bigint NOT NULL,
    paymode character varying(15),
    amount numeric NOT NULL,
    status character varying(10),
    " paydate" date NOT NULL
);


ALTER TABLE sacatalog.payments OWNER TO postgres;

--
-- Name: payseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.payseq
    START WITH 9000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.payseq OWNER TO postgres;

--
-- Name: prodconfigstruct; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.prodconfigstruct (
    prodcode character varying(10) NOT NULL,
    proddesc character varying(40) NOT NULL,
    configframework json NOT NULL
);


ALTER TABLE sacatalog.prodconfigstruct OWNER TO postgres;

--
-- Name: producttagstruct; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.producttagstruct (
    productcode character varying(10) NOT NULL,
    productdesc character varying(30) NOT NULL,
    taghierarchy json NOT NULL
);


ALTER TABLE sacatalog.producttagstruct OWNER TO postgres;

--
-- Name: quotations; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.quotations (
    quoteid bigint NOT NULL,
    cartid bigint NOT NULL,
    quotedetails json NOT NULL,
    creationdate date NOT NULL,
    status character varying,
    orderid bigint,
    orderdate date,
    invoiceid bigint,
    invoicedate date
);


ALTER TABLE sacatalog.quotations OWNER TO postgres;

--
-- Name: quoteseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.quoteseq
    START WITH 8000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.quoteseq OWNER TO postgres;

--
-- Name: serialseq; Type: SEQUENCE; Schema: sacatalog; Owner: postgres
--

CREATE SEQUENCE sacatalog.serialseq
    START WITH 100000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    CYCLE;


ALTER SEQUENCE sacatalog.serialseq OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.tags (
    tagcode character varying(10) DEFAULT ('T'::text || nextval('sacatalog.museq'::regclass)) NOT NULL,
    tagdesc character varying(30) NOT NULL,
    creationdate timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creatorcode character varying(10) NOT NULL,
    t_order integer,
    category character varying(20),
    catitem boolean DEFAULT false
);


ALTER TABLE sacatalog.tags OWNER TO postgres;

--
-- Name: uoms; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.uoms (
    uomcode character varying(6) NOT NULL,
    uomname character varying(30) NOT NULL,
    application character varying(40) NOT NULL,
    creatorucode character varying(25) NOT NULL,
    creationdate timestamp without time zone NOT NULL
);


ALTER TABLE sacatalog.uoms OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: sacatalog; Owner: postgres
--

CREATE TABLE sacatalog.users (
    userid bigint NOT NULL,
    userfname character varying(30) NOT NULL,
    usermname character varying(30),
    userlname character varying(30),
    usercode character varying(25) NOT NULL,
    mobile character varying(20) NOT NULL,
    email character varying(40) NOT NULL,
    creationdate timestamp without time zone NOT NULL,
    activeflag sacatalog.aflag
);


ALTER TABLE sacatalog.users OWNER TO postgres;

--
-- Data for Name: pga_jobagent; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobagent (jagpid, jaglogintime, jagstation) FROM stdin;
6480	2025-06-27 16:40:24.588971+05:30	DESKTOP-MI1A9UO
\.


--
-- Data for Name: pga_jobclass; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobclass (jclid, jclname) FROM stdin;
\.


--
-- Data for Name: pga_job; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_job (jobid, jobjclid, jobname, jobdesc, jobhostagent, jobenabled, jobcreated, jobchanged, jobagentid, jobnextrun, joblastrun) FROM stdin;
\.


--
-- Data for Name: pga_schedule; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_schedule (jscid, jscjobid, jscname, jscdesc, jscenabled, jscstart, jscend, jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths) FROM stdin;
\.


--
-- Data for Name: pga_exception; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_exception (jexid, jexscid, jexdate, jextime) FROM stdin;
\.


--
-- Data for Name: pga_joblog; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_joblog (jlgid, jlgjobid, jlgstatus, jlgstart, jlgduration) FROM stdin;
\.


--
-- Data for Name: pga_jobstep; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobstep (jstid, jstjobid, jstname, jstdesc, jstenabled, jstkind, jstcode, jstconnstr, jstdbname, jstonerror, jscnextrun) FROM stdin;
\.


--
-- Data for Name: pga_jobsteplog; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobsteplog (jslid, jsljlgid, jsljstid, jslstatus, jslresult, jslstart, jslduration, jsloutput) FROM stdin;
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.addresses (addid, refid, reftype, addtype, doornum, poboxnum, streetadd1, streetadd2, city, state, country, pincode, creationdate) FROM stdin;
\.


--
-- Data for Name: attributemappings; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.attributemappings (attrcode, mappedattrcode, optional) FROM stdin;
\.


--
-- Data for Name: attributes; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.attributes (attrcode, attrdesc, tagcode, value, uomcode, itemid, creationdate, urefcode) FROM stdin;
A100009	Valve Size 2 Inch weight	T100008	24	gm	\N	2025-06-05	\N
A100007	Valve Size 2 Inches	T100005	2	inch	0	2025-06-05	\N
A100000	VD	T100002	1	cnt	\N	2025-06-05	\N
\.


--
-- Data for Name: cartitems; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.cartitems (cartitemid, cartid, configdetails, modifydate, quantity) FROM stdin;
4000004	3000000	{"product":{"attcode":"A100009"},"tagdesc":"optional","category":"template", "attcode" : "A100007"}	2025-06-17	1
4000002	3000001	{"product":{"attcode":"A100007"},"tagdesc":"optional","category":"template"}	2025-06-10	1
4000001	\N	{"product":{"attcode":"A100007"},"tagdesc":"optional","category":"template", "attcode" : "A100009"}	2025-06-10	1
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.carts (cartid, custid, creationdate, qron, qrcon) FROM stdin;
3000000	2000013	2025-06-26	\N	\N
3000001	2000013	2025-06-26	\N	\N
\.


--
-- Data for Name: configtemplates; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.configtemplates (templcode, templname, template) FROM stdin;
\.


--
-- Data for Name: contexts; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.contexts (context, code) FROM stdin;
a	E
n	m
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.customers (custid, cfname, cmname, clname, corg, primecontactnum, email, creationdate, reqflag, activeflag) FROM stdin;
2000013	Gautam	R	Prabakaran	GRP & Co	9444157293	gautampsac@gmail.com	2025-06-05 00:55:18.822	1	0
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.employees (empid, efname, emname, elname, ecode, mobile, email, creationdate, activeflag) FROM stdin;
100002	Gautam	R	Prabakaran	gautampram	9840451967	gautampram@gmail.com	2025-06-21 07:03:45.312	1
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.inventory (logid, itemid, serialnum, loccode, quantity, creationdate) FROM stdin;
\.


--
-- Data for Name: itemcosts; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.itemcosts (logid, itemid, costctrid, costelmid, stdprice, movingprice, creationdate) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.items (itemid, itemdesc, hsncode, uomcode, reorderpoint, reoderqty, creationdate) FROM stdin;
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.languages (langcode, language, baselang) FROM stdin;
EN	English	t
IT	Italian	f
AR	Arabic Standard	f
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.locations (loccode, locdesc, refloccode, creationdate) FROM stdin;
\.


--
-- Data for Name: orderitems; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.orderitems (oritemid, orderid, orderdetails, modifydate) FROM stdin;
\.


--
-- Data for Name: otherlangdata; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.otherlangdata (logid, context, refcode, langcode, content) FROM stdin;
L10024	tags	T100005	IT	Dimensione della valvola
L10025	tags	T100008	IT	Peso della valvola
L10026	tags	T100010	IT	opzionale
L10027	attributes	A100009	IT	Valvola di dimensioni 2 pollici di peso
L10028	attributes	A100000	IT	Valvola a diluvio, VD
L10029	attributes	A100007	IT	Dimensione valvola 2 pollici
\.


--
-- Data for Name: otheruserdata; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.otheruserdata (coninfoid, userid, usertype, coninfotype, coninfolabel, value) FROM stdin;
\.


--
-- Data for Name: otp; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.otp (logid, custid, otp, createdon) FROM stdin;
10001	2000003	401324	2025-05-30 09:47:02.685626+05:30
10002	2000004	276214	2025-05-30 09:56:53.097131+05:30
10003	2000005	545324	2025-05-30 09:59:33.686637+05:30
10004	99991	963021	2025-06-05 00:11:02.766063+05:30
10005	2000007	833059	2025-06-05 00:24:03.238418+05:30
10006	2000008	992933	2025-06-05 00:27:32.248563+05:30
10007	2000009	378735	2025-06-05 00:32:26.999455+05:30
10008	2000010	265763	2025-06-05 00:41:55.659183+05:30
10009	2000011	051462	2025-06-05 00:44:07.053408+05:30
10010	2000012	236863	2025-06-05 00:51:37.423386+05:30
10011	2000013	079800	2025-06-05 00:55:18.923057+05:30
\.


--
-- Data for Name: paragraphs; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.paragraphs (paraid, topic, subtopic, porder, paragraph) FROM stdin;
\.


--
-- Data for Name: passwords; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.passwords (logid, userid, password, creationdate, expirationdate) FROM stdin;
535afb5c-d088-418c-8988-6e785bd5270a	100002	$2b$10$324W7oEtSzgMEClj9jk73Ob6F2tZu0dlo8N0/1EXWIlMM/539g8dS	2025-06-21 07:03:45.312	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.payments (payid, orderid, custid, paymode, amount, status, " paydate") FROM stdin;
\.


--
-- Data for Name: prodconfigstruct; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.prodconfigstruct (prodcode, proddesc, configframework) FROM stdin;
A100000	VD	{"row1":[{"tagcode":"T100011"},{"tagcode":"T100002"}],"row2":[{"tagcode":"T100005"},{"tagcode":"T100008"}],"row3":[{"tagcode":"T100010"},{"attcode":"A100009"},{"attcode":"A100007"}]}
A100001	DV	{"row1":[{"tagcode":"T100005"},{"tagcode":"T100008"}],"row2":[{"tagcode":"T100010"},{"attcode":"A100009"},{"attcode":"A100007"}]}
\.


--
-- Data for Name: producttagstruct; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.producttagstruct (productcode, productdesc, taghierarchy) FROM stdin;
A100000	VD Valve	{"tag1":"T100000","tag2":"T100005","tag3":"T100009"}
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.quotations (quoteid, cartid, quotedetails, creationdate, status, orderid, orderdate, invoiceid, invoicedate) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.tags (tagcode, tagdesc, creationdate, creatorcode, t_order, category, catitem) FROM stdin;
T100002	DELUGE VALVE	2025-06-05 07:04:53.194+05:30	GRP	\N	product	t
T100005	valsiz	2025-06-05 07:48:00.703+05:30	GRP	\N	\N	f
T100008	valve weight	2025-06-05 07:59:31.642+05:30	GRP	\N	\N	f
T100010	optional	2025-06-10 09:29:47.797+05:30	GRP	\N	template	f
T100011	Type	2025-06-24 22:51:37.555286+05:30	GRP	\N	template	f
\.


--
-- Data for Name: uoms; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.uoms (uomcode, uomname, application, creatorucode, creationdate) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: sacatalog; Owner: postgres
--

COPY sacatalog.users (userid, userfname, usermname, userlname, usercode, mobile, email, creationdate, activeflag) FROM stdin;
\.


--
-- Name: addressseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.addressseq', 1000000, false);


--
-- Name: cartitemseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.cartitemseq', 4000004, true);


--
-- Name: cartseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.cartseq', 3000001, true);


--
-- Name: customerseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.customerseq', 2000013, true);


--
-- Name: empseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.empseq', 100002, true);


--
-- Name: inventoryseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.inventoryseq', 6000000, false);


--
-- Name: itemcostseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.itemcostseq', 7000000, false);


--
-- Name: itemseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.itemseq', 5000000, false);


--
-- Name: logseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.logseq', 10029, true);


--
-- Name: museq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.museq', 100014, true);


--
-- Name: orderitemseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.orderitemseq', 1100000, false);


--
-- Name: payseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.payseq', 9000000, false);


--
-- Name: quoteseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.quoteseq', 8000000, false);


--
-- Name: serialseq; Type: SEQUENCE SET; Schema: sacatalog; Owner: postgres
--

SELECT pg_catalog.setval('sacatalog.serialseq', 100000, false);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (addid);


--
-- Name: attributemappings attributemappings_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.attributemappings
    ADD CONSTRAINT attributemappings_pkey PRIMARY KEY (attrcode, mappedattrcode);


--
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (attrcode);


--
-- Name: cartitems cartitems_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.cartitems
    ADD CONSTRAINT cartitems_pkey PRIMARY KEY (cartitemid);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (cartid);


--
-- Name: otherlangdata compcrlkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.otherlangdata
    ADD CONSTRAINT compcrlkey UNIQUE (context, refcode, langcode);


--
-- Name: configtemplates configtemplates_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.configtemplates
    ADD CONSTRAINT configtemplates_pkey PRIMARY KEY (templcode);


--
-- Name: contexts contexts_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.contexts
    ADD CONSTRAINT contexts_pkey PRIMARY KEY (context, code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (custid);


--
-- Name: employees e_ecode_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.employees
    ADD CONSTRAINT e_ecode_key UNIQUE (ecode);


--
-- Name: employees e_email_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.employees
    ADD CONSTRAINT e_email_key UNIQUE (email);


--
-- Name: employees e_mobile_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.employees
    ADD CONSTRAINT e_mobile_key UNIQUE (mobile);


--
-- Name: employees e_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.employees
    ADD CONSTRAINT e_pkey PRIMARY KEY (empid);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (logid);


--
-- Name: itemcosts itemcosts_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.itemcosts
    ADD CONSTRAINT itemcosts_pkey PRIMARY KEY (logid);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (itemid);


--
-- Name: languages languaages_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.languages
    ADD CONSTRAINT languaages_pkey PRIMARY KEY (langcode);


--
-- Name: languages language; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.languages
    ADD CONSTRAINT language UNIQUE (language);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (loccode);


--
-- Name: orderitems orderitems_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.orderitems
    ADD CONSTRAINT orderitems_pkey PRIMARY KEY (oritemid);


--
-- Name: otherlangdata otherlangdata_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.otherlangdata
    ADD CONSTRAINT otherlangdata_pkey PRIMARY KEY (logid);


--
-- Name: otheruserdata otheruserdata_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.otheruserdata
    ADD CONSTRAINT otheruserdata_pkey PRIMARY KEY (coninfoid);


--
-- Name: otp otp_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.otp
    ADD CONSTRAINT otp_pkey PRIMARY KEY (logid);


--
-- Name: paragraphs paragraphs_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.paragraphs
    ADD CONSTRAINT paragraphs_pkey PRIMARY KEY (paraid);


--
-- Name: passwords passwords_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.passwords
    ADD CONSTRAINT passwords_pkey PRIMARY KEY (logid);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payid);


--
-- Name: prodconfigstruct prodconfigstruct_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.prodconfigstruct
    ADD CONSTRAINT prodconfigstruct_pkey PRIMARY KEY (prodcode);


--
-- Name: producttagstruct producttagstruct_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.producttagstruct
    ADD CONSTRAINT producttagstruct_pkey PRIMARY KEY (productcode);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (quoteid);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (tagcode);


--
-- Name: uoms uoms_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.uoms
    ADD CONSTRAINT uoms_pkey PRIMARY KEY (uomcode);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_mobile_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.users
    ADD CONSTRAINT users_mobile_key UNIQUE (mobile);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (userid);


--
-- Name: users users_usercode_key; Type: CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.users
    ADD CONSTRAINT users_usercode_key UNIQUE (usercode);


--
-- Name: passwords fk_user; Type: FK CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.passwords
    ADD CONSTRAINT fk_user FOREIGN KEY (userid) REFERENCES sacatalog.employees(empid);


--
-- Name: items uom_fkey; Type: FK CONSTRAINT; Schema: sacatalog; Owner: postgres
--

ALTER TABLE ONLY sacatalog.items
    ADD CONSTRAINT uom_fkey FOREIGN KEY (uomcode) REFERENCES sacatalog.uoms(uomcode);


--
-- PostgreSQL database dump complete
--

