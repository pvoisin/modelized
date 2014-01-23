var specifications = [];
for(var file in window.__karma__.files) {
	if(window.__karma__.files.hasOwnProperty(file)) {
		if(/Spec\.js$/.test(file)) {
			specifications.push(file);
		}
	}
}

requirejs.config({
	baseUrl: "/base/source",
	paths: {
		"Utility": "library/lodash"
	},
/*
	paths: {
		"jquery": "../lib/jquery",
		"underscore": "../lib/underscore",
	},

	shim: {
		"underscore": {
			exports: "_"
		}
	},
//*/
	deps: specifications,

	callback: window.__karma__.start
});