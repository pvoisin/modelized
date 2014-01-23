module.exports = function(configuration) {
	configuration.set({
		basePath: "../../..",

		frameworks: ["mocha", "requirejs"],

		files: [
			{pattern: "source/**/*.js", included: false},
			"test/framework/mocha/expect.js",
			"test/framework/mocha/sinon.js",
			{pattern: "test/specifications/**/*Spec.js", included: false},
			"test/framework/karma/bootstrap.js"
		],

		preprocessors: {
			"source/**/*.js": "coverage"
		},

		// "dots", "progress", "junit", "growl", "coverage"
		reporters: ["progress", "coverage"],

		coverageReporter: {
			dir: ".coverage"
		},

		port: 9876,

		colors: true,

		// LOG_DISABLE | LOG_ERROR | LOG_WARN | LOG_INFO | LOG_DEBUG
		logLevel: configuration.LOG_DEBUG,

//		autoWatch: true,

		// "Chrome", "ChromeCanary", "Firefox", "Opera", "Safari", "PhantomJS", "IE"
		browsers: ["Chrome"],

		captureTimeout: 10000,

		singleRun: true
	});
};
