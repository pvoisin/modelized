define(["Registry"], function(Registry) {
	describe("Registry", function() {
		it("should provide a collection of objects", function() {
			function Thing() {
				Thing.register(this);
			}

			Registry.enhance(Thing);
			Registry.initialize(Thing);

			var thing1 = new Thing();
			expect(Thing.get(0)).to.be(thing1);
			expect(Registry.getOwnScope(Thing).objects[0]).to.be(thing1);
			var thing2 = new Thing();
			expect(Thing.get(1)).to.be(thing2);
			expect(Thing.dispose(thing2)).to.be(true);
			expect(Registry.dispose(thing1)).to.be(true);
			expect(Registry.getOwnScope(Thing).objects.length).to.be(0);
		});
	});
});