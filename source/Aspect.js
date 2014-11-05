/* Not supposed to be called at all. */
function Aspect() {
	throw new Error("Abstract!");
}

/**
 * Defines an aspect with its corresponding "initialize" function.
 * Aspects are functions that are generally called to enhance constructors.
 *
 * @param {function} initialize Function responsible for initializing the defined aspect for the targeted object.
 *   If the object isn't supposed to be of the defined aspect it should throw an error.
 */
Aspect.define = function define(aspect, initialize) {
	// Most of the time `subject` is a constructor but it could be something else depending on how the author wants it to behave.
	// It is generally called like: `Capable.enhance(Thing)`, which basically will result in applying the aspect on `subject`.
	// Any additional parameter is forwarded to the aspect function.
	aspect.enhance = function enhance(constructor) {
		// Declare `aspect` as an aspect of `constructor`:
		Aspect.getOwnScope(constructor).aspects.push(aspect);

		return aspect.apply(constructor, Array.prototype.slice(arguments, 1));
	};

	Object.defineProperties(aspect, {
		// Give the aspect a default `getOwnScope` function (see Aspect.prototype#getOwnScope):
		getOwnScope: {
			enumerable: false,
			configurable: true,
			writable: true,
			value: function getOwnScope(defaultScope) {
				return Aspect.prototype.getOwnScope.apply(aspect, arguments);
			}
		},
		// Give the aspect a default `setOwnScope` function (see Aspect.prototype#setOwnScope):
		setOwnScope: {
			enumerable: false,
			configurable: true,
			writable: true,
			value: function setOwnScope(scope) {
				return Aspect.prototype.setOwnScope.apply(aspect, arguments);
			}
		}
	});

	// Wrap the provided `initialize` function to bring some more logic:
	aspect.initialize = function(object) {
		var result;
// TODO: throw an error if the object doesn't support this aspect
		// Declare the aspect so that it is known to be initialized properly for the object being constructed:
		var scope = Aspect.getOwnScope(object);
		// Have aspects be initialized only once.
		// When inherited objects both call Aspect#initialize or both have the same aspects, aspects would be initialized
		// as many times as there are inheritance level + 1.
// TODO: That'd probably be better in Aspect#initialize to allow specific aspects' initialize function to be called explicitly
		var index = scope.aspects.indexOf(aspect);
		if(index < 0 || !scope.initialized[index]) {
			scope.aspects.push(aspect);
			/*
					var inherited = Aspect.getOwnScope(object.constructor.prototype).aspects;
			console.log("INHERITED:", inherited);
					for(var index = inherited.length - 1; index > -1; index--) {
						if(~declared.indexOf(inherited[index])) {
							declared.unshift(inherited[index]);
						}
					}
			console.log("COMBINED:", declared);
			*/
			if(initialize) {
				result = initialize.apply(object, Array.prototype.slice.call(arguments, 1));
			}

			scope.initialized[index] = true;
		}

		return result;
	};

	return initialize;
};

// Shortcut function for initializing every aspects of `object`, which is the object being constructed.
// It should be only be called in a constructor.
Aspect.initialize = function initialize(object) {
	var parameters = Array.prototype.slice.call(arguments);
	var results = [];
// TODO: the problem here is it will initialize parents' aspects *AFTER* the constructor's, but we should respect the inheritance order
	// Since `object` is being constructed we'll only consider its constructor's aspects.
	// We're passing `false` as the second parameter to avoid the #Aspect scope to be created on the constructor if it
	// doesn't exist yet.
	var scope = Aspect.getOwnScope(Aspect.initialize.caller);
	if(scope) {
		scope.aspects.forEach(function(aspect) {
			results.push(aspect.initialize.apply(object, parameters));
		});
	}

	return results;
};

// Returns the "own" scope relating to the aspect being defined.
Aspect.prototype.setOwnScope = function setOwnScope(self, scope) {
	// Here, `this` should be the aspect itself:
	return self["#" + this.name] = scope;
};

// Returns the "own" scope relating to the aspect being defined.
Aspect.prototype.getOwnScope = function getOwnScope(self, defaultScope) {
	// Here, `this` should be the aspect itself:
	var key = "#" + this.name;

	if(!self[key]) {
		self[key] = defaultScope || {};
	}

	return self[key];
};

// Returns Aspect class' own scope.
Aspect.getOwnScope = function(self, existing) {
	if(!self.hasOwnProperty("#Aspect") && !existing) {
		Object.defineProperty(self, "#Aspect", {
			enumerable: false,
			value: {
				aspects: [],
				initialized: []
			}
		});
	}

	return self["#Aspect"];
};

// Checks if the given object has the provided aspect.
Aspect.has = function(object, aspect) {
	// Objects having aspects are supposed to have them into that scope:
	var scope = Aspect.getOwnScope(object);
	return !!scope && !!~scope.aspects.indexOf(aspect);
};


function getSignature(f) {
	return f.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, "")
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(",");
}


module.exports = Aspect;
