module.exports = function(grunt) {
	grunt.initConfig({
		"package": grunt.file.readJSON("package.json"),

		connect: {
			options: {
				hostname: "*"
			},

			server: {
				options: {
					port: 8080,
					base: ["."],
					keepalive: true,
					middleware: function(connect, options) {
						var middleware = [];

						options.base.forEach(function(folder) { middleware.push(connect.static(folder)); });

						middleware.push(function(request, response, next) {
							if(request.url === "/") {
								response.statusCode = 302;
								response.setHeader("Location", "/test/framework/mocha/runner.html");
								response.end();
							}
							else {
								next();
							}
						});

						return middleware;
					}
				}
			}
		},

		uglify: {
			options: {
				banner: "/*! <%= package.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
			},
			build: {
				src: "source/<%= package.name %>.js",
				dest: "distribution/<%= package.name %>.min.js"
			}
		}
	});

	var modules = [
		"grunt-contrib-connect",
		"grunt-contrib-uglify",
		"grunt-available-tasks"
	];

	modules.forEach(function(module) {
		grunt.loadNpmTasks(module);
	});

	grunt.registerTask("server", ["connect"]);
};
