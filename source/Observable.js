define(["Aspect"], function(Aspect) {
	function Observable(options) {
// TODO: support wildcard events
		this.trigger = function trigger(event) {
			var self = this, own = getOwnScope(self);

			var observers = own.observers[event];

			if(observers) {
				var parameters = Array.prototype.slice.call(arguments, 1);
				var now = new Date();
				observers.forEach(function(observer) {
					var context = {event: event, observable: self, observer: observer, date: now};
					observer.apply(context, parameters);
				});
			}
		};

		this.attachObserver = function attachObserver(event, observer) {
			var self = this, own = getOwnScope(self);

			var observers = own.observers[event];

			if(!observers) {
				observers = own.observers[event] = [];
			}

			observers.push(observer);

			return self;
		};

		this.attach = this.on = this.attachObserver;

		this.detachObserver = function detach(observer, event) {
			var self = this;
			var own = getOwnScope(self);

			var events = event ? [event] : Object.keys(own.observers);

			events.forEach(function(event) {
				var observers = own.observers[event] || [];

				var index = observers.indexOf(observer);
				if(~index) {
					observers.splice(index, 1);
				}
			});

			return self;
		};

		this.detach = this.detachObserver;
	}

	Aspect.define(Observable, function initialize() {
		var self = this, own = getOwnScope(self);

		own.observers = {};
	});

	var getOwnScope = Observable.getOwnScope;

	return Observable;
});