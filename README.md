# Modelized

## Example

```javascript
function Person(values) {
	Model.initialize(this, values);
}

Model.define(Person, {
	firstName: {type: String, required: true},
	lastName: String,
	birthDate: Date
});
```

Under the hood, `Model` is based on `Aspect` so models could also be initialized with the following, especially if they're given more aspects than only `Model`:

```javascript
function Person(values) {
	Aspect.initialize(this, values);
}
```


## Aspect

### Basics {#basics}

Using `Aspect` is pretty simple: you just have to call `Aspect#initialize` within constructors, like:

```javascript
function Thing() {
	Aspect.initialize(this);
}

Observable.enhance(Thing);
Capable.enhance(Thing);
```

You can also provide arguments for initialization, to every aspects:

```javascript
function Thing(capacity) {
	Aspect.initialize(this, capacity);
}
```

If you need to initialize aspects in particular order feel free to do so but as a counterpart you'll become responsible for initializing each of them properly. You could do so as well if you need to provide different parameters to respective `initialize` functions:

```javascript
function Thing(capacity) {
	Capable.initialize(this, capacity);
	Observable.initialize(this, 15);
}
```

### Defining Aspects

Aspects can be forged from any function, in that way:
```javascript
function Whatever(target) {
    // Well, up to you there...
}

Aspect.define(Whatever);
```
Basically, the aspect function is responsible for enhancing whatever it aims to apply to (usually a prototype or some instance of a constructor). Syntax is quite free here and you could write something like:

```javascript
function Capable(constructor) {
    // `Capable` aspect only aims to give final objects the `getCapacity` method:
	constructor.prototype.getCapacity = function getCapacity() {
	    return this.capacity;
	};
}
```
Also, `Aspect#define` allows you to specify the function responsible for initializing objects - if necessary:
```javascript
Aspect.define(Capable, function initialize(capacity) { // hopefully it can be anonymous
    this.capacity = capacity;
});
```
Once again, syntax is quite free here also. It's really up to developer's intention.

#### Own Scopes

In order to prevent collisions with other aspects or objects' direct properties you could enclose any aspect's stuff into its own scope.
By default, aspects' own scopes are provided at objects' level as pre-defined variables based on aspects' names and could be retrieved with the following:

```javascript
Aspect.define(Capable, function(capacity) {
	var self = this, own = Capable.getOwnScope(self);
	
	own.capacity = capacity;
}
```
Things could be even more tricky if `getOwnScope` is customized, like:

```javascript
Capable.getOwnScope = function(object) {
    var key = "THERE";
	return (object[key] = object[key] || {});
};
```