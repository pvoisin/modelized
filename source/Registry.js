define(["Aspect", "Observable"], function(Aspect, Observable) {
	function Registry() {
		this.register = function register(object) {
			var self = this, own = getOwnScope(self);
			if(!~own.objects.indexOf(self)) {
				own.objects.push(object);
			}

			return self;
		};

		this.get = function(index) {
			var self = this, own = getOwnScope(self);
			return own.objects[index];
		};

		this.dispose = function dispose(object) {
			var self = this, own = getOwnScope(self),
				disposed = false,
				index = own.objects.indexOf(object);

			if(index > -1) {
				own.objects.splice(index, 1);
				disposed = true;
			}

			return disposed;
		};

		var getOwnScope = Registry.getOwnScope;
	}

	function getRegistry(object) {
		var constructor = object.constructor,
			registry;

		if((constructor.$Aspect && ~constructor.$Aspect.aspects.indexOf(Registry))) {
			registry = constructor;
		}

		return registry;
	}

	Registry.dispose = function dispose(object) {
		var registry = getRegistry(object);

		return registry && registry.dispose(object);
	};

	Aspect.define(Registry, function initialize() {
		var self = this, own = getOwnScope(self);

		own.objects = [];

		// When dealing with constructors having the Observable aspect let's automatize new instances registration:
		if(self.prototype.constructor == self) {
			if(~self.$Aspect.aspects.indexOf(Observable)) {
				self.attachObserver("creation", function(instance) {
					own.objects.push(instance);
				});
			}
		}
	});

	var getOwnScope = Registry.getOwnScope;

	return Registry;
});