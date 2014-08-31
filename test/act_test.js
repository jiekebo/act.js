'use strict';

var Act = require('../lib/act.js');
var assert = require('should');
var Q = require('q');

var model1 = {fancy: true, fanciness: 10};
var model2 = {cool:false, coolness:2};
var model3 = {awesome:false, awesomeness:42};

// Set up actions.
var action1 = new Act.Action(
  function () { // Init method
    this.state = {
      old: {fancy: true, fanciness: 10},
      new: {fancy: false, fanciness: 5},
      model: model1
    }
    this._redo();
  },
  function () { // Undo method
    this.state.model.fancy = this.state.old.fancy;
    this.state.model.fanciness = this.state.old.fanciness;
  },
  function () { // Redo method
    this.state.model.fancy = this.state.new.fancy;
    this.state.model.fanciness = this.state.new.fanciness;
  },
  function () { // Persist method
    return Q.call();
  },
  function () { // Destroy method
    return Q.call();
  }
);

var action2 = new Act.Action(
  function () { // Init method
    this.state = {
      old: {cool: false, coolness: 2},
      new: {cool: true, coolness: 7},
      model: model2
    }
    this._redo();
  },
  function () { // Undo method
    this.state.model.cool = this.state.old.cool;
    this.state.model.coolness = this.state.old.coolness;
  },
  function () { // Redo method
    this.state.model.cool = this.state.new.cool;
    this.state.model.coolness = this.state.new.coolness;
  },
  function () { // Persist method
    return Q.call();
  },
  function () { // Destroy method
    return Q.call();
  }
);

var action3 = new Act.Action(
  function () { // Init method
    this.state = {
      old: {awesome: false, awesomeness: 2},
      new: {awesome: true, awesomeness: 7},
      model: model2
    }
    this._redo();
  },
  function () { // Undo method
    this.state.model.awesome = this.state.old.awesome;
    this.state.model.awesomeness = this.state.old.awesomeciness;
  },
  function () { // Redo method
    this.state.model.awesome = this.state.new.awesome;
    this.state.model.awesomeness = this.state.new.awesomeciness;
  },
  function () { // Persist method
    return Q.call();
  },
  function () { // Destroy method
    return Q.call();
  }
);

// Instantiate a director
var director = Act.Director;
director.setEventCallback(function (event) {
  console.log(event);
});


describe('actionjs', function() {

  it('should apply single action', function() {
    director.pushAction(action1);
    
    // Asserts
    model1.fancy.should.be.false;
    model1.fanciness.should.be.eql(5);
    director._isUndo().should.be.true;
    director._isRedo().should.be.false;
    director._isSaved().should.be.false;
  });

  it('should undo single action', function() {
    director.undo();
    
    // Asserts
    model1.fancy.should.be.true;
    model1.fanciness.should.be.eql(10);
    director._isUndo().should.be.false;
    director._isRedo().should.be.true;
    director._isSaved().should.be.true;
  });

  it('should redo single action', function() {
    director.redo();

    // Asserts
    model1.fancy.should.be.false;
    model1.fanciness.should.be.eql(5);
    director._isUndo().should.be.true;
    director._isRedo().should.be.false;
    director._isSaved().should.be.false;
  });

  it('should not allow for further redo', function() {
    director.redo().should.be.false;
  });

  it('should save single action', function() {
    director.save();
    
    // Asserts
    director._needle.should.be.eql(1);
    action1._saved.should.be.true;
    director._isUndo().should.be.true;
    director._isRedo().should.be.false;
    director._isSaved().should.be.true;
  });

  it('should undo and destroy single action', function() {
    director.undo();
    director.save();

    // Asserts
    director._needle.should.be.eql(0);
    action1._saved.should.be.false;
    director._isUndo().should.be.false;
    director._isRedo().should.be.true;
    director._isSaved().should.be.true;
  });

  it('should not allow for further undo', function() {
    director.undo().should.be.false;
  });

  it('should reset the director', function() {
    director.reset();

    // Asserts
    director._actionStack.length.should.be.eql(0);
    director._undoStack.length.should.be.eql(0);
    director._destroyStack.length.should.be.eql(0);
    director._needle.should.be.eql(0);
    director._isUndo().should.be.false;
    director._isRedo().should.be.false;
    director._isSaved().should.be.true;
  });

  it('should apply two actions and save them', function() {
    director.pushAction(action1);
    director.pushAction(action2);
    director.save();

    // Asserts
    director._isUndo().should.be.true;
    director._isRedo().should.be.false;
    director._isSaved().should.be.true;
  });

  it('should undo latest action and diverge when new action is added', function(){
    director.undo();
    director.pushAction(action3);
    
    // Asserts
    director._destroyStack.length.should.be.eql(1);
    // Assert that action2 will be destroyed on next save.
    director._destroyStack[0].should.be.eql(action2);
  });

  it('should perform a destroy of action2 and save of action3', function() {
    assert.equal(true, action1._saved);
    director.save();

    // Asserts
    action1._saved.should.be.true;
    action2._saved.should.be.false;
    action3._saved.should.be.true;
    action1._next.should.be.eql(action2);
    action2._next.should.be.eql(action3);
  });

  it('should add a post action and perform it', function(){
    director.save(action3);
    director._actionStack
  });

});
