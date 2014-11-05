var $ = require("./Utility");
var Aspect = require("./Aspect");
var Observable = require("./Observable");
var Registry = require("./Registry");


function Model(definition) {
	// Let's give models the `id` property by default:
	definition = Model.normalize($.merge({id: Number}, definition));

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
	values = values || {};

	// Assumption: here, `self` is a final object:
	var prototype = self.constructor.prototype;
	var prototypeScope = getOwnScope(prototype);
	var definition = prototypeScope.definition;

	$.forOwn(definition, function(descriptor, property) {
		var type = descriptor["type"],
			value = descriptor["default"],
			validator = descriptor["validator"],
			filter = descriptor["filter"],
			required = descriptor.required;

		if(values.hasOwnProperty(property)) {
			value = values[property];

			if(type && !Model.validate(value, type)) {
				throw new InvalidValueError(value, type, property);
			}
		}
		else if(value === undefined) {
			if(property == "id") {
// TODO: detect if "id" property has been overwritten:
				value = prototypeScope.nextInstanceId++;
			}
		}

		Object.defineProperty(self, property, {
			enumerable: true,
			get: function() {
				return own[property];
			},

			set: function(value) {
				// `null` can't fulfill any requirement...
				if(required && value == undefined && (!$.isObject(required, true) || ("either" in required) && values[required["either"]] === undefined)) {
					throw new InvalidValueError(value, type, property);
				}

				if(value !== undefined && !(Model.validate.call(self, value, type) && (!validator || validator.call(self, value)))) {
					throw new InvalidValueError(value, type, property);
				}

				own[property] = filter ? filter(value) : value;
			}
		});

		self[property] = value;
	});

//#if DEVELOPMENT
	self.constructor.trigger("creation", self);
//#end
});


$.merge(Model, {
	define: function define(/* [constructor], definition, [initialize] */) {
		var constructor, definition;

		if($.isFunction(arguments[0]) && $.isObject(arguments[1])) {
			constructor = arguments[0];
			definition = arguments[1];
		}
		else if($.isObject(arguments[0]) && (!arguments[1] || $.isFunction(arguments[1]))) {
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

		$.forOwn(definition, function(descriptor, property) {
			var type, value;

			// `descriptor` may be undefined, which would mean that it is a short descriptor for a mixed-type property.
			var short = (!descriptor || descriptor.constructor !== Object);

			if(short) {
				// Short descriptors are like {color: String} or {age: 0}.
				// Either types could be specified or default values, from what types are to be inferred.
				type = ~Model.types.indexOf(descriptor) ? descriptor : Model.qualify(descriptor);

				// Make `descriptor` a proper object from that point.
				if(descriptor !== type) {
					descriptor = {type: type, default: descriptor};
					value = descriptor["default"];
				}
				else {
					descriptor = {type: type};
				}
			}
			else {
				type = descriptor["type"];

				// Valid types are base types + functions (potential constructors).
				// Note: `undefined` or `null` mean mixed type.
				if(type !== undefined && !~Model.types.indexOf(type) && !$.isFunction(type)) {
					throw new Error("Invalid type: " + type);
				}

				type = type || undefined;
				value = descriptor["default"];

				var validator = descriptor["validator"];
				if(!!validator && !$.isFunction(validator)) {
					throw new Error("Invalid validator: " + validator);
				}

				var filter = descriptor["filter"];
				if(!!filter && !$.isFunction(filter)) {
					throw new Error("Invalid filter: " + filter);
				}

				// Infer type, when it is not specified, from default value.
				if(!type && value !== undefined) {
					// If default value is a function then `type` should be Function.
					type = $.isFunction(value) ? Function : Model.qualify(value);
				}
			}

			descriptor["type"] = type;

			if("default" in descriptor) {
				// Filters apply to default values as well.
				if(filter) {
					value = filter(value);
				}

				if(validator && !validator(value) || !Model.validate(value, descriptor)) {
					throw new InvalidValueError(value, type, property);
				}

				descriptor["default"] = value;
			}

// TODO: allow arrays of restricted types, like `[Person]`?

			descriptor = $.merge({
/*
				writable: true,
				readable: true,
				private: false,
				required: false
//*/
			}, descriptor);

			result[property] = descriptor;
		});

		return result;
	},

	/**
	 * @param value Value to validate.
	 * @param {Function|Object} type Either a type or a property descriptor.
	 * @param {Boolean} throwException Indicates whether some exception should be raised when `value` is not valid.
	 *
	 * @return true|false
	 */
// TODO: validate should validate "required"
	validate: function validate(value, type) {
// TODO: use `this` to validate the value forZ the related object
		var descriptor = $.isObject(type, true) ? type : {type: type};
		type = descriptor["type"];
		if(type !== undefined && !$.isFunction(type)) {
			throw new Error("Invalid type: " + type);
		}

		var valid = !type || (value instanceof type);

		if(!valid) {
			var validator;
			if(~Model.types.indexOf(type)) {
				validator = $["is" + type.name];
			}
			else if($.isFunction(type)) {
				validator = type;
			}
			else {
				throw new Error("Invalid validator: " + type);
			}

			valid = validator(value);
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
		return (type !== undefined) ? (~Model.genericTypes.indexOf(type) ? type() : new type()) : undefined;
	},

	/**
	 * Determines what kind `value` is of. `null` or `undefined` qualify as mixed type, other objects as their constructor.
	 * Examples: `"ABC"`: String, `123`: Number, `true`: Boolean, {key:value}`: Object, etc.
	 * Finally, constructors don't qualify as functions but as... themselves; example: `Thing`: Thing.
	 */
	qualify: function qualify(value) {
		return (value != undefined) ? value.constructor : undefined;
	},

	inherit: function inherit(model, parent) {
		var definition = getOwnScope(model.prototype).definition;

		model.parent = parent;
		model.prototype = Object.create(parent.prototype, {
			constructor: {
				value: model,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});

		// Here, parent & model's prototypes share the same "own" scope so we've got to isolate them from each others.
		var scope = getOwnScope(model.prototype);
		scope = setOwnScope(model.prototype, $.clone(scope, true));

		scope.definition = $.merge(scope.definition, definition);
	}
});


// Custom error used to formalize how value validation works.
function InvalidValueError(value, type, property) {
	this.message = "Invalid value" + (property ? " for property \"" + property + "\"" : "") + "! Expected: `" + (type && type.name || type) + "`, provided: (" + (typeof value) + ") " + value;
	var error = new Error(this.message);
	this.stack = error.stack;
}

InvalidValueError.prototype = new Error();
InvalidValueError.prototype.name = InvalidValueError.name;
InvalidValueError.prototype.constructor = InvalidValueError;


// Default `setOwnScope` & `getOwnScope` methods defined by Aspect:
var setOwnScope = Model.setOwnScope;
var getOwnScope = Model.getOwnScope;


module.exports = Model;