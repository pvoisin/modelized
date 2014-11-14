var $ = require("ytility");
var Model = require("../../source/Model");
var expect = require("expect.js");
var spy = require("sinon").spy;


describe("Model", function() {
	var samples = {
		values: [
			undefined,      // 0
			null,           // 1
			false,          // 2
			true,           // 3
			Boolean(false), // 4
			Boolean(true),  // 5
			NaN,            // 6
			1,              // 7
			Number(1),      // 8
			"",             // 9
			String(""),     // 10
			{},             // 11
			Object(),       // 12
			[],             // 13
			Array(),        // 14
			new Date(),     // 15
			function() {}   // 16
		],

		types: [
			undefined, // 0
			undefined, // 1
			Boolean,   // 2
			Boolean,   // 3
			Boolean,   // 4
			Boolean,   // 5
			Number,    // 6
			Number,    // 7
			Number,    // 8
			String,    // 9
			String,    // 10
			Object,    // 11
			Object,    // 12
			Array,     // 13
			Array,     // 14
			Date,      // 15
			Function   // 16
		]
	};

	describe("#qualify", function() {
		it("should qualify objects properly", function() {
			function Thing() {
			}

			var values = samples.values.concat(new Thing());
			var types = samples.types.concat(Thing);

			values.forEach(function(value, index) {
				expect(Model.qualify(value)).to.be(types[index]);
			});
		});
	});

	describe("#normalize", function() {
		it("should deal with short property descriptors properly", function() {
			function Thing() {
			}

			var values = samples.values.concat(new Thing());
			var types = samples.types.concat(Thing);

			values.forEach(function(value, index) {
				var result1 = Model.normalize({P: value});
				// Let's verify equivalent explicit descriptors...
				var result2 = Model.normalize({P: {default: value}});

				// If `value` is a plain object then it is not a short descriptor.
				if(!$.isObject(value, true)) {
					// NaN cannot be compared to NaN with regular operators
					if(Number.isNaN(value)) {
						expect(Number.isNaN(result1["P"]["default"])).to.be(true);
						expect(Number.isNaN(result2["P"]["default"])).to.be(true);
						delete result1["P"]["default"];
						delete result2["P"]["default"];
						expect(result1).to.eql({P: {type: Number}});
						expect(result1).to.eql(result2);
					}
					else if(value === undefined) {
						expect(result1).to.eql({P: {type: undefined}});
						expect(result2).to.eql({P: {default: undefined, type: undefined}});
					}
					else {
						expect(result1).to.eql({P: {type: types[index], default: value}});
						expect(result1).to.eql(result2);
					}
				}
			});
		});

		it("should normalize definitions properly", function() {
			function Thing() {}

			expect(Model.normalize({})).to.eql({});
// TODO:
		});

		it("should infer types from default property values", function() {
			var definition = {};
			var values = {};

			Model.types.forEach(function(type, index) {
				// Objects are used for explicit descriptors, anything else is considered a default value.
				if(type !== Object) {
					var property = String.fromCharCode(65 + index);
					definition[property] = values[property] = Model.getDefaultValue(type);
				}
			});

			var T = Model.define(definition);

			var expectation = Model.types.reduce(function(expectation, type, index) {
				if(type !== Object) {
					var property = String.fromCharCode(65 + index);

					var descriptor = {
						type: type,
						default: values[property]
					};

					expectation[property] = descriptor;
				}

				return expectation;
			}, {});
			expectation["id"] = {type: Number};
			expect(Model.getOwnScope(T.prototype).definition).to.eql(expectation);
		});
	});

	describe("#define", function() {
		it("should only accept functions for last parameter", function() {
			expect(function() {
				Model.define({firstName: String, lastName: String}, []);
			}).to.throwError();
		});

		it("should allow to define arbitrary properties", function() {
			function Thing(values) {
				Model.initialize(this, values);
			}

			Model.define(Thing, {contents: undefined});
			samples.values.forEach(function(value) {
				expect(function() {
					new Thing({contents: value});
				}).not.to.throwError();
			});
		});

		it("should automatically set `id` property if not specified", function() {
			function Thing(values) {
				Model.initialize(this, values);
			}

			Model.define(Thing, {contents: undefined});
			for(var index = 0; index < 10; index++) {
				var t = new Thing();
				expect(t.id).to.be(index + 1);
			}
		});

		it("should allow `id` property to be specified", function() {
			var Thing = Model.define({contents: undefined});
			expect(new Thing({id: 123}).id).to.be(123);
		});

/* not sure if we actually want that behavior as default...
				it("should prevent `id` property to be duplicated for one model", function() {
					var Thing = Model.define({contents: undefined});
					var thing = new Thing();
					expect(function() { new Thing({id: 0}); }).to.throwError();
				});
//*/
// TODO: validate that default values are validated and filtered if `validator` and `filter` are provided
// TODO: ensure filtered value is validated by `validator`
		it("should allow to specify basic property value", function() {
			var now = new Date();
			var apocalypse = new Date("2012-12-21");

			var Person = Model.define({
				firstName: String,
				lastName: "Mouse",
				birthDate: Date,
				deathDate: apocalypse
			});

			var person = new Person();
			expect(person instanceof Person).to.be(true);
			expect(person.firstName).to.be(undefined);
			expect(person.lastName).to.be("Mouse");

			person = new Person({firstName: "Mickey"});
			expect(person.firstName).to.be("Mickey");
			expect(person.lastName).to.be("Mouse");

			person = new Person({lastName: "Duck", birthDate: now});
			expect(person.firstName).to.be(undefined);
			expect(person.lastName).to.be("Duck");
			expect(person.birthDate).to.be(now);
			expect(person.deathDate).to.be(apocalypse);

			person = new Person({firstName: "Donald", lastName: "Duck"});
			expect(person.firstName).to.be("Donald");
			expect(person.lastName).to.be("Duck");
			expect(person.deathDate).to.be(apocalypse);
		});

		it("should accept more complex property definitions", function() {
			var descriptors = {
				valid: [
					{type: undefined},
					{type: undefined, default: "T"},
					{type: Number},
					{type: Number, default: 123},
					{type: Function, default: function() {}},
					{type: Number, default: NaN}
				],
				invalid: [
					{type: true},
					{type: Number, default: function() {}},
					{type: "T"},
					{type: "T", default: function() {}},
					{type: NaN, default: 123},
					{type: Boolean, default: 999},
					{type: Number, default: null},
//					{type: Object, default: null},
					{type: Date, default: "T"},
					{type: Date, default: function() {}},
					{type: Function, default: {}}
				]
			};

			Model.types.forEach(function(type) {
				descriptors.valid.unshift({type: type});
			});

			descriptors.valid.forEach(function(descriptor) {
				expect(function() {
					Model.define({thing: descriptor});
				}).not.to.throwError();
			});

			descriptors.invalid.forEach(function(descriptor, index) {
				expect(function() {
					Model.define({thing: descriptor});
				}).to.throwError();
			});

			expect(function() {
				Model.define({
					firstName: {type: Function},
					lastName: {default: function() {}},
					birthDate: {type: Date, writable: false},
					deathDate: {default: apocalypse, private: true}
				});
			}).not.to.throwError();

			// - - - - - - - - - - - - - - - - - - - - - - - -

			var now = new Date();
			var apocalypse = new Date("2012-12-21");

			var Person = Model.define({
				firstName: {type: String},
				lastName: {default: "Mouse"},
				birthDate: {type: Date, writable: false},
				deathDate: {default: apocalypse, private: true}
			});

			var person = new Person();
			expect(person instanceof Person).to.be(true);
			expect(person.firstName).to.be(undefined);
			expect(person.lastName).to.be("Mouse");

			person = new Person({firstName: "Mickey"});
			expect(person.firstName).to.be("Mickey");
			expect(person.lastName).to.be("Mouse");

			person = new Person({lastName: "Duck", birthDate: now});
			expect(person.firstName).to.be();
			expect(person.lastName).to.be("Duck");
			expect(person.birthDate).to.be(now);
			expect(person.deathDate).to.be(apocalypse);

			person = new Person({firstName: "Donald", lastName: "Duck"});
			expect(person.firstName).to.be("Donald");
			expect(person.lastName).to.be("Duck");
			expect(person.deathDate).to.be(apocalypse);
		});

		it("should accept `initialize` functions", function() {
			var now = new Date();
			var apocalypse = new Date("2012-12-21");

			var parameters;
			var initialize = spy(function(self, own) {
				own.deathDate = apocalypse;
				parameters = Array.prototype.slice.call(arguments);
			});

			var Person = Model.define({
				firstName: String,
				lastName: String,
				birthDate: Date,
				deathDate: Date
			}, initialize);

			var person = new Person({firstName: "Mickey"}, "ABC", 123);
			expect(initialize.called).to.be(true);
			expect(parameters.slice(2)).to.eql([
				{firstName: "Mickey"},
				"ABC",
				123
			]);
			expect(person.deathDate).to.be(apocalypse);
		});

		it("should allow property filters", function() {
			// Capitalize first letter:
			var filter = spy(function(value) {
				return !!value ? value[0].toUpperCase() + value.substring(1) : "";
			});

			function Person(values) {
				Model.initialize(this, values);
			}

// TODO: validate "writable" property
			Model.define(Person, {
				firstName: {type: String, filter: filter},
				lastName: {default: "Mouse"},
				birthDate: {type: Date, writable: false}
			});

			var person = new Person({firstName: "mickey"});
			expect(filter.calledWith("mickey")).to.be(true);
			expect(person.firstName).to.be("Mickey");

			expect(function() {
				Model.define({contents: {type: String, filter: "???"}});
			}).to.throwError();
		});
	});

	describe("#assign", function() {
		it("should assign values properly", function() {
			function Person(values) {
				Model.initialize(this, values);
			}

			Model.define(Person, {firstName: String, lastName: String});
			var person = new Person({unknown: "???"});

			// #assign should only assign known properties (cf. definition)
			expect(person.unknown).to.be(undefined);
			person.assign({unknown: "thing"});
			expect(person.unknown).to.be(undefined);
			person.assign({unknown: 123});
			expect(person.unknown).to.be(undefined);

			person.unknown = "known";
			expect(person.unknown).to.be("known");

			function Account(values) {
				Model.initialize(this, values);
			}

			Model.define(Account, {
				username: {type: String, required: {either: "email"}},
				email: {type: String, required: {either: "username"}}
			});

			var account = new Account({username: "john"});

			expect(function() {
				account.username = undefined;
			}).to.throwError(/^Invalid/);

			expect(function() {
				account.assign({username: undefined, email: "john.doe@example.com"});
			}).not.to.throwError();
		});
	});

	describe("#inherit", function() {
		it("should let models inherit b combining their definitions", function() {
			function Person(values) {
				Model.initialize(this, values);
			}

			Model.define(Person, {
				firstName: {type: String},
				lastName: {default: "Mouse"},
				birthDate: {type: Date}
			});

			function Actor(values) {
				Person.call(this, values);
			}

			Model.define(Actor, {
				sceneName: {type: String, required: true},
				filmography: []
			});

			var definitions = {
				"Person": $.clone(Model.getOwnScope(Person.prototype).definition, true),
				"Actor": $.clone(Model.getOwnScope(Actor.prototype).definition, true)
			};

			Model.inherit(Actor, Person);

			expect(Model.getOwnScope(Actor.prototype).definition).to.eql($.merge(
				{id: {type: Number}},
				$.clone(definitions["Person"]),
				definitions["Actor"]
			));

			expect(Model.getOwnScope(Person.prototype).definition).to.eql(definitions["Person"]);
		});
	});

	describe("#validate", function() {
		var expectations = {
			"booleans": {type: Boolean, values: [2, 3, 4, 5]},
			"numbers": {type: Number, values: [6, 7, 8]},
			"strings": {type: String, values: [9, 10]},
			"objects": {type: Object, values: [11, 12, 13, 14, 15, 16]},
			"arrays": {type: Array, values: [13, 14]},
			"dates": {type: Date, values: [15]},
			"functions": {type: Function, values: [16]}
		};

		$.forOwn(expectations, function(expectation, category) {
			it("should validate " + category, function() {
				// Default values should be valid according to the `validate` function:
				expect(function() {
					Model.validate(Model.getDefaultValue(expectation.type), expectation.type);
				}).not.to.throwError();

				expectation.values.forEach(function(index) {
					var value = samples.values[index];
					expect(Model.validate(value, expectation.type)).to.be(true);
				});

				samples.values.forEach(function(value, index) {
					// Values could be not defined if they're not required.
					if((value !== undefined) && !~expectation.values.indexOf(index)) {
						expect(Model.validate(value, expectation.type)).to.be(false);
					}
				});
			});
		});

		it("should accept custom validators", function() {
			var validator = function(value) {
				return Model.validate(value, String) && (value.length >= 3);
			};

			expect(Model.validate("ABC", validator)).to.be(true);
			expect(Model.validate("?", validator)).to.be(false);

			function Thing(values) {
				Model.initialize(this, values);
			}

			validator = spy(validator);
			Model.define(Thing, {contents: {type: String, validator: validator}});
			var thing = new Thing();

			expect(function() {
				thing.contents = "!";
			}).to.throwError();
			expect(validator.calledWith("!")).to.be(true);
			expect(validator.calledOn(thing)).to.be(true);

//			expect(Model.validate("http://???", validators["locator"])).to.be(false);
//			expect(Model.validate("http://localhost", validators["locator"])).to.be(true);

			expect(function() {
				Model.define({contents: {type: String, validator: "???"}});
			}).to.throwError();
		});

		it("should validate values being set in properties", function() {
			var apocalypse = new Date("2012-12-21");

			function Person(values) {
				Model.initialize(this, values);
			}

			Model.define(Person, {
				firstName: {type: String, required: true},
				lastName: "Mouse",
				birthDate: Date,
				deathDate: Date
			});

			// First name is required:
			expect(function() {
				new Person();
			}).to.throwError();

			var person = new Person({firstName: "Donald"});
			expect(function() {
				person.firstName = "Mickey";
			}).not.to.throwError();
			expect(function() {
				person.firstName = 1;
			}).to.throwError();
			expect(function() {
				person.deathDate = apocalypse;
			}).not.to.throwError();
			expect(function() {
				person.deathDate = "later";
			}).to.throwError();
		});

		it("should return `undefined` for \"either\" requirements missing additional values", function() {
			expect(Model.validate(undefined, {type: String, required: {either: "email"}})).to.be(undefined);
		});

		it("should validate required values properly", function() {
			var apocalypse = new Date("2012-12-21");

			function Person(values) {
				Model.initialize(this, values);
			}

			Model.define(Person, {
				firstName: {type: String, required: true},
				lastName: "Mouse",
				birthDate: Date
			});

			// First name is required:
			expect(function() {
				new Person();
			}).to.throwError(/^Invalid/);

			function Account(values) {
				Model.initialize(this, values);
			}

			Model.define(Account, {
				username: {type: String, required: {either: "email"}},
				email: {type: String, required: {either: "username"}}
			});

			expect(function() {
				new Account();
			}).to.throwError(/^Invalid/);

			expect(function() {
				new Account({username: "john"});
			}).not.to.throwError();

			expect(function() {
				new Account({email: "john.doe@example.com"});
			}).not.to.throwError();
		});
	});

	describe("observable", function() {
		it("should be observable", function() {
			function Thing(values) {
				Model.initialize(this, values);
			}

			Model.define(Thing, {contents: undefined});
			var observer = spy();
			Thing.attachObserver("creation", observer);
			var thing = new Thing();
			expect(observer.calledWith(thing)).to.be(true);
		});
	});

	describe("#toJSON", function() {
		it("should only display own properties", function() {
			function Person(values) {
				Model.initialize(this, values);
			}

			Model.define(Person, {firstName: String, lastName: String});
			var person = new Person({firstName: "Mickey", lastName: "Mouse"});
			expect(JSON.stringify(person)).to.eql('{"id":1,"firstName":"Mickey","lastName":"Mouse"}');
		});
	});
});