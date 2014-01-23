define(["Aspect"], function(Aspect) {
	describe("Aspect", function() {
		it("should allow simple definition based on conventions", function() {
			function Capable() {}

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

			function fly() {}
			function swim() {}

			var thing = new Thing(fly);
			expect(thing.$Capable.capacity).to.be(fly)
			expect(Capable.getOwnScope(thing).capacity).to.be(thing.$Capable.capacity);
			expect(Aspect.is(thing, Capable)).to.be(true);

			thing = new Thing(swim);
			expect(thing.$Capable.capacity).to.be(swim);
			expect(Capable.getOwnScope(thing).capacity).to.be(thing.$Capable.capacity);
			expect(Aspect.is(thing, Capable)).to.be(true);

			function ThingNotCapable() {}
			thing = new ThingNotCapable();
			expect(thing.$Capable).to.be(undefined);
			expect(Aspect.is(thing, Capable)).to.be(false);
		});

		it("should allow aspect scopes to be private", function() {
			function Capable() {}

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
			expect(thing.$Capable).to.be(undefined);
			expect(Capable.getOwnScope(thing)).to.be(privateSharedScope);
		});

		it("should allow aspects to be defined with no `initialize` function", function() {
			function Capable() {}

			expect(function() { Aspect.define(Capable); }).not.to.throwError();

			function Thing(capacity) {
				Capable.initialize(this, capacity);
			}

			Capable.enhance(Thing);

			expect(function() { new Thing(); }).not.to.throwError();
		});

		it("should allow prototypes to be enhanced", function() {
			function Capable() {
				this.getCapacity = function getCapacity() {
					var self = this, own = Capable.getOwnScope(self);
					return own.capacity;
				};
			}

			Aspect.define(Capable, function initialize(capacity) {
				var self = this, own = Capable.getOwnScope(self);
				own.capacity = capacity;
			});

			function Thing(capacity) {
				Capable.initialize(this, capacity);
			}

			Capable.enhance(Thing.prototype);

			function fly() {}
			function swim() {}

			expect(new Thing(fly).getCapacity()).to.be(fly);
			expect(new Thing(swim).getCapacity()).to.be(swim);
		});

		it("should not constrain `initialize` function to use `self` and `own`", function() {
			function Capable() {
				this.getCapacity = function getCapacity() {
					return this.capacity;
				};
			}

			Aspect.define(Capable, function initialize(capacity) {
				this.capacity = capacity;
			});

			function Thing(capacity) {
				Capable.initialize(this, capacity);
			}

			Capable.enhance(Thing.prototype);

			function fly() {}
			function swim() {}

			expect(new Thing(fly).getCapacity()).to.be(fly);
			expect(new Thing(swim).getCapacity()).to.be(swim);
		});

		it("should inialize every aspects when calling `Aspect#initialize`", function() {
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
	});
});