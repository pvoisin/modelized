var expect = require("expect.js");
var sinon = require("sinon");
var Aspect = require("../../source/Aspect");


describe("Aspect", function() {
	it("should allow simple definition based on conventions", function() {
		function Capable() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getCapacity = function getCapacity() {
				var self = this, own = Capable.getOwnScope(self);

				return own.capacity;
			};
		}

		Aspect.define(Capable, function initialize(capacity) {
			var self = this, own = Capable.getOwnScope(self);

			own.capacity = capacity;
		});

		expect(Capable.initialize).not.to.be(undefined);
		expect(Capable.getOwnScope).to.be.a(Function);

		function Thing(capacity) {
			Capable.initialize(this, capacity);
		}

		Capable.enhance(Thing);

		function fly() {
		}

		function swim() {
		}

		var thing = new Thing(fly);
		expect(thing["#Capable"].capacity).to.be(fly);
		expect(thing.getCapacity()).to.be(fly);
		expect(Capable.getOwnScope(thing).capacity).to.be(thing["#Capable"].capacity);
		expect(Aspect.has(thing, Capable)).to.be(true);

		thing = new Thing(swim);
		expect(thing["#Capable"].capacity).to.be(swim);
		expect(thing.getCapacity()).to.be(swim);
		expect(Capable.getOwnScope(thing).capacity).to.be(thing["#Capable"].capacity);
		expect(Aspect.has(thing, Capable)).to.be(true);

		function ThingNotCapable() {
		}

		thing = new ThingNotCapable();
		expect(thing["#Capable"]).to.be(undefined);
		expect(thing.getCapacity).to.be(undefined);
		expect(Aspect.has(thing, Capable)).to.be(false);
	});

	it("should allow aspect scopes to be private", function() {
		function Capable() {
		}

		Aspect.define(Capable, function initialize(capacity) {
			var self = this, own = Capable.getOwnScope(self);
			own.capacity = capacity;
		});

		function Thing(capacity) {
			Capable.initialize(this, capacity);
		}

		Capable.enhance(Thing);

		var privateSharedScope = {};

		Capable.getOwnScope = function getOwnScope(self) {
			return privateSharedScope;
		};

		var thing = new Thing();
		expect(thing["#Capable"]).to.be(undefined);
		expect(Capable.getOwnScope(thing)).to.be(privateSharedScope);
	});

	it("should allow aspects to be defined with no `initialize` function", function() {
		function Capable() {
		}

		expect(function() {
			Aspect.define(Capable);
		}).not.to.throwError();

		function Thing(capacity) {
			Capable.initialize(this, capacity);
		}

		Capable.enhance(Thing);

		expect(function() {
			new Thing();
		}).not.to.throwError();
	});

	it("should initialize every aspects when calling `Aspect#initialize`", function() {
		function Flying() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getAltitude = function getAltitude() {
				return this.altitude;
			};
		}

		var spy1 = sinon.spy(function initialize(altitude) {
			this.altitude = altitude;
		});
		Aspect.define(Flying, spy1);

		function Swimming() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getDepth = function getDepth() {
				return this.depth;
			};
		}

		var spy2 = sinon.spy(function initialize(depth) {
			this.depth = depth;
		});
		Aspect.define(Swimming, spy2);

		function Creature(capacity) {
			Aspect.initialize(this);
		}

		Flying.enhance(Creature);
		Swimming.enhance(Creature);

		new Creature(123);

		expect(spy1.called).to.be(true);
		expect(spy2.called).to.be(true);
	});

	it("shouldn't expose internal `#Aspect` variable", function() {
		function Moving() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getSpeed = function getSpeed() {
				return this.speed;
			};
		}

		Aspect.define(Moving, function initialize(speed) {
			this.speed = speed;
		});

		function Creature() {
			Aspect.initialize(this);
		}

		Moving.enhance(Creature);

		expect(Aspect.has(new Creature(), Moving)).to.be(true);

		expect(Object.keys(Creature).indexOf("#Aspect") < 0).to.be(true);
		expect("#Aspect" in Creature).to.be(true);
	});

	it("should work across inheritance", function() {
		function Moving() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getSpeed = function getSpeed() {
				return this.speed;
			};
		}

		Aspect.define(Moving, function initialize(speed) {
			this.speed = speed;
		});

		function Swimming() {
			var constructor = this, prototype = constructor.prototype;

			prototype.getDepth = function getDepth() {
				return this.depth;
			};
		}

		Aspect.define(Swimming, function initialize(depth) {
			this.depth = depth;
		});

		function Creature() {
			Aspect.initialize(this);
		}

		Moving.enhance(Creature);
		function Fish() {
			Creature.apply(this);

			Aspect.initialize(this);
		}

		Swimming.enhance(Fish);

		Fish.prototype = new Creature();
		Fish.prototype.constructor = Fish;

		expect(Aspect.has(new Creature(), Moving)).to.be(true);
		expect(Aspect.has(new Creature(), Swimming)).to.be(false);

		expect(Aspect.has(new Fish(), Moving)).to.be(true);
		expect(Aspect.has(new Fish(), Swimming)).to.be(true);
	});
});