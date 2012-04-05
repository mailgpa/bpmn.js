(function(global){	// BEGIN CLOSURE

var Joint = global.Joint,
     Element = global.Joint.dia.Element;

/**
 * @name Joint.dia.pn
 * @namespace Holds functionality related to BPMN diagrams.
 */
var bpmn = Joint.dia.bpmn = {};

bpmn.eventSymbols = {};
bpmn.eventSymbols["timer"] = {attrs: {}, path: "m 0,-10 m 0,3 m 5,-2 -1.5,3 m 5.5,1 -3,1.5 m 4,3.5 -3,0 m 2,5 -3,-1.5 m -1,5.5 -1.5,-3 m -3.5,4 0,-3 m -5,2 1.5,-3 m -5.5,-1 3,-1.5 m -4,-3.5 3,0 m -2,-5 3,1.5 m 1,-5.5 1.5,3 m 5.5,-1 -2,7 4,0"};
bpmn.eventSymbols["message"] = {attrs: {}, path: "m -15.5,-15 m 8,11 0,10 16,0 0,-10 z m 0,0 8,6 8,-6"};

bpmn.taskSymbols = {};
bpmn.taskSymbols["serviceTask"] = {attrs: {}, path:"m 0,0 c 0,2.051185 -1.662814,3.714 -3.714,3.714 -2.051186,0 -3.714,-1.662815 -3.714,-3.714 0,-2.051186 1.662814,-3.714 3.714,-3.714 2.051186,0 3.714,1.662814 3.714,3.714 z m 3.59,1.688999 -0.943,2.277 2.563,2.563 -2.393,2.392 -2.561,-2.561 -2.277,0.943 0,3.624 -3.383,0 0,-3.622 -2.277,-0.943 -2.563,2.562 -2.391,-2.392 2.56,-2.561 -0.942,-2.277 -3.624,0 0,-3.383 3.621,0 0.944,-2.276 -2.562,-2.563 2.392,-2.392 2.56,2.56 2.277,-0.941 0,-3.625 3.384,0 0,3.621 2.276,0.943 2.562,-2.562 2.393,2.393 -2.561,2.56 0.943,2.277 3.624,0 0,3.383 z"};
bpmn.taskSymbols["receiveTask"] = bpmn.eventSymbols["message"];
bpmn.taskSymbols["userTask"] = {attrs: {}, path:"m 0,0 c 0,0 1.9698,-1.6982 3.7632,-1.2649 1.7934,0.4333 3.2368,-0.4851 3.2368,-0.4851 0.175,1.1816 0.0294,2.625 -1.0206,3.9088 0,0 0.7581,0.525 0.7581,1.05 0,0.525 0.0875,1.3125 -0.7,2.1 -0.7875,0.7875 -3.85,0.875 -4.725,0 -0.875,-0.875 -0.875,-1.2831 -0.875,-1.8669 0,-0.5838 0.4081,-0.875 0.875,-1.3419 -0.7581,-0.4081 -1.7493,-1.6625 -1.3125,-2.1 z m 7.2632,-0.8169 c 0,2.094208 -1.697692,3.7919 -3.7919,3.7919 -2.094209,0 -3.7919,-1.697692 -3.7919,-3.7919 0,-2.094209 1.697691,-3.7919 3.7919,-3.7919 2.094208,0 3.7919,1.697691 3.7919,3.7919 z m 1.1067,9.8588 0,2.8 m -9.8,-2.8 0,2.8 m -3.7905,0.1169 h 16.8581 v -5.4831 c 0,0 -1.6331,-2.7419 -4.9581,-3.6169 h -6.475 c -3.0919,0.9331 -5.4831,4.025 -5.4831,4.025 l 0.0581,5.075 z"};

bpmn.gatewaySymbols = {};
bpmn.gatewaySymbols["exclusiveGateway"] = {attrs: {"fill": "#000"}, path:"m 5.25,8.43750001 -5.25,8.43749999 4,0 3.25,-5.25 3.25,5.25 3.90625,0 -5.21875,-8.43749999 5.21875,-8.43750001 -3.90625,0 -3.25,5.25 -3.25,-5.25 -4,0 z"};
bpmn.gatewaySymbols["parallelGateway"] = {attrs: {}, path:"m 0,0 19,0 m -9.75,-9.25 0,19"};
bpmn.gatewaySymbols["inclusiveGateway"] = {attrs: {"stroke-width":3}, path:"M 6,-1 a 10 10 0 1 0 0.01 0z"};
bpmn.gatewaySymbols["eventBasedGateway"] = {attrs: {}, path:"m 2,15 -2.80153,-8.62467 7.33682,-5.32958 7.33594,5.3308 -2.80297,8.6242 z"};

bpmn.shapeAttrs = {};
bpmn.shapeAttrs["callActivity"] = {attrs: {"stroke-width":2} };

bpmn.wordwrap = function (label, content, maxWidth) {
	var words = content.split(" ");
		
	var tempText = "";
	for (var i=0; i<words.length; i++) {
	  label.attr("text", tempText + " " + words[i]);
	  if (label.getBBox().width > maxWidth) {
	    tempText += "\n" + words[i];
	  } else {
	    tempText += " " + words[i];
	  }
	}
	
	label.attr("text", tempText.substring(1));
};

/**
 * Predefined arrow for sequence flows
 * @name Joint.dia.bpmn.sequence
 * @memberOf Joint.dia.bpmn
 * @example p1.joint(e2, Joint.dia.bpmn.sequence);
 */
bpmn.sequence = {
    startArrow: {type: "none"},
    endArrow: {type: "basic", size: 5},
    attrs: { "stroke-dasharray": "none" }
};

bpmn.message = {
    startArrow: {type: "none"},
    endArrow: {type: "basic", size: 5, attrs: {fill: "white"} },
    attrs: {}
};

/**
 * BPMN Event.
 * @name Place.create
 * @methodOf Joint.dia.bpmn
 * @param {Object} properties
 * @param {Object} properties.position Position of the place (e.g. {x: 50, y: 100}).
 * @param {Number} [properties.radius] Radius of the circle of the place.
 * @param {Number} [properties.tokenRadius] Radius of the tokens of the place.
 * @param {Number} [properties.tokens] Number of tokens.
 * @param {String} [properties.label] The name of the place.
 * @param {Object} [properties.attrs] SVG attributes of the appearance of the place.
 * @param {Object} [properties.tokenAttrs] SVG attributes of the appearance of the token circles.
 * @example
var p1 = Joint.dia.bpmn.Event.create({
  position: {x: 120, y: 70},
  radius: 25,
  label: "p1",
  attrs: {
    stroke: "blue"
  }
});
 */
bpmn.Event = Element.extend({
     object: "Event",
     module: "bpmn",
     init: function(properties){
	 // options
	 var p = Joint.DeepSupplement(this.properties, properties, {
             radius: 15,
             attrs: { fill: 'white'}
         });
     
     if (p.type) {
     	switch(p.type) {
	     	case "endEvent":
	     	p.attrs["stroke-width"] = 3;
	     	break;
     	}
     }
     var xpos = p.position.x+p.radius;
     var ypos = p.position.y+p.radius;
	 // wrapper
	 var paper = this.paper;
	 this.setWrapper(paper.circle(xpos, ypos, p.radius).attr(p.attrs));
	 // inner
	 var strut = 2; // px

	 // label
	 if (p.label){
	 	 var label = paper.text(xpos, ypos, p.label);
	     this.addInner(label);
	     this.inner[this.inner.length - 1].translate(0, this.inner[this.inner.length - 1].getBBox().height+5);
	 }
	 
	 if (p.type) {
     	switch(p.type) {
	     	case "intermediateThrowEvent":
	     	case "intermediateCatchEvent":
	     	case "boundaryEvent":
			this.addInner(paper.circle(xpos, ypos, p.radius-3).attr(p.attrs));
	     	break;
     	}
     }
     
     if (p.definitions.length > 0) {
     	if (p.definitions.length > 1) {
     		// TODO multiple symbol
     	}else{
	     	var def = p.definitions[0];
	     	var symbol = bpmn.eventSymbols[def];
			var symbolPath = paper.path(symbol.path);
			symbolPath.translate(xpos, ypos);
     		this.addInner(symbolPath);
     	}
     	
     }
	 
     },
     zoom: function(){
	 for (var i = 0, len = this.inner.length; i < len; i++){
	     this.inner[i].scale.apply(this.inner[i], arguments);
	 }
	 if (this.label){
	     this.inner[this.inner.length - 1].remove();
	     var bb = this.wrapper.getBBox();
	     this.inner[this.inner.length - 1] = this.paper.text(bb.x, bb.y, this.properties.label);
	     this.inner[this.inner.length - 1].translate(0, -this.inner[this.inner.length - 1].getBBox().height);
	 }
     }
});

/**
 * BPMN Task.
 * @name Event.create
 * @methodOf Joint.dia.bpmn
 * @param {Object} properties
 * @param {Object} properties.rect Bounding box of the task (e.g. {x: 50, y: 100, width: 30, height: 100}).
 * @param {String} [properties.label] The name of the task.
 * @param {Object} [properties.attrs] SVG attributes of the appearance of the task.
 * @example
var p1 = Joint.dia.bpmn.Task.create({
  rect: {x: 120, y: 70, width: 50, height: 7},
  label: "e1",
  attrs: {
    stroke: "blue",
    fill: "yellow"
  }
});
 */
bpmn.Task = Element.extend({
     object: "Task",
     module: "bpmn",
     draggable: false,
     init: function(properties){
	 // options
	 var p = Joint.DeepSupplement(this.properties, properties, {
             attrs: { stroke: 'black', fill: "90-#000-#ffc:1-#fff" }
         });
	 // wrapper
	 var paper = this.paper;
	 var rect = paper.rect(p.rect.x, p.rect.y, p.rect.width, p.rect.height, 10);
	 if (bpmn.shapeAttrs[p.type]){
	 	rect.attr(bpmn.shapeAttrs[p.type].attrs);
	 }
	 
	 var wrapper = rect.attr(p.attrs);
	 
	 this.setWrapper(wrapper);
	 
	 if (p.label){
		var label = paper.text(p.rect.x, p.rect.y, p.label);
	    this.addInner(label);
	     
		bpmn.wordwrap(label, p.label, p.rect.width);	
	     
	    this.inner[0].translate(wrapper.getBBox().width/2, wrapper.getBBox().height/2);
	 }
	 
	 if(p.type && bpmn.taskSymbols[p.type]) {
	 	console.log("adding task with type:"+p.type);
	 	var typePath = paper.path(bpmn.taskSymbols[p.type].path);
	 	typePath.translate(p.rect.x + 15, p.rect.y + 10);
	 	this.addInner(typePath);
	 }
	 
     },
     zoom: function(){
	 if (this.properties.label){
	     this.inner[0].remove();
	     var bb = this.wrapper.getBBox();
	     this.inner[0] = this.paper.text(bb.x, bb.y, this.properties.label);
	     this.inner[0].translate(0, -this.inner[0].getBBox().height);
	 }
     }
});


bpmn.Participant = Element.extend({
     object: "Participant",
     module: "bpmn",
     init: function(properties){
	 // options
	 var p = Joint.DeepSupplement(this.properties, properties, {
             attrs: { stroke: 'black'}
         });
	 // wrapper
	 var paper = this.paper;
	 var rect = paper.rect(p.rect.x, p.rect.y, p.rect.width, p.rect.height);
	 var wrapper = rect.attr(p.attrs);
	 
	 this.setWrapper(wrapper);
	 
	 if (p.label){
	     var box = wrapper.getBBox();
	     var text = paper.text(box.x + 10 , box.y+box.height/2, p.label);
	     this.addInner(text);

	     console.log("participant box", wrapper.getBBox());
	     this.inner[0].rotate(270);
	     //this.inner[0].translate(box.x, box.y);
	 }
	 
     }
});


/**
 * BPMN Gateway.
 * @name Event.create
 * @methodOf Joint.dia.bpmn
 * @param {Object} properties
 * @param {Object} properties.rect Bounding box of the task (e.g. {x: 50, y: 100, width: 30, height: 100}).
 * @param {String} [properties.label] The name of the task.
 * @param {Object} [properties.attrs] SVG attributes of the appearance of the task.
 * @example
var p1 = Joint.dia.bpmn.Task.create({
  rect: {x: 120, y: 70, width: 50, height: 7},
  label: "e1",
  attrs: {
    stroke: "blue",
    fill: "yellow"
  }
});
 */
bpmn.Gateway = Element.extend({
     object: "Gateway",
     module: "bpmn",
     init: function(properties){
	 // options
	 var p = Joint.DeepSupplement(this.properties, properties, {
             attrs: { stroke: 'black', fill: 'white'}
         });
	 // wrapper
	 var paper = this.paper;
	 var rect = paper.rect(p.rect.x, p.rect.y, p.rect.width, p.rect.height);
	 rect.transform("r45s0.6");
	 
	 var wrapper = rect.attr(p.attrs);
	 
	 this.setWrapper(wrapper);
	 
	 if (p.label){
		 var label = paper.text(p.rect.x, p.rect.y, p.label);
	     this.addInner(label);
	     this.inner[0].translate(wrapper.getBBox().width/2, wrapper.getBBox().height + label.getBBox().height/2);
	 }
	 
	 if (p.type) {
	 	console.log("adding gateway with type:"+p.type);
	 	var symbol = bpmn.gatewaySymbols[p.type];
	 	var typePath = paper.path(symbol.path);
	 	typePath.translate(p.rect.x + wrapper.getBBox().width/2 -3, p.rect.y +wrapper.getBBox().height/2-5);
	 	typePath.attr(symbol.attrs);
	 	this.addInner(typePath);
	 }
	 
     },
     zoom: function(){
	 if (this.properties.label){
	     this.inner[0].remove();
	     var bb = this.wrapper.getBBox();
	     this.inner[0] = this.paper.text(bb.x, bb.y, this.properties.label);
	     //this.inner[0].translate(0, -this.inner[0].getBBox().height);
	 }
     }
});

})(this);	// END CLOSURE
