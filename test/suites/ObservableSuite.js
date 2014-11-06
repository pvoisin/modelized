var expect = require("expect.js");
var sinon = require("sinon");
var Utility = require("ytility");
var Observable = require("../../source/Observable");

describe("Observable", function() {
	it("should notify observers", function(proceed) {
		function Clock() {
			var self = this, own = self.own = {
				period: 0.5,
				running: false
			};

			var properties = Object.keys(own);
			var access = {
				"private": ["secret"]
			};
			access["public"] = Utility.difference(properties, access["private"]);
			access["writable"] = Utility.difference(access["public"], ["running"]);

			properties.forEach(function(property) {
				var accessors = {};
				if(~access["public"].indexOf(property)) {
					accessors["get"] = function() {
						return own[property];
					};
					if(~access["writable"].indexOf(property)) {
						accessors["set"] = function(value) {
							own[property] = value;
						};
					}
				}
				Object.defineProperty(self, property, accessors);
			});

			Observable.initialize(self);
		}

		Observable.enhance(Clock.prototype);


		Clock.prototype.start = function start() {
			var self = this, own = self.own;

			var now = new Date();

			if(!own.timer) {
				own.timer = setInterval(function() {
//console.log("Elapsed: ", new Date() - own.startTime);
					self.trigger("tick", new Date());
				}, own.period * 1000);

				own.running = true;
				own.startTime = new Date();

				self.trigger("start", now);
			}
		};

		Clock.prototype.stop = function stop() {
			var self = this, own = self.own;

			var now = new Date();

			if(own.timer) {
				clearInterval(own.timer);
				delete own.timer;

				own.running = false;

				self.trigger("stop", now);
			}
		};

		var clock = new Clock();

		var observers = {
			"A": sinon.spy(function() {
			}),
			"B": sinon.spy(function() {
			})
		};

		clock.attach("test", observers["A"]);
		clock.attach("test", observers["B"]);

		clock.trigger("test", "ABC", 123);

		expect(observers["A"].calledWith("ABC", 123)).to.be(true);
		expect(observers["B"].calledWith("ABC", 123)).to.be(true);

		for(var key in observers) {
			observers[key].reset();
		}

		clock.attach("start", observers["A"]);
		clock.attach("tick", observers["A"]);
		clock.attach("tick", observers["B"]);
		clock.attach("stop", observers["B"]);

		var duration = 3;
		var halfDuration = duration / 2;
		var halfTickCount = Math.floor(halfDuration / clock.period);

		clock.start();

		setTimeout(function() {
			clock.stop();
		}, duration * 1000 + 100); // +100 to prevent the clock to stop before the last tick is emitted


		// Let's remove observer "A" at half the duration:
		setTimeout(function() {
			clock.detach(observers["A"]);
		}, (halfDuration + 0.5 * clock.period) * 1000);

		setTimeout(function() {
			expect(observers["A"].called).to.be(true);
			expect(observers["A"].callCount).to.equal(halfTickCount + 1);
			expect(observers["B"].called).to.be(true);
			expect(observers["B"].callCount).to.equal(Math.floor(duration / clock.period) + 1);

			proceed();
		}, (duration + 0.5 * clock.period) * 1000);

		this.timeout((duration + clock.period) * 1000);
	});
});