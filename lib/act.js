/*
 * Act.js
 * https://github.com/jiekebo/act.js
 *
 * Copyright (c) 2014 Jacob Salomonsen
 * Licensed under the MIT license.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['lodash', 'exports'], function(_, exports) {
      root.Act = factory(root, exports, _);
    });
  } else if (typeof exports !== 'undefined') {
    var _ = require('lodash');
    factory(root, exports, _);
  } else {
    root.Act = factory(root, {}, root._, root.Q);
  }
}(this, function (root, Act, _) {
  'use strict';

  // Prototype which encapsulates the action performed by the user.
  // The action should contain logic to undo the action as well.
  Act.Action = function(initMethod, undoMethod, redoMethod, persistMethod, destroyMethod) {
    // Suggested layout of state.
    this.state = {};
    this.state.new = {};
    this.state.old = {};
    // User must supply these methods to mutate state.
    // Perhaps make init method return state instead of having to assign this in the init method
    this._init = initMethod;
    this._undo = undoMethod;
    this._redo = redoMethod;
    // Private state of the action.
    this._saved = false;
    this._next = null;
    // Metod for persisting as serial actions.
    this.waterfall = function () {
      if (this._saved) {
        destroyMethod(this.state).then(this.callback(false));
      } else {
        persistMethod(this.state).then(this.callback(true));
      }
    };
    // Callback used in waterfall persist, calling next action in the waterfall.
    this.callback = function (saveState) {
      this._saved = saveState;
      if (this._next) {
        this._next.waterfall();
        delete this._next;
      }
    };
  };

  // Director makes sure actions are handled corectly by maintaining a stack of undo-
  // able actions. The actions can be persisted to backend and undone, which will
  // destroy them entirely. Still the actions are kept safely for redoing.
  Act.Director = {
    _actionStack: [],
    _undoStack: [],
    _destroyStack: [],
    _needle: 0,
    _eventCallback: function() {},

    pushAction: function(action) {
      // If actions have been undone, pushing an action will diverge.
      if (this._undoStack.length > 0) {
        _.forEach(this._undoStack, _.bind(function(action){
          // If undone actions have been saved, they must be destroyed on next save.
          // Since the flow diverges these actions can never be reached.
          if (action._saved) {
            this._destroyStack.push(action);
          }
        }, this));
        if (this._destroyStack.length > 0) {
          // Setting save point back to latest undiverged action.
          this._needle = this._actionStack.length;
        }
        // Remove diverged undone actions, the persisted ones are in destroyStack.
        this._undoStack = [];
      }
      // Initialize the action and add it to the action stack.
      action._init();
      this._actionStack.push(action);
      this._updateState();
    },

    undo: function() {
      if (!this._isUndo()) {
        return false;
      }
      var action = this._actionStack.pop();
      action._undo();
      this._undoStack.push(action);
      this._updateState();
    },

    redo: function() {
      if (!this._isRedo()) {
        return false;
      }
      var action = this._undoStack.pop();
      action._redo();
      this._actionStack.push(action);
      this._updateState();
    },

    save: function(postAction) {
      var saveStack = [];

      // Check for actions that need destroying.
      _.forEach(this._destroyStack, function (action){
        saveStack.push(action);
      });
      this._destroyStack.length = 0;

      // Actions which have been undone must be destroyed on save.
      _.forEach(this._undoStack, function(action) {
        if (action._saved) {
          saveStack.push(action);
        }
      });

      // Assign all pending save actions.
      _.forEach(_.rest(this._actionStack, this._needle), function(action) {
        saveStack.push(action);
      });

      // If there is a post action to perform, add it to the save stack.
      if (postAction) {
        postAction._init();
        saveStack.push(postAction);
      }

      // Chain actions.
      for (var i = 0; i < saveStack.length - 1; i++) {
        saveStack[i]._next = saveStack[i + 1];
      }

      // Initiate waterfall.
      saveStack[0].waterfall();
      this._needle = this._actionStack.length;
      this._updateState();
    },

    reset: function() {
      this._actionStack.length = 0;
      this._undoStack.length = 0;
      this._destroyStack.length = 0;
      this._needle = 0;
      this._updateState();
    },

    setEventCallback: function(eventCallback) {
      this._eventCallback = eventCallback;
    },

    _updateState: function() {
      this._eventCallback({
        saved: this._isSaved(),
        undo: this._isUndo(),
        redo: this._isRedo()
      });
    },

    _isRedo: function() {
      return this._undoStack.length > 0;
    },

    _isUndo: function() {
      return this._actionStack.length > 0;
    },

    _isSaved: function() {
      return this._needle === this._actionStack.length;
    }
  };

  return Act;

}));
