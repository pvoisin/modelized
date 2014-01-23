define(["Utility", "Model"], function(Utility, Model) {
	describe("Model", function() {
		var candidates = [
			undefined,			// 0
			null,					// 1
			false,				// 2
			true,					// 3
			Boolean(false),	// 4
			Boolean(true),		// 5
			NaN,					// 6
			1,						// 7
			Number(1),			// 8
			"",					// 9
			String(""),			// 10
			{},					// 11
			Object(),			// 12
			[],					// 13
			Array(),				// 14
			new Date()			// 15
		];

		describe("define", function() {
			it("should only accept functions for second parameter", function() {
				expect(function() {
					Model.define({firstName: String, lastName: String}, []);
				}).to.throwError();
			});

			it("should allow to define arbitrary properties", function() {
				function Thing(values) {
					Model.initialize(this, values);
				}

				Model.define(Thing, {contents: undefined});
				candidates.forEach(function(candidate) {
					expect(function() {
						new Thing({contents: candidate});
					}).not.to.throwError();
				});
			});

			it("should automatically set `id` property if not specified", function() {
				function Thing(values) {
					Model.initialize(this, values);
				}

				Model.define(Thing, {contents: undefined});
				for(var index = 0; index < 10; index++) {
					expect(new Thing().id).to.be(index + 1);
				}
			});

			it("should allow `id` property to be specified", function() {
				var Thing = Model.define({contents: undefined});
				expect(new Thing({id: 123}).id).to.be(123);
			});
/*
			it("should prevent `id` property to be duplicate for one model", function() {
				var Thing = Model.define({contents: undefined});
				var thing = new Thing();
				expect(function() { new Thing({id: 0}); }).to.throwError();
			});
//*/
			it("should allow to specify default property value", function() {
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
				expect(person.firstName).to.be("");
				expect(person.lastName).to.be("Mouse");

				person = new Person({firstName: "Mickey"});
				expect(person.firstName).to.be("Mickey");
				expect(person.lastName).to.be("Mouse");

				person = new Person({lastName: "Duck", birthDate: now});
				expect(person.firstName).to.be("");
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
						{type: null},
						{type: null, default: "T"},
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
						{type: Object, default: null},
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

				descriptors.invalid.forEach(function(descriptor) {
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
				expect(person.firstName).to.be("");
				expect(person.lastName).to.be("Mouse");

				person = new Person({firstName: "Mickey"});
				expect(person.firstName).to.be("Mickey");
				expect(person.lastName).to.be("Mouse");

				person = new Person({lastName: "Duck", birthDate: now});
				expect(person.firstName).to.be("");
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
				var initialize = sinon.spy(function(self, own) {
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
		});

		describe("validate", function() {
			var testCases = {
				"booleans": {type: Boolean, validCandidates: [2, 3, 4, 5]},
				"numbers": {type: Number, validCandidates: [6, 7, 8]},
				"strings": {type: String, validCandidates: [9, 10]},
				"objects": {type: Object, validCandidates: [11, 12, 13, 14, 15]},
				"arrays": {type: Array, validCandidates: [13, 14]},
				"dates": {type: Date, validCandidates: [15]}
			};

			Utility.forOwn(testCases, function(description, testCase) {
				it("should validate " + testCase, function() {
					// Default values should be valid according to the `validate` function:
					expect(function() {
						Model.validate(Model.getDefaultValue(description.type), description.type);
					}).not.to.throwError();

					description.validCandidates.forEach(function(candidateIndex) {
						var candidate = candidates[candidateIndex];
						expect(Model.validate(candidate, description.type)).to.be(true);
					});

					candidates.forEach(function(candidate, index) {
						if(!~description.validCandidates.indexOf(index)) {
							expect(Model.validate(candidate, description.type)).to.be(false);
						}
					});
				});
			});
/*
			it("should accept custom validators", function() {
				var validator = function(value) {
					return Model.validate(value, String) && (value.length >= 3);
				};

				expect(Model.validate("ABC", validator)).to.be(true);
				expect(Model.validate("?", validator)).to.be(false);

				expect(Model.validate("http://???", validators["locator"])).to.be(false);
				expect(Model.validate("http://localhost", validators["locator"])).to.be(true);
			});
//*/
			it("should validate values to be set for properties", function() {
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
		});

		describe("observable", function() {
			it("should be observable", function() {
				function Thing(values) {
					Model.initialize(this, values);
				}

				Model.define(Thing, {contents: undefined});
				var observer = sinon.spy();
				Thing.attachObserver("creation", observer);
				var thing = new Thing();
				expect(observer.calledWith(thing)).to.be(true);
			});
		});

		describe("toJSON", function() {
			it("should only display own properties", function() {
				function Person(values) {
					Model.initialize(this, values);
				}

				Model.define(Person, {firstName: String, lastName: String});
				var person = new Person({firstName: "Mickey", lastName: "Mouse"});
				expect(person.toJSON()).to.eql({id: 1, firstName: "Mickey", lastName: "Mouse"});
				expect(JSON.stringify(person)).to.eql('{"id":1,"firstName":"Mickey","lastName":"Mouse"}');
			});
		});
	});
});