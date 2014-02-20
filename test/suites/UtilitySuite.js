var expect = require("expect.js");
var Utility = require("../../source/Utility");

describe("Utility", function() {
	describe("#capitalize", function() {
		it("should work properly", function() {
			expect(Utility.capitalize("hello!")).to.be("Hello!");
			expect(Utility.capitalize("HELLO!")).to.be("HELLO!");
		});
	});
	describe("#isDefined", function() {
		it("should work properly", function() {
			expect(Utility.isDefined(undefined)).to.be(false);

			expect(Utility.isDefined({})).to.be(true);
			expect(Utility.isDefined([])).to.be(true);
			expect(Utility.isDefined(function() {})).to.be(true);
			expect(Utility.isDefined(1)).to.be(true);
			expect(Utility.isDefined(NaN)).to.be(true);
			expect(Utility.isDefined(null)).to.be(true);
			expect(Utility.isDefined(/^$/)).to.be(true);
		});
	});
});