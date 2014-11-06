(function(_, Backbone, Mousetrap) {
    'use strict';

    var oldDelegateEvents = Backbone.View.prototype.delegateEvents;
    var oldUndelegateEvents = Backbone.View.prototype.undelegateEvents;
    var oldRemove = Backbone.View.prototype.remove;

    // We've added these methods to allow multiple views to have keyboard
    // focus.  We'll record the view they came from and just trigger all the
    // callbacks registered for a particular keypress.
    var callbacks = {};
    var processEvent = function (args, key) {
        var self = this;
        var infos = callbacks[key];
        var event = args[0];

        var returnCode = null;
        _.each(infos, function (info) {
             // Do not continue propagating once something says to stop
            if (returnCode === false) return;
            var innerReturnCode = info.method.apply(info.view, args);

            // If any of our handlers return false, pass that along
            if (innerReturnCode === false) {
              returnCode = false;
            }
        });

        return returnCode;
    };

    var addCallback = function (key, view, method) {
        var info = {
            view: view,
            method: method,
        };

        if (key in callbacks) {
            callbacks[key].unshift(info);
        } else {
            callbacks[key] = [info];
        }

        return function () {
            return processEvent(arguments, key);
        };
    };

    var removeCallbacksForView = function (view) {
        _.each(callbacks, function (infos, key) {
            var newInfos =  _.filter(infos, function (info) {
                return info.view !== view
            });

            callbacks[key] = newInfos;
            if (newInfos.length === 0) {
                Mousetrap.unbind(key);
                delete callbacks[key];
            }
        });
    };

    _.extend(Backbone.View.prototype, {

        keyboardEvents: {},

        bindKeyboardEvents: function(events) {
            if (!(events || (events = _.result(this, 'keyboardEvents')))) return;
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
                if (!method) throw new Error('Method "' + events[key] + '" does not exist');
                method = addCallback(key, this, method);


                // Use global-bind plugin when appropriate
                // https://github.com/ccampbell/mousetrap/tree/master/plugins/global-bind
                if ('bindGlobal' in Mousetrap && (key.indexOf('mod') !== -1 || key.indexOf('command') !== -1 || key.indexOf('ctrl') !== -1)) {
                    Mousetrap.bindGlobal(key, method);
                } else {
                    Mousetrap.bind(key, method);
                }
            }
            return this;
        },

        unbindKeyboardEvents: function() {
            removeCallbacksForView(this);
            return this;
        },

        delegateEvents: function() {
            var ret = oldDelegateEvents.apply(this, arguments);
            this.bindKeyboardEvents();
            return ret;
        },

        undelegateEvents: function() {
            var ret = oldUndelegateEvents.apply(this, arguments);
            if (this.unbindKeyboardEvents) this.unbindKeyboardEvents();
            return ret;
        },

        remove: function() {
            var ret = oldRemove.apply(this, arguments);
            if (this.unbindKeyboardEvents) this.unbindKeyboardEvents();
            return ret;
        }

    });
})(_, Backbone, Mousetrap);
