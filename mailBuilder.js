const mailBuilder = (objects, template) =>{
	const otpobjarr = objects;
	const entries = Object.entries(otpobjarr);
	let tmpl = template;
	
	for (let o=0; o<entries.length; o++) {
		
		tmpl = tmpl.replace(entries[o][0],entries[o][1]);
	}
	return tmpl;
}

module.exports = mailBuilder;
