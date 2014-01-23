define([], function() {
	/* Not supposed to be called at all. */
	function Aspect() { throw new Error("Abstract!"); };

	/**
	 * Defines an aspect with its corresponding "initialize" function. The aspect itself is a function that'll be called
	 * to enhance a subject - generally a constructor.
	 * @param {function} initialize Function responsible for initializing the defined aspect for the provided object.
	 * 	If the object isn't supposed to be of the defined aspect it should throw an error.
	 */
	Aspect.define = function define(aspect, initialize) {
		/* Supposed to be called like: `SuchAspect.enhance(Thing)` or `SuchAspect.enhance(Thing.prototype)`. */
		aspect.enhance = function enhance(subject) {
			Aspect.getOwnScope(subject).aspects.push(aspect);
			return aspect.apply(subject, Array.prototype.slice(arguments, 1));
		};

		// Give the aspect the default `getOwnScope` function (see Aspect.prototype#getOwnScope):
		aspect.getOwnScope = function getOwnScope() {
			return Aspect.prototype.getOwnScope.apply(aspect, arguments);
		}

		// Wrap the actual `initialize` function with common logic:
		aspect.initialize = function(object) {
			var result;

			// Let `aspect` be part of the object's declared aspects list:
			Aspect.getOwnScope(object).aspects.push(aspect);

			// Let's provide the initialize function with the object itself and its aspect-related own scope before any other parameter:
			if(initialize) {
				result = initialize.apply(object, Array.prototype.slice.call(arguments, 1));
			}

			return result;
		};

		return initialize;
	};

	// Shortcut function for initializing every aspects concerning the given object.
	Aspect.initialize = function initialize(object) {
		var results = [];

		var scope = Aspect.getOwnScope(object.constructor, false);
		if(scope) {
			scope.aspects.forEach(function(aspect) {
				results.push(aspect.initialize.apply(aspect, arguments));
			});
		}

		return results;
	};

	// Returns the aspect-related own scope:
	Aspect.prototype.getOwnScope = function getOwnScope(self, defaultScope) {
		// Here, `this` should be the aspect itself:
		var key = "$" + this.name;

		if(!self[key]) {
			self[key] = defaultScope || {};
		}

		return self[key];
	};

	// Returns the Aspect class-related own scope:
	Aspect.getOwnScope = function(self, create) {
		if(!self.$Aspect && (create !== false)) {
			self.$Aspect = {aspects: []};
		}

		return self.$Aspect;
	};

	Aspect.is = function(object, aspect) {
		var own = Aspect.getOwnScope(object);
		return !!~own.aspects.indexOf(aspect);
	};


	function getSignature(f) {
		return f.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, "")
			.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
			.split(",");
	}

	return Aspect;
});