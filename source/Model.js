define(["Utility", "Aspect", "Observable", "Registry"], function(Utility, Aspect, Observable, Registry) {
	function Model(definition) {
		// Let's give models the `id` property by default:
		definition = Model.normalize(Utility.merge({id: Number}, definition));

		var constructor = this;
		var prototype = constructor.prototype;

		// Let's store the model definition at the prototype level:
		getOwnScope(prototype, {
			definition: definition,
			nextInstanceId: 1
		});

		// Let's show model's defined properties but hide aspects' own scopes:
		prototype.toJSON = function() {
			var self = this, description = {};

			Object.getOwnPropertyNames(self).forEach(function(property) {
				if(Aspect.getOwnScope(self) != self[property] && !Utility.find(self.$Aspect.aspects, function(aspect) {
					return aspect.getOwnScope(self) == self[property];
				})) {
					description[property] = self[property];
				}
			});

			return description;
		};

//#if DEVELOPMENT
		Observable.enhance(constructor);
		Observable.initialize(constructor);

		// Maybe that's too much and we'd rather leave that responsibility to designers:
		Registry.enhance(constructor);
		Registry.initialize(constructor);
//#end

		return constructor;
	};

	Aspect.define(Model, function initialize(values) {
		var self = this, own = getOwnScope(self);

		// Assumption: here, `self` is a final object:
		var prototype = self.constructor.prototype;
		var prototypeScope = getOwnScope(prototype);
		var definition = prototypeScope.definition;

		Utility.forOwn(own.definition, function(descriptor, property) {
			var type = descriptor["type"],
				value = descriptor["default"];

			if(values && values.hasOwnProperty(property)) {
				value = values[property];

				if(type && !Model.validate(value, type)) {
					throw new InvalidValueError(value, type);
				}
			}
			else if(value === undefined) {
				if(!!descriptor.required) {
					throw new InvalidValueError(value, type);
				}

				if(property == "id") {
// TODO: detect if "id" property has been overwritten:
					value = prototypeScope.nextInstanceId++;
				}
				else if(type && ~Model.types.indexOf(type)) {
					value = Model.getDefaultValue(type);
				}
			}

			own[property] = value;

			Object.defineProperty(self, property, {
				get: function() {
					return own[property];
				},

				set: function(value) {
					if(type && !Model.validate(value, type)) {
						throw new InvalidValueError(value, type);
					}

					own[property] = value;
				}
			});
		});

//#if DEVELOPMENT
		self.constructor.trigger("creation", self);
//#end
	});

	Model.define = function define() {
		var constructor, definition;

		if(Utility.isFunction(arguments[0]) && Utility.isObject(arguments[1])) {
			constructor = arguments[0];
			definition = arguments[1];
		}
		else if(Utility.isObject(arguments[0]) && (!arguments[1] || Utility.isFunction(arguments[1]))) {
			definition = arguments[0];
			var initialize = arguments[1];
			constructor = function(values) {
				var self = this, own = getOwnScope(self);

				Model.initialize(self, values);

				initialize && initialize.apply(self, [self, own].concat(Array.prototype.slice.call(arguments)));
			};

			if(initialize && initialize.name) {
				getOwnScope(constructor).name = initialize.name;
			}
		}
		else {
			throw new Error("Invalid parameters!");
		}

		return Model.call(constructor, definition);
	};

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	Model.normalize = function normalize(definition) {
		var result = {};

		Utility.forOwn(definition, function(descriptor, property) {
			var type, value, short = (!descriptor || descriptor.constructor !== Object);

			if(short) {
				type = Model.qualify(descriptor);
				value = (descriptor != type) ? descriptor : undefined;
				descriptor = {type: type, default: value};

				// Let the descriptor's default value be `undefined` if it is not specified:
				value = descriptor["default"] = (value != type) ? value : undefined;
			}
			else {
				type = descriptor["type"];
				value = descriptor["default"];

				// Note: `undefined` or `null` mean mixed type.
				if(type != undefined) {
					// Valid types are base types + functions (potential constructors):
					if(!~Model.types.indexOf(type) && !Utility.isFunction(type)) {
						throw new Error("Invalid type: " + type);
					}

					if(("default" in descriptor) && !Model.validate(value, type)) {
						throw new InvalidValueError(value, type);
					}
				}
				else if(value != undefined) {
					type = descriptor["type"] = Model.qualify(value);
				}
			}
// TODO: allow arrays of restricted types, like `[Person]`?

			descriptor = Utility.merge({
				writable: true,
				readable: true,
				private: false,
				required: false
			}, descriptor);

			result[property] = descriptor;
		});

		return result;
	};

	/**
	 * @param value Value to validate.
	 * @param {Function} type Either a type or a validator function.
	 * @param {Boolean} throwException Indicates whether some exception should be raised when `value` is not valid.
	 */
	Model.validate = function validate(value, type, throwException) {
		var valid = !type || (value instanceof type);

		if(!valid) {
			var validator;
			if(~Model.types.indexOf(type)) {
				validator = Utility["is" + type.name];
			}
			else if(Utility.isFunction(type)) {
				validator = type;
			}
			else {
				throw new Error("Invalid validator: " + type);
			}

			valid = validator(value);
		}

		if(!valid && throwException) {
			if(!validator) {
				throw new Error("Expected `" + type.name + "`: " + value);
			}
			else {
				throw new Error("Validation failed: " + value);
			}
		}

		return valid;
	};

	Model.types = [Object, Boolean, Number, String, Function, Date, RegExp, Array];
	Model.genericTypes = [Boolean, Number, String];

	Model.getDefaultValue = function getDefaultValue(type) {
		return ~Model.genericTypes.indexOf(type) ? type() : new type();
	};

	Model.qualify = function qualify(value, strict) {
		// `null` or `undefined` let the property of mixed type:
		return !strict && Utility.isFunction(value) ? value : ((value != undefined) ? value.constructor : undefined);
	};

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	function InvalidValueError(value, type) {
		this.message = "Expected `" + type.name + "`: " + value;
		var error = new Error(this.message);
		this.stack = error.stack;
	}

	InvalidValueError.prototype = new Error();
	InvalidValueError.prototype.name = InvalidValueError.name;
	InvalidValueError.prototype.constructor = InvalidValueError;

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	var getOwnScope = Model.getOwnScope;

	return Model;
});