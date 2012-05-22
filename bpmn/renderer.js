define(["dojo/dom", "dojo/_base/xhr", "dojo/_base/array", "dojo/domReady!"], function(dom, xhr, array) {

	String.prototype.endsWith = function(suffix) {
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
	
	Raphael.fn.arrowHead = function (x1, y1, x2, y2, size, pathOnly) {
		var angle = Math.atan2(x1-x2,y2-y1);
		angle = (angle / (2 * Math.PI)) * 360;
		var pathString = "M" + x2 + " " + y2 + " L" + (x2  - size -5) + " " + (y2  - size) + " L" + (x2  - size -5)  + " " + (y2  + size) + " L" + x2 + " " + y2+"Z";
		if (pathOnly) {
			return pathString;
		}
		var arrowPath = this.path(pathString).attr("fill","black").rotate((90+angle),x2,y2);
		return arrowPath;
	};
	
	
	Raphael.fn.connection = function (source, target, points, incoming) {
		var original = undefined;
		var sourceAnchor = undefined;
		var targetAnchor = undefined;
		
		if (source && source.source && source.target) {
        	var dx = target;
        	var dy = points;
        	
        	original = source;
        	points = original.points;
        	target = original.target;
        	source = original.source;
        	sourceAnchor = original.sourceAnchor;
        	targetAnchor = original.targetAnchor;
        	
        	if (incoming == true) {
        		targetAnchor.x += dx;
				targetAnchor.y += dy;
				points[points.length -1].x = targetAnchor.x;
				points[points.length -1].y = targetAnchor.y;
				targetAnchor.set.transform("...T"+dx+","+dy);
        	}else{
				sourceAnchor.x += dx;
				sourceAnchor.y += dy;
				points[0].x = sourceAnchor.x;
				points[0].y = sourceAnchor.y;
				sourceAnchor.set.transform("...T"+dx+","+dy);
			}
			
    	}else {
    		sourceAnchor = { x : new Number(points[0].x), y: new Number(points[0].y) , set: this.set() };
			targetAnchor = { x : new Number(points[points.length -1].x), y: new Number(points[points.length -1].y) , set: this.set() };
    	}
		
		
		var beforeLast = { x : new Number(points[points.length -2].x), y: new Number(points[points.length -2].y) };
		if (points.length == 2) {
			beforeLast = sourceAnchor;
		}
		
		var pathArr = [];
	    
	    if (incoming === true) {
		    pathArr.push("M");
		    pathArr.push(targetAnchor.x);
		    pathArr.push(targetAnchor.y);

		    for (var i = points.length-1; i--;) {
				pathArr.push("L");
				pathArr.push(points[i].x);
				pathArr.push(points[i].y);
        	}
        }else {
	        array.forEach(points, function (point, index) {
		    	if (index == 0) {
		    		pathArr.push("M");
		    		pathArr.push(sourceAnchor.x);
		    		pathArr.push(sourceAnchor.y);
		    	}else {
		    		pathArr.push("L");
		    		pathArr.push(point.x);
		    		pathArr.push(point.y);
		    	}
		    });
        }
	    
	    var color = "#000";
	    var path = pathArr.join(",");
	    
	    if (original) {
			original.line.attr({path : path});

			var attrs = original.arrow.attrs;
			delete attrs.path;

			original.arrow.remove();
			original.arrow = this.arrowHead(beforeLast.x, beforeLast.y, targetAnchor.x, targetAnchor.y, 4);
			original.arrow.attr(attrs);

			return original;
		}
	    
	    return {
	    	arrow : this.arrowHead(beforeLast.x, beforeLast.y, targetAnchor.x, targetAnchor.y, 4), 
	    	line : this.path(path).attr({stroke: color, fill: "none", "stroke-width" : 2}),
	    	source : source,
	    	target : target,
	    	sourceAnchor : sourceAnchor,
	    	targetAnchor : targetAnchor,
	    	points : points
	    };
	};
	
	/**
	 * Taken from rom the official RaphaelJS Documentation and adopted for bpmn.js
	 * @param obj1
	 * @param obj2
	 * @returns new connection
	 */
	Raphael.fn.connection2 = function (obj1, obj2, points, dynamic) {
	    var update = false;
	    var original = undefined;
	    
	    if (obj1.from && obj1.to) {
        	update = true;
	    	original = obj1;
        	obj1 = original.from;
        	obj2 = original.to;
        	points = original.points;
    	}
	    
	    var bb1 = obj1.baseElem.getBBox(),
	        bb2 = obj2.baseElem.getBBox(),
	        p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
	        {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
	        {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
	        {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
	        {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
	        {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
	        {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
	        {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}],
	        d = {}, dis = [];
	    for (var i = 0; i < 4; i++) {
	        for (var j = 4; j < 8; j++) {
	            var dx = Math.abs(p[i].x - p[j].x),
	                dy = Math.abs(p[i].y - p[j].y);
	            if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
	                dis.push(dx + dy);
	                d[dis[dis.length - 1]] = [i, j];
	            }
	        }
	    }
	    if (dis.length == 0) {
	        var res = [0, 4];
	    } else {
	        res = d[Math.min.apply(Math, dis)];
	    }
	    var x1 = p[res[0]].x,
	        y1 = p[res[0]].y,
	        x4 = p[res[1]].x,
	        y4 = p[res[1]].y;
		
	    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
	    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
	    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
	        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
	        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
	        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
	        
	    if (points) {
			if (!dynamic==true) {
				x1 = new Number(points[0].x);
				y1 = new Number(points[0].y);
			}
			x4 = new Number(points[points.length-1].x);
			y4 = new Number(points[points.length-1].y);
			x3 = new Number(points[points.length-2].x);
			y3 = new Number(points[points.length-2].y);
		}
	    
	    var path = undefined;
	    
    	//path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");

	    if (points) {
	    	pathArr = [];
	    	array.forEach(points, function (point, index) {
	    		if (index == 0) {
	    			pathArr.push("M");
	    			pathArr.push(x1);
	    			pathArr.push(y1);
	    		}else {
	    			pathArr.push("L");
	    			pathArr.push(point.x);
	    			pathArr.push(point.y);
	    		}
	    	});
	    	path = pathArr.join(",");
	    }
	    
	    // Arrow
	    /* magnitude, length of the last path vector */
	    var mag = Math.sqrt((y4 - y3) * (y4 - y3) + (x4 - x3) * (x4 - x3));
	    /* vector normalisation to specified length  */
	    var norm = function(x,l){return (-x*(l||5)/mag);};
	    /* calculate array coordinates (two lines orthogonal to the path vector) */
	    var arr = [
	        {x:(norm(x4-x3)+norm(y4-y3)+x4).toFixed(3), y:(norm(y4-y3)+norm(x4-x3)+y4).toFixed(3)},
	        {x:(norm(x4-x3)-norm(y4-y3)+x4).toFixed(3), y:(norm(y4-y3)-norm(x4-x3)+y4).toFixed(3)}
	    ];
	    var color = "#000";
        
	    var arrowDef = "M"+arr[0].x+","+arr[0].y+
	    				",L"+x4+","+y4+
	    				",L"+arr[1].x+","+arr[1].y+
	    				",L"+arr[0].x+","+arr[0].y+
	    				"Z";
	    				
		if (points) {
			var arrowPath = this.arrowHead(x3,y3,x4,y4, 4);
		}
		else{
			var arrowPath = this.path(arrowDef).attr({stroke: color, fill: "black"});
		} 
		
		if (update == true) {
			original.line.attr({path : path});
			original.arrow.attr({path : arrowPath});
		}else{
			return {
            line: this.path(path).attr({stroke: color, fill: "none"}),
            arrow: arrowPath,
            from: obj1,
            to: obj2,
            points: points,
            sourceAnchor : {x : x1, y: y1}
        };
		}

	};
	
	var bpmn = {};

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
	
	return (function () {
		var paper = undefined;
		
		var module = {};
		
		module.init = function (diagramElement, width, height) {
			paper = Raphael(dom.byId(diagramElement), width, height);
			return paper;
		};
		
		module.clear = function() {
			if (paper) {
				paper.clear();
			}
		};
		
		module.fix = function() {
			paper.safari();
		};
		
		module.connection = function(connection, dx, dy, incoming) {
			var con = paper.connection(connection, dx, dy, incoming);
			module.fix();
			return con;
		};
		
		module.renderFlow = function (id, source, target, waypoints, flowType, flow, dynamic) {
			var set = paper.set();
			
			var connection = paper.connection(source, target, waypoints, dynamic);
			connection.id = id;
			
			if( flowType == "message" ) {
				connection.line.attr({"stroke-dasharray" : "--"});
				connection.arrow.attr({fill: "white", "stroke-width": 1});
				connection.arrow.toFront();
				connection.sourceAnchor.set.push(paper.circle(connection.sourceAnchor.x, connection.sourceAnchor.y, 5).attr({ fill: 'white' }));
			}
			
			if (source) {
				source.outgoing.push(connection);
			}
			
			if (target) {
				target.incoming.push(connection);
			}
			
			set.push(connection.arrow);
			set.push(connection.line);
			
			return {"set" : set, handle : set, baseElem : connection.line, extSet : paper.set() };
		};
		
		module.renderParticipant = function(props) {
			props.attrs =  {
					stroke: 'black'
			};
			var set = paper.set();
			
			var rect = paper.rect(props.rect.x, props.rect.y, props.rect.width, props.rect.height);
			rect.attr(props.attrs);
			set.push(rect);
		
			if (props.label) {
				var box = rect.getBBox();
				var text = paper.text(box.x + 10, box.y + box.height / 2, props.label);
				text.rotate(270);
				set.push(text);
				console.log("participant box", rect.getBBox());
			}
			return {"set" : set, handle : set, baseElem : rect, extSet : paper.set()};
		};
		
		module.renderGateway = function(props) {
			props.attrs = {
					stroke: 'black',
					fill: 'white'
			};
			
			var set = paper.set();
			// wrapper
			var rect = paper.rect(props.rect.x, props.rect.y, props.rect.width, props.rect.height);
			rect.transform("r45s0.75");
			rect.attr(props.attrs);

			set.push(rect);
		
			if (props.label) {
				var label = paper.text(props.rect.x, props.rect.y, props.label);
				label.translate(rect.getBBox().width / 2, rect.getBBox().height + label.getBBox().height / 2);
				set.push(label);
			}
		
			if (props.type) {
				console.log("adding gateway with type:" + props.type);
				var symbol = bpmn.gatewaySymbols[props.type];
				var typePath = paper.path(symbol.path);
				typePath.translate(props.rect.x + rect.getBBox().width / 2-7.5, props.rect.y + rect.getBBox().height / 2 - 9.5);
				typePath.attr(symbol.attrs);
				set.push(typePath);
			}
			return {"set" : set, handle : set, baseElem : rect, extSet : paper.set()};
		};
		
		module.renderTask = function(props) {
			props.attrs = {
					stroke: 'black',
					fill: "90-#000-#ffc:1-#fff"
			};
			var set = paper.set();
			
			var rect = paper.rect(props.rect.x, props.rect.y, props.rect.width, props.rect.height, 10);
			if (bpmn.shapeAttrs[props.type]) {
				rect.attr(bpmn.shapeAttrs[props.type].attrs);
			}
			rect.attr(props.attrs)
			
			if (props.label) {
				var label = paper.text(props.rect.x, props.rect.y, props.label);
				label.translate(rect.getBBox().width / 2, rect.getBBox().height / 2);
				bpmn.wordwrap(label, props.label, props.rect.width);
				set.push(label);
			}
		
			if (props.type && bpmn.taskSymbols[props.type]) {
				console.log("adding task with type:" + props.type);
				var typePath = paper.path(bpmn.taskSymbols[props.type].path);
				typePath.translate(props.rect.x + 15, props.rect.y + 10);
				set.push(typePath);
			}
			
			set.push(rect);
			return {"set" : set, handle : set, baseElem : rect, extSet : paper.set()};
		};
		
		module.renderEvent = function (props) {
			props.attrs = { fill: 'white' };
			
			var set = paper.set();
			
			if (props.type) {
		     	switch(props.type) {
			     	case "endEvent":
			     	props.attrs["stroke-width"] = 3;
			     	break;
		     	}
		     }
		     
		     var xpos = props.position.x+props.radius;
		     var ypos = props.position.y+props.radius;
		     
		     var base = paper.circle(xpos, ypos, props.radius).attr(props.attrs);
		     set.push(base);

			 // label
			 if (props.label){
			 	 var label = paper.text(xpos, ypos, props.label);
			     label.translate(0, label.getBBox().height+10);
			     set.push(label);
			 }
			 
			 if (props.type) {
		     	switch(props.type) {
			     	case "intermediateThrowEvent":
			     	case "intermediateCatchEvent":
			     	case "boundaryEvent":
					set.push(paper.circle(xpos, ypos, props.radius-3).attr(props.attrs));
			     	break;
		     	}
		     }
		     
		     if (props.definitions.length > 0) {
		     	if (props.definitions.length > 1) {
		     		// TODO multiple symbol
		     	}else{
			     	var def = props.definitions[0];
			     	var symbol = bpmn.eventSymbols[def];
					var symbolPath = paper.path(symbol.path);
					symbolPath.translate(xpos, ypos);
		     		set.push(symbolPath);
		     	}
		     }
		     
		     return {"set" : set, handle : set, baseElem : base, extSet : paper.set()};
		};
				
		return module;
	})();
});