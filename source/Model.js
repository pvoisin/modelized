var Utility = require("./Utility");
var Aspect = require("./Aspect");
var Observable = require("./Observable");
var Registry = require("./Registry");


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

//#if DEVELOPMENT
	Observable.enhance(constructor);
	Observable.initialize(constructor);
//#end

	return constructor;
}


Aspect.define(Model, function initialize(values) {
	var self = this, own = getOwnScope(self);

	// Assumption: here, `self` is a final object:
	var prototype = self.constructor.prototype;
	var prototypeScope = getOwnScope(prototype);
	var definition = prototypeScope.definition;

	Utility.forOwn(own.definition, function(descriptor, property) {
		var type = descriptor["type"],
			value = descriptor["default"],
			validator = descriptor["validator"];

		if(values && values.hasOwnProperty(property)) {
			value = values[property];

			if(type && !Model.validate(value, type)) {
				throw new InvalidValueError(value, type, property);
			}
		}
		else if(value === undefined) {
			var required = descriptor.required;

			if(required && (!("either" in required) || values[required["either"]] === undefined)) {
				throw new InvalidValueError(value, type, property);
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
			enumerable: true,
			get: function() {
				return own[property];
			},

			set: function(value) {
				if(type && !(Model.validate.call(self, value, type) && (!validator || validator.call(self, value)))) {
					throw new InvalidValueError(value, type, property);
				}

				own[property] = value;
			}
		});
	});

//#if DEVELOPMENT
	self.constructor.trigger("creation", self);
//#end
});


Utility.merge(Model, {
	define: function define(/* [constructor], definition, [initialize] */) {
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
	},

	/** Normalizes a model definition into its most explicit form. */
	normalize: function normalize(definition) {
		var result = {};

		Utility.forOwn(definition, function(descriptor, property) {
			var type, value;

			var short = (!descriptor || descriptor.constructor !== Object);

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
						throw new InvalidValueError(value, type, property);
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
	},

	/**
	 * @param value Value to validate.
	 * @param {Function} type Either a type or a validator function.
	 * @param {Boolean} throwException Indicates whether some exception should be raised when `value` is not valid.
	 */
	validate: function validate(value, type, throwException) {
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
	},

	/** Supported types. */
	types: [Object, Boolean, Number, String, Function, Date, RegExp, Array],

	/** Generic types (Boolean, Number, String). */
	genericTypes: [Boolean, Number, String],

	/**
	 * Returns the default value for the given type. If `type` is a generic type then it returns JavaScript engine's default
	 * value for such a type. If it is constructor then it returns a default instance (constructed with no parameters).
	 */
	getDefaultValue: function getDefaultValue(type) {
		return ~Model.genericTypes.indexOf(type) ? type() : new type();
	},

	/**
	 * Determines what kind `value` is of. `null` or `undefined` qualify as mixed type, other objects as their constructor.
	 * Examples: `"ABC"`: String, `123`: Number, `true`: Boolean, {key:value}`: Object, etc.
	 * Finally, constructors don't qualify as functions but as... themselves; example: `Thing`: Thing.
	 */
	qualify: function qualify(value, strict) {
		// `null` or `undefined` let the property of mixed type:
		return !strict && Utility.isFunction(value) ? value : ((value != undefined) ? value.constructor : undefined);
	}
});


// Custom error used to formalize how value validation works.
function InvalidValueError(value, type, property) {
	this.message = "Invalid value" + (property ? " for property \"" + property + "\"" : "") + "! Expected: `" + type.name + "`, provided: " + value;
	var error = new Error(this.message);
	this.stack = error.stack;
}

InvalidValueError.prototype = new Error();
InvalidValueError.prototype.name = InvalidValueError.name;
InvalidValueError.prototype.constructor = InvalidValueError;


// Default `getOwnScope` method defined by Aspect:
var getOwnScope = Model.getOwnScope;


module.exports = Model;