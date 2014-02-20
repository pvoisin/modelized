var helper = require("lodash");

helper.mixin({
	capitalize: function(text) {
		return text.charAt(0).toUpperCase() + text.slice(1);
	},

	isDefined: function(thing) {
		return !helper.isUndefined.apply(helper, arguments);
	}
});

module.exports = helper;