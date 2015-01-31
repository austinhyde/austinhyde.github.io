---
title: Two-Way Data Binding in JavaScript
date: 2015-01-31
tags: reinventing-the-wheel, knockout, javascript
---

I've seen an increasingly large number of people claiming you need cutting-edge JavaScript features or fancy frameworks in order to effectively do two-way data binding. To the contrary, it's a rather simple thing to implement, using standard features that work all the way back to IE 6!

## Observables

Let's start basic - first and foremost, you need a way to tell when data changes. Traditionally, this is done via an [Observer pattern](http://sourcemaking.com/design_patterns/observer), but a full-blown implementation of that is a little clunky for nice, lightweight JavaScript. So, if native getters/setters are out, the only mechanism we have are accessors:

```js
var n = 5;
function getN() { return n; }
function setN(newN) { n = newN; }

console.log(getN()); // 5
setN(10);
console.log(getN()); // 10
```

That's a little boring though, let's rearrange that to just a single function:

```js
var _n = 5;
function n(n) {
  if (arguments.length) _n = n;
  return _n;
}

console.log(n()); // 5
n(10);
console.log(n()); // 10
```

Now, suppose we want to notify stuff when the value changes...

```js
var _n = 5, _nListeners = [];
function n(n) {
  if (arguments.length && n !== _n) {
    _n = n;
    _nListeners.forEach(function(listener) { listener(n); });
  }
  return _n;
}
n.subscribe = function(listener) { _nListeners.push(listener); }

console.log(n()); // 5
n.subscribe(function(newN) { console.log(newN); });
n(10); // logs 10
n(10); // no output, value didn't change.
```

Note that we don't notify subscribers that the value changed, if the value didn't actually change!

That's a real pain in the ass if we want to be doing that a lot, so let's wrap it up in a neat little generator function:

```js
function observable(value) {
  var listeners = [];

  function notify(newValue) {
    listeners.forEach(function(listener){ listener(newValue); });
  }

  function accessor(newValue) {
    if (arguments.length && newValue !== value) {
      value = newValue;
      notify(newValue);
    }
    return value;
  }

  accessor.subscribe = function(listener) { listeners.push(listener); };

  return accessor;
}

var n = observable(5);
n.subscribe(function(newN) { console.log(newN); });
n(10); // logs 10
```

Cool! Now we're getting somewhere! Using `observable()`, we can now have as many little pre-packaged observable values as we want!

The next step is learning how to combine them. Suppose we want to do some basic math and add two observables together. We can't just do `c(a() + b())`, because `c` won't know when `a` or `b` change - it will get set once, but that's it. What we need to do is subscribe to changes on `a` or `b`, so that when either of them change, we update `c`:

```js
var a = observable(3), b = observable(2);

var c = observable(a() + b());

a.subscribe(function(){ c(a() + b()); });
b.subscribe(function(){ c(a() + b()); });

console.log(c()); // 5
a(10);
console.log(c()); // 12
b(7);
console.log(c()); // 17
```

Now, if you're feeling clever, you'll notice that there's a lot of repetition going on there. We can fix that by pulling out functions:

```js
var a = observable(3), b = observable(2);

function calculation() { return a() + b(); }

var c = observable(calculation());

function listener() { c(calculation()); }
a.subscribe(listener);
b.subscribe(listener);
```

As it happens, updating dependent values this way turns out to be very common. In fact, it's really the same thing as normal JavaScript operations, except in an observable way. Wouldn't it be cool if we could automatically set up those subscriptions?

Let's start by wrapping up the boilerplate above. We need a way to calculate the value of the observable, and we need to know the observables that participate in that calculation. We'll call this variation on an `observable` a `computed` value:

```js
function computed(calculation, dependencies) {
  // start with the initial value
  var value = observable(calculation());

  // register a listener for each dependency, that updates the value
  function listener() { value(calculation()); }
  dependencies.forEach(function(dependency) {
    dependency.subscribe(listener);
  });

  // now, wrap the value so that users of computed() can't manually update the value
  function getter() { return value(); }
  getter.subscribe = value.subscribe;

  return getter;
}
```

Note that we wrap the observable that we're calculating the value of in a read-only version. Because what would it mean for code to manually set the value of a calculation? If you literally say that, for example, `c` is the sum of `a + b`, it really doesn't make much sense to come along later and set `c` to five. What happens if `a` or `b` update? They'd overwrite that value anyways. Therefore, we avoid any confusion by returning a read-only accessor.

Let's put this to use:

```js
var a = observable(3), b = observable(2);
var c = computed(function(){ return a() + b(); }, [a, b]);

console.log(c()); // 5
a(10);
console.log(c()); // 12
b(7);
console.log(c()); // 17
```

Woo hoo! Now we're chugging!

## Binding

The second big hurdle we need to clear is data binding. Frameworks like Angular and React tackle this in big, complex, scary ways. I don't know about you, but I don't like scary.

Let's continue with the adding example, but now let's represent it with text boxes:

```html
<input type="text" id="a-text">
+
<input type="text" id="b-text">
=
<input type="text" id="c-text" readonly>
```

The first challenge is how to get our observables into the text boxes. Turns out, that's pretty easy (assuming `a`, `b`, `c` from above):

```js
var aText = document.getElementById('a-text');
aText.value = a();
a.subscribe(function(_a){ aText.value = _a; });

var bText = document.getElementById('b-text');
bText.value = b();
b.subscribe(function(_b){ bText.value = _b; });

var cText = document.getElementById('c-text');
cText.value = c();
c.subscribe(function(_c){ cText.value = _c; });
```

*Sigh* again with the repetition. Let's clean that up:

```js
function bindValue(input, observable) {
  input.value = observable();
  observable.subscribe(function(){ input.value = observable(); });
}

bindValue(aText, a);
bindValue(bText, b);
bindValue(cText, c);
```

Much better! The second half of the problem is updating our values when the text boxes change. That's pretty easy too, actually. All we need to do is listen to events on the input, and update the observable accordingly. Let's just update our `bindValue` function:

```js
function bindValue(input, observable) {
  input.value = observable();
  observable.subscribe(function(){ input.value = observable(); });

  input.addEventListener('input', function() {
    observable(input.value);
  });
}
```

Now, whenever the textbox value changes, we'll update the observable, and when the observable changes, we update the textbox. We have lift-off!

Well, actually, only in theory. We need to make a slight adjustment for this particular example - we've been doing math with integers, but text box values are strings. Adding two strings concatenates them, it doesn't add their numeric values!

To solve this, we can just fix our definition of `c`:

```js
var c = computed(function(){ return parseFloat(a()) + parseFloat(b()); }, [a, b]);
```

## Putting it all together

Here's all of our JavaScript so far:

```js
function observable(value) {
  var listeners = [];

  function notify(newValue) {
    listeners.forEach(function(listener){ listener(newValue); });
  }

  function accessor(newValue) {
    if (arguments.length && newValue !== value) {
      value = newValue;
      notify(newValue);
    }
    return value;
  }

  accessor.subscribe = function(listener) { listeners.push(listener); };

  return accessor;
}

function computed(calculation, dependencies) {
  var value = observable(calculation());

  function listener(v) {value(calculation()); }
  dependencies.forEach(function(dependency) {
    dependency.subscribe(listener);
  });

  function getter() { return value(); }
  getter.subscribe = value.subscribe;

  return getter;
}

function bindValue(input, observable) {
  input.value = observable();
  observable.subscribe(function(){ input.value = observable(); });

  input.addEventListener('input', function() {
    observable(input.value);
  });
}

var aText = document.getElementById('a-text');
var bText = document.getElementById('b-text');
var cText = document.getElementById('c-text');

var a = observable(3), b = observable(2);
var c = computed(function(){ return parseFloat(a()) + parseFloat(b()); }, [a, b]);

bindValue(aText, a);
bindValue(bText, b);
bindValue(cText, c);
```

And our HTML:

```html
<input type="text" id="a-text">
+
<input type="text" id="b-text">
=
<input type="text" id="c-text" readonly>
```

And, I'll even throw in a live demo!

<div class="example">
<input type="text" id="a-text"> + <input type="text" id="b-text"> = <input type="text" id="c-text" readonly>
<script type="text/javascript">
function observable(value) {
  var listeners = [];

  function notify(newValue) {
    listeners.forEach(function(listener){ listener(newValue); });
  }

  function accessor(newValue) {
    if (arguments.length && newValue !== value) {
      value = newValue;
      notify(newValue);
    }
    return value;
  }

  accessor.subscribe = function(listener) { listeners.push(listener); };

  return accessor;
}

function computed(calculation, dependencies) {
  var value = observable(calculation());

  function listener(v) {value(calculation()); }
  dependencies.forEach(function(dependency) {
    dependency.subscribe(listener);
  });

  function getter() { return value(); }
  getter.subscribe = value.subscribe;

  return getter;
}

function bindValue(input, observable) {
  input.value = observable();
  observable.subscribe(function(){ input.value = observable(); });

  input.addEventListener('input', function() {
    observable(input.value);
  });
}

var aText = document.getElementById('a-text');
var bText = document.getElementById('b-text');
var cText = document.getElementById('c-text');

var a = observable(3), b = observable(2);
var c = computed(function(){ return parseFloat(a()) + parseFloat(b()); }, [a, b]);

bindValue(aText, a);
bindValue(bText, b);
bindValue(cText, c);
</script>

As you can see, we were able to implement a proof-of-concept two-way data-binding example using nothing but vanilla JavaScript, that's compatible all the way back to IE 6!

Not only is our solution lightweight, with the whole "framework" being less than 50 lines total, but using it is very nearly as easy and expressive as its non-observable counterparts.

In fact, it turns out you can take this simple implementation very, very far. I'll leave it as an exercise to the reader to implement, but using this code as a base, you can:

* Automatically detect referenced observables in computeds
* Manage entire observable arrays and objects containing other observables
* Have properly managed cyclic dependencies between computeds
* Implement many many many differnet bindings from observables to DOM, not just input values
* Declare bindings as data attributes directly in the HTML, and apply them wholesale
* and much, much more.

How do I know you can do this? Because this is exactly the same approach that Steve Sanderson's (amazing, excellent, stupdendous) [Knockout](http://knockoutjs.com/) library takes. What I listed here - observables, computeds, and DOM bindings, are the core foundations of Knockout. What I love most about it though, is that I can summarize how Knockout works in 50 lines of code, by iteration on a very simple idea.

For some reference, here's what this whole example looks like in Knockout:

```html
<input type="text" data-bind="value: a">
+
<input type="text" data-bind="value: b">
=
<input type="text" data-bind="value: c" readonly>

<script>
var a = ko.observable(3);
var b = ko.observable(2);
var c = ko.computed(function() { return parseFloat(a()) + parseFloat(b()); });
ko.applyBindings({ a: a, b: b, c: c });
</script>
```