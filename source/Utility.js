var helper = require("lodash");

var isObject = helper.isObject;

helper.mixin({
	capitalize: function(text) {
		return text.charAt(0).toUpperCase() + text.slice(1);
	},

	isDefined: function(thing) {
		return !helper.isUndefined.apply(helper, arguments);
	},

	isObject: function(thing, plain) {
		return plain ? helper.isPlainObject(thing) : isObject(thing);
	}
});

module.exports = helper;