define(["bpmn/renderer", "xml/utils", "dojo/dom", "dojo/_base/xhr", "dojox/jsonPath", "dojo/_base/array", "dojo/query", "dojo/domReady!"], function(renderer, utils, dom, xhr, path, array, query) {

	return (function(global) {
		var module = {};
		var bpmndi = undefined;
		var paper = undefined;

		var targetNamespace = "http://www.omg.org/spec/BPMN/20100524/MODEL";
		var prefixMap = {};

		var elementMap = {};
		var tokenMap = {};
		var highlightMap = {};
		var elementLookup = {};
		var diagramElement = "diagram";

		module.definitions = undefined;
		module.clickFn = undefined;
		module.width = 0;
		module.height = 0;
		module.renderer = renderer;
		module.paper = paper;
		
		module.interactive = false;
		module.hoverInFn = function () {};
		module.hoverOutFn = function () {};
		
		function hoverFunction (fn, element, type){
			return function(evt){
				fn(evt, element, type);
			};
		};
		
		function clickFunction (element, type){
			if  (module.clickFn){
				return function(evt){
					module.clickFn(element, type, evt);
				};
			}
			return function () {
			};
		};
		
		function parseXml(xml) {
			var dom = null;
			if (window.DOMParser) {
				try {
					dom = (new DOMParser()).parseFromString(xml, "text/xml");
				} catch (e) {
					dom = null;
				}
			} else if (window.ActiveXObject) {
				try {
					dom = new ActiveXObject('Microsoft.XMLDOM');
					dom.async = false;
					if (!dom.loadXML(xml)) // parse error ..
	
					window.alert(dom.parseError.reason + dom.parseError.srcText);
				} catch (e) {
					dom = null;
				}
			} else
			alert("cannot parse xml string!");
			return dom;
		};
		
		
		function deleteDI(bpmnElement, type) {
			if (!type) {
				deleteDI(bpmnElement, "BPMNShape");
				deleteDI(bpmnElement, "BPMNEdge");
				return;
			}
			
			if (bpmndi[tag(type, "BPMNDI")] instanceof Array) {
				array.forEach(bpmndi[tag(type, "BPMNDI")], function(entry, index) {
					if (entry && entry["@bpmnElement"] && entry["@bpmnElement"] == bpmnElement) {
						console.log("get shape DI", entry);
						bpmndi[tag(type, "BPMNDI")].splice(index,1);
					}
				});
			}else {
				bpmndi[tag(type, "BPMNDI")] = [];
			}
		};
		
		function getShapeDI(bpmnElement) {
			var result = {};
			
			if (bpmndi[tag("BPMNShape", "BPMNDI")] instanceof Array) {
				array.forEach(bpmndi[tag("BPMNShape", "BPMNDI")], function(entry, index) {
					if (entry["@bpmnElement"] && entry["@bpmnElement"] == bpmnElement) {
						console.log("get shape DI", entry);
						result = entry;
					}
				});
			}else {
				return bpmndi[tag("BPMNShape", "BPMNDI")];
			}
			
			return result;
		};

		function getEdgeDI(bpmnElement) {
			var result = {};
			
			if (bpmndi[tag("BPMNEdge", "BPMNDI")] instanceof Array) {
				
				array.forEach(bpmndi[tag("BPMNEdge", "BPMNDI")], function(entry, index) {
					if (entry["@bpmnElement"] && entry["@bpmnElement"] == bpmnElement) {
						console.log("get edge DI", entry);
						result = entry;
					}
				});
				
			}else{
				return bpmndi[tag("BPMNEdge", "BPMNDI")];
			}
			
			return result;
		};


		function tag(name, schema) {
			if (schema && prefixMap[schema]) {
				return prefixMap[schema] + ":" + name;
			} 
			else if (prefixMap["BPMN"]) {
				return prefixMap["BPMN"] + ":" + name;
			}
			return name;
		}

		function getBounds(bpmnElement) {
			var di = getShapeDI(bpmnElement);
			var xpos = new Number(di[tag("Bounds", "OMGDC")]["@x"]).toFixed(0);
			var ypos = new Number(di[tag("Bounds", "OMGDC")]["@y"]).toFixed(0);

			var width = new Number(di[tag("Bounds", "OMGDC")]["@width"]).toFixed(0);
			var height = new Number(di[tag("Bounds", "OMGDC")]["@height"]).toFixed(0);
			
			var bounds = {
				x: Math.round(xpos),
				y: Math.round(ypos),
				h: Math.round(height),
				w: Math.round(width)
			};
			
			checkSize(bounds.x + bounds.w, bounds.y + bounds.h);
			
			return bounds;
		};
			
		function getWaypoints(bpmnElement) {
			var di = getEdgeDI(bpmnElement);
			var waypoints = di[tag("waypoint", "OMGDI")];
			var result = [];

			array.forEach(waypoints, function(waypoint, index) {
				var xpos = new Number(waypoint["@x"]).toFixed(0);
				var ypos = new Number(waypoint["@y"]).toFixed(0);
				result.push({x: xpos, y:ypos});
				
				checkSize(xpos, ypos);
			});
			
			return result;
		};
		
		function setWaypoint(edge, index, x, y) {
			var di = getEdgeDI(edge);
			var waypoints = di[tag("waypoint", "OMGDI")];
			waypoints[index]["@x"] = x;
			waypoints[index]["@y"] = y;
		};

		function getEventDefinitions(event) {
			var definitions = [];
			if (event[tag("timerEventDefinition")]) {
				definitions.push("timer");
			}
			if (event[tag("messageEventDefinition")]) {
				definitions.push("message");
			}
			return definitions;
		};

		function parseBpmnJson(json, processIndex) {
			for (var prop in json) {
				if (prop.indexOf("@") != -1) {
					continue;
				}

				var elementName = prop;

				var prefixed = prop.indexOf(":") != -1;
				var prefixSplit = prop.split(":");
				
				if (prefixed) {
					elementName = prefixSplit[1];
				}
				
				// TODO think about this
				
				delete json[prop][tag("incoming","BPMN")];
				delete json[prop][tag("outgoing","BPMN")];
				
				switch (elementName) {
				case "definitions":
					parseDefinitions(json[prop]);
					break;

				case "callActivity":
					parseTask(json[prop], "callActivity");
					break;

				case "task":
					parseTask(json[prop], "task");
					break;
					
				case "subProcess":
					parseTask(json[prop], "subProcess");
					break;	

				default:
					handleElement(elementName, json[prop]);
					break;
				};
			}
		};

		function handleElement(elementName, element) {
			if (elementName) {
				if (elementName.endsWith("Event")) {
					parseEvent(element, elementName);
				}
				if (elementName.endsWith("Gateway")) {
					parseGateway(element, elementName);
				}
				if (elementName.endsWith("Task")) {
					parseTask(element, elementName);
				}
			}
		};

		function parseDefinitions(definitions) {
			parseNamespaces(definitions);
			if (!paper) {
				paper = renderer.init(diagramElement, 100, 100);
			}
			
			console.log("parsing definitions:" + definitions["@id"]);

			if (definitions[tag("BPMNDiagram", "BPMNDI")]) {
				bpmndi = definitions[tag("BPMNDiagram", "BPMNDI")][tag("BPMNPlane", "BPMNDI")];
				console.log("BPMNDI", bpmndi);
			} else {
				console.log("no DI information found, canceling BPMN parsing");
				return;
			}
			module.definitions = definitions;
			
			var collaboration = definitions[tag("collaboration")];

			if (collaboration) {
				parseCollaboration(collaboration);
			}

			if (definitions[tag("process")] instanceof Array) {
				array.forEach(definitions[tag("process")], function(process, index) {
					parseProcess(process, index);
				});
			} else {
				parseProcess(definitions[tag("process")]);
			}

			if (collaboration) {
				parseMessageFlows(collaboration);
			}
		};

		function parseProcess(process, index) {
			parseLaneSet(process);
			parseBpmnJson(process, index);
			parseSequenceFlows(process[tag("sequenceFlow")]);
		}

		function parseLaneSet(process) {
			if (!process[tag("laneSet")]) {
				return;
			}
			var laneSet = process[tag("laneSet")];
			array.forEach(laneSet[tag("lane")], function(lane, index) {
				console.log("LANE", lane);
				createParticipant(lane);
			});
		}

		function parseNamespaces(definitions) {
			for (var prop in definitions) {
				if (prop.indexOf("@xmlns:") != 1) {
					var propPrefix = prop.split(":")[1];

					if (definitions[prop] == "http://www.omg.org/spec/BPMN/20100524/MODEL") {
						prefixMap["BPMN"] = propPrefix;
					}

					if (definitions[prop] == "http://www.omg.org/spec/BPMN/20100524/DI") {
						prefixMap["BPMNDI"] = propPrefix;
					}

					if (definitions[prop] == "http://www.omg.org/spec/DD/20100524/DI") {
						prefixMap["OMGDI"] = propPrefix;
					}

					if (definitions[prop] == "http://www.omg.org/spec/DD/20100524/DC") {
						prefixMap["OMGDC"] = propPrefix;
					}
				} else if (prop.indexOf("@xmlns")) {
					targetNamespace = definitions[prop];
				}
			};
		};

		function parseCollaboration(collaboration) {
			console.log("processing collaboration", collaboration);
			if (collaboration[tag("participant")] instanceof Array) {
				array.forEach(collaboration[tag("participant")], function(participant, index) {
					createParticipant(participant);
				});
			} else {
				createParticipant(collaboration[tag("participant")]);
			}
		}

		function createParticipant(participant) {
			var bounds = getBounds(participant["@id"]);
			console.log("participant bounds", bounds);
			var props = {
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: participant["@name"]
			};
			
			var participantElem = renderer.renderParticipant(props);
			elementMap[participant["@id"]] = participantElem;
		}
		
		
		function checkSize(width, height) {
			if (module.width < width) {
				module.width = new Number(width);
			}
			if (module.height < height) {
				module.height = new Number(height);
			}
			paper.setSize(module.width+10, module.height+10);
		}

		function parseMessageFlows(collaboration) {
			if (!collaboration[tag("messageFlow")]) {
				return;
			}

			if (collaboration[tag("messageFlow")] instanceof Array) {
				array.forEach(collaboration[tag("messageFlow")], function(messageFlow, index) {
					console.log("processing messageflow", messageFlow);
					parseFlow(messageFlow, "message");
				});
			} else {
				var flow = collaboration[tag("messageFlow")];
				parseFlow(flow, "message");
			}
		}

		function parseFlow(flow, flowType) {
			console.log("FLOW", flow);
			if (!elementMap[flow["@sourceRef"]]) {
				console.log("source element not found for sequence flow:" + flow["@sourceRef"]);
			}
			if (!elementMap[flow["@targetRef"]]) {
				console.log("target element not found for sequence flow:" + flow["@targetRef"]);
			}
			var source = elementMap[flow["@sourceRef"]];
			var target = elementMap[flow["@targetRef"]];
			
			var flowElem = linkShape(renderer.renderFlow(flow["@id"], source, target, getWaypoints(flow["@id"]), flowType, flow, module.interactive) , flow, flowType);
			elementMap[flow["@id"]] = flowElem;
			initHandlers(flowElem);
		}
		
		function linkShape(shape, elemData, elemType) {
			shape.link = elemData;
			shape.type = elemType;
			shape.incoming = [];
			shape.outgoing = [];
			
			return shape;
		};
		
		function initHandlers(shape) {
			if (!module.interactive) {
				return;
			}
			
			shape.set.mousedown(clickFunction(shape.link, shape.type));
			shape.baseElem.hover(hoverFunction(module.hoverInFn,shape.link, shape.type), hoverFunction(module.hoverOutFn,shape.link, shape.type));
			
			var startPath = function () {
			    // path coordinates are best kept as relative distances
			    // so that you can use the built in translate method
			    this.ox = 0;
			    this.oy = 0;
			};
			
			var movePath = function (dx, dy) {
			    // move is called with dx and dy, which we convert
			    // into translate values, which are reset at the end
			    // of the function
			    var trans_x = dx-this.ox;
			    var trans_y = dy-this.oy;
			    shape.set.transform("...T"+trans_x+","+trans_y);
			    if(shape.extSet) {
			    	shape.extSet.transform("...T"+trans_x+","+trans_y);
			    }
			    this.ox = dx;
			    this.oy = dy;
			    
			    for (var i = shape.outgoing.length; i--;) {
			    	if(shape.outgoing[i].line.removed == true) {
			    		shape.outgoing.splice(i,1);
			    	}else{
	                	var c = renderer.connection(shape.outgoing[i], trans_x, trans_y, false);
    	            	setWaypoint(c.id, 0, c.sourceAnchor.x, c.sourceAnchor.y);
			    	}
            	}
            	
            	for (var i = shape.incoming.length; i--;) {
            		if(shape.incoming[i].line.removed == true) {
			    		shape.incoming.splice(i,1);
			    	}else{
   	                	var c = renderer.connection(shape.incoming[i], trans_x, trans_y, true);
	                	setWaypoint(c.id, c.points.length-1, c.targetAnchor.x, c.targetAnchor.y);
			    	}
            	}
            	
            	var di = getShapeDI(shape.link["@id"]);
			    
			    di[tag("Bounds", "OMGDC")]["@x"] = shape.baseElem.getBBox().x;
			    di[tag("Bounds", "OMGDC")]["@y"] = shape.baseElem.getBBox().y;
            	
			};
        	
			shape.handle.drag(movePath, startPath);
		};

		function parseEvent(event, eventType) {
			if (event instanceof Array) {
				array.forEach(event, function(theEvent, index) {
					createEvent(theEvent, eventType);
					elementLookup[theEvent["@id"]] = theEvent;
				});
			} else {
				createEvent(event, eventType);
				elementLookup[event["@id"]] = event;
			}
		};

		function createEvent(event, eventType) {
			var bounds = getBounds(event["@id"]);
			var defs = getEventDefinitions(event);
			console.log("event definitions:", defs);
			var props = {
				position: {
					x: bounds.x,
					y: bounds.y
				},
				radius: bounds.w / 2,
				label: event["@name"],
				type: eventType,
				definitions: defs
			};
			
			var eventElem = linkShape(renderer.renderEvent(props), event, eventType);
			elementMap[event["@id"]] = eventElem;
			initHandlers(eventElem);
		}
		
		module.createEvent = createEvent;
		
		function getProcess(index) {
			if (module.definitions[tag("process","BPMN")] instanceof Array) {
				return module.definitions[tag("process","BPMN")][index];
			}else if(index > 0) {
				alert("process with index does not exist");
			}else{
				return module.definitions[tag("process","BPMN")];
			}
		};
		
		function addElement(processIndex, type, id) {
			var firstProcess = getProcess(processIndex);
			var element = firstProcess[tag(type, "BPMN")];
			
			if (!id) {
				var genId = module.generateId(type);
			}
			
			var newElement = { "@id" : genId };
			
			if(!element) {
				firstProcess[tag(type, "BPMN")] = [ newElement ];
			}else if (element instanceof Array) {
				element.push(newElement);
			}else{
				firstProcess[tag(type, "BPMN")] = [element, newElement];	
			}
			
			return newElement;
		};
		
		module.addElement = addElement;
		
		function addDiagramInfo(bpmnElement, bounds, isEdge, points) {
			//var bpmndi = module.definitions[tag("BPMNDiagram", "BPMNDI")][tag("BPMNPlane", "BPMNDI")];
			var diTag = isEdge ? tag("BPMNEdge", "BPMNDI") : tag("BPMNShape", "BPMNDI");
			var info = { "@id" : module.generateId(), "@bpmnElement" : bpmnElement};
			if (!isEdge) {
				info[tag("Bounds", "OMGDC")] = {"@x" : bounds.x, "@y" : bounds.y, "@width" : bounds.width, "@height" : bounds.height};
			}
			
			if (isEdge == true && points) {
				info[tag("waypoint", "OMGDI")] = [];
				array.forEach(points, function(point, index) {
					info[tag("waypoint", "OMGDI")].push({"@x" : point.x, "@y" : point.y, "@xsi:type": tag("Point","OMGDC") });
				});
			}
			if (!bpmndi[diTag]){
				bpmndi[diTag] = [];
			}
			else if (!(bpmndi[diTag] instanceof Array)) {
				bpmndi[diTag] = [bpmndi[diTag]];
			}
			
			bpmndi[diTag].push(info);
		};
		
		module.addDiagramInfo = addDiagramInfo;
		
		module.generateId = function (prefix) {
			var id = "_"+new Date().getTime();
			if (prefix) {
				id = "" + prefix + id;
			}
			return id;
		};
		
		function parseTask(task, taskType) {
			if (task instanceof Array) {
				array.forEach(task, function(theTask, index) {
					elementLookup[theTask["@id"]] = theTask;
					createTask(theTask, taskType);
				});
			} else {
				elementLookup[task["@id"]] = task;
				createTask(task, taskType);
			}
		};

		function createTask(task, taskType) {
			var bounds = getBounds(task["@id"]);
			var props = {
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: task["@name"],
				type: taskType
			};

			var taskElem = linkShape(renderer.renderTask(props), task, taskType);
			elementMap[task["@id"]] = taskElem;
			initHandlers(taskElem);
		};

		function parseGateway(gateway, gatewayType) {
			if (gateway instanceof Array) {
				array.forEach(gateway, function(theGateway, index) {
					createGateway(theGateway, gatewayType);
					elementLookup[theGateway["@id"]] = theGateway;
				});
			} else {
				createGateway(gateway, gatewayType);
				elementLookup[gateway["@id"]] = gateway;
			}
		};

		function createGateway(gateway, gatewayType) {
			var bounds = getBounds(gateway["@id"]);
			var props = {
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: gateway["@name"],
				type: gatewayType
			};
			var gatewayElem = linkShape(renderer.renderGateway(props), gateway, gatewayType);
			elementMap[gateway["@id"]] = gatewayElem;
			initHandlers(gatewayElem);
		}

		function parseSequenceFlows(flows) {
			if (!flows) {
				return;
			}
			
			if (flows instanceof Array) {
				array.forEach(flows, function(flow, index) {
					parseFlow(flow, "sequenceFlow");
					elementLookup[flow["@id"]] = flow;
				});
			}
			else{ 
				parseFlow(flows, "sequenceFlow");
				elementLookup[flows["@id"]] = flows;
			}
		};

		function convertXml(xml) {
			xml = xml.replace(/&#xA;/g, "\\n");
			xml = xml.replace(/&#10;/g, " ");
			xml = xml.replace(/&/g, "");

			var xmlJson = utils.xml2json(parseXml(xml), "  ");
			console.log("xmljson", xmlJson);
			var jsonObj = JSON.parse(xmlJson);
			console.log("bpmnJsonObj", jsonObj);
			return jsonObj;
		};
		
		function init(options) {
			if (options) {
				if(options.diagramElement) {
					diagramElement = options.diagramElement;
				}
				if(options.clickFn) {
					module.clickFn = options.clickFn;
				}
				
				if(options.hoverInFn) {
					module.hoverInFn = options.hoverInFn;
				}
				
				if(options.hoverOutFn) {
					module.hoverOutFn = options.hoverOutFn;
				}
			}
		};
		
		function next(fn) {
			if (fn) {
				fn();
			}
		};

		module.parseXml = function(xml, successFn, options) {
			init(options);
			parseBpmnJson(convertXml(xml));
			next(successFn);
		};
		
		module.getXml = function() {
			var output = {};
			output[tag("definitions")] = module.definitions;
			return '<?xml version="1.0" encoding="UTF-8"?>' + utils.json2xml(output);
		};

		module.parse = function(modelUrl, successFn, options) {
			init(options);
			xhr.get({
				// The URL to request
				url: modelUrl,
				load: function(result) {
					parseBpmnJson(convertXml(result));
					next(successFn);
				}
			});
		};

		module.highlight = function(ids, attrs) {
			if (!attrs) {
				attrs = {
					"color": "red"
				};
			}
			
			module.unhighlight(ids);
			
			array.forEach(ids, function(id, index) {
				if (elementMap[id]) {
					var glowBase = elementMap[id].baseElem;
					highlightMap[id] = id;
					elementMap[id].extSet.push(glowBase.glow(attrs));
				}else{
					console.log("can't highlight id:"+id+" , element does not exist");
				}
			});
		};
		
		module.unhighlight = function(ids) {
			if (!ids) {
				for (var key in highlightMap) {
					elementMap[highlightMap[key]].extSet.remove();
				}
			}
			else{
				array.forEach(ids, function(id, index) {
					if ( highlightMap[id] ) {
						elementMap[highlightMap[id]].extSet.remove();
						delete highlightMap[id];
					}
				});
			}
		};
		
		module.reset = function () {
			renderer.clear();
			if (paper) {
				paper.remove();
				paper = undefined;
			}
		};
		
		module.redraw = function () {
			module.reset();
			parseDefinitions(module.definitions);
		};
		
		module.setElementValue = function(elementId, property, value, parseJson) {
			if (parseJson && value) {
				elementLookup[elementId][property] = JSON.parse(value);
			}else{
				elementLookup[elementId][property] = value;
			}
		};
		
		module.deleteElementProperty = function(elementId, property) {
			delete elementLookup[elementId][property];
		};
		
		module.deleteElement = function(processIndex, element, elementType) {
			var process = getProcess(processIndex);
			if (process[tag(elementType, "BPMN")] instanceof Array) {
				var index = process[tag(elementType, "BPMN")].indexOf(element);
				process[tag(elementType, "BPMN")].splice(index,1);
			}
			else{
				delete process[tag(elementType, "BPMN")];
			}

			var shapeELem = elementMap[element["@id"]];
			shapeELem.set.remove();
			shapeELem.extSet.remove();

			delete elementLookup[element["@id"]];
			delete elementMap[element["@id"]];
			delete highlightMap[element["@id"]];

			deleteDI(element["@id"]);
		};
		
		module.getShapeElement = function(id) {
			return elementMap[id];
		};
		
		module.startTokenGame = function () {
			var firstProcess = module.definitions[tag("process","BPMN")][0];
			var startEvent = firstProcess[tag("startEvent", "BPMN")];
			
			if (startEvent instanceof Array) {
				array.forEach(startEvent, function (event, index) {
					tokenMap[event["@id"]] = 1;
					module.highlight([event["@id"]]);
				});
			}else{
				tokenMap[startEvent["@id"]] = 1;
				module.highlight([startEvent["@id"]]);			
			}
		};
		
		module.create = function() {
			if (module.definitions) {
				module.reset();
			}
			
			module.parseXml(
				'<?xml version="1.0" encoding="UTF-8"?><definitions targetNamespace="http://activiti.org/bpmn" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:activiti="http://activiti.org/bpmn" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="Definitions_1">  <process id="process_1" name="Default Process">    <startEvent id="StartEvent_1" />    <sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>    <endEvent id="EndEvent_1"/>  </process>  <bpmndi:BPMNDiagram id="BPMNDiagram_1" name="Default Process Diagram">    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="process_1">      <bpmndi:BPMNShape id="BPMNShape_1" bpmnElement="StartEvent_1">        <dc:Bounds height="36.0" width="36.0" x="100.0" y="100.0"/>      </bpmndi:BPMNShape>      <bpmndi:BPMNShape id="BPMNShape_2" bpmnElement="EndEvent_1">        <dc:Bounds height="36.0" width="36.0" x="500.0" y="100.0"/>      </bpmndi:BPMNShape>      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_1" bpmnElement="SequenceFlow_1" sourceElement="BPMNShape_1" targetElement="BPMNShape_2">        <di:waypoint xsi:type="dc:Point" x="136.0" y="118.0"/>        <di:waypoint xsi:type="dc:Point" x="500.0" y="118.0"/>      </bpmndi:BPMNEdge>    </bpmndi:BPMNPlane>  </bpmndi:BPMNDiagram></definitions>',
				function() {
					paper.setSize(1000,1000);
				}
			);
		};
		
		global.bpmn = module;
		return module;
	})(this);
});

define( "xml/utils", ["dojo/domReady!"], function() {

	return (function(global) {
		var module = {};
		
		/*	This work is licensed under Creative Commons GNU LGPL License.

			License: http://creativecommons.org/licenses/LGPL/2.1/
		   Version: 0.9
			Author:  Stefan Goessner/2006
			Web:     http://goessner.net/ 
		*/
		module.xml2json = function (xml, tab) {
		   var X = {
		      toObj: function(xml) {
		         var o = {};
		         if (xml.nodeType==1) {   // element node ..
		            if (xml.attributes.length)   // element with attributes  ..
		               for (var i=0; i<xml.attributes.length; i++)
		                  o["@"+xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue||"").toString();
		            if (xml.firstChild) { // element has child nodes ..
		               var textChild=0, cdataChild=0, hasElementChild=false;
		               for (var n=xml.firstChild; n; n=n.nextSibling) {
		                  if (n.nodeType==1) hasElementChild = true;
		                  else if (n.nodeType==3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++; // non-whitespace text
		                  else if (n.nodeType==4) cdataChild++; // cdata section node
		               }
		               if (hasElementChild) {
		                  if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
		                     X.removeWhite(xml);
		                     for (var n=xml.firstChild; n; n=n.nextSibling) {
		                        if (n.nodeType == 3)  // text node
		                           o["#text"] = X.escape(n.nodeValue);
		                        else if (n.nodeType == 4)  // cdata node
		                           o["#cdata"] = X.escape(n.nodeValue);
		                        else if (o[n.nodeName]) {  // multiple occurence of element ..
		                           if (o[n.nodeName] instanceof Array)
		                              o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
		                           else
		                              o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
		                        }
		                        else  // first occurence of element..
		                           o[n.nodeName] = X.toObj(n);
		                     }
		                  }
		                  else { // mixed content
		                     if (!xml.attributes.length)
		                        o = X.escape(X.innerXml(xml));
		                     else
		                        o["#text"] = X.escape(X.innerXml(xml));
		                  }
		               }
		               else if (textChild) { // pure text
		                  if (!xml.attributes.length)
		                     o = X.escape(X.innerXml(xml));
		                  else
		                     o["#text"] = X.escape(X.innerXml(xml));
		               }
		               else if (cdataChild) { // cdata
		                  if (cdataChild > 1)
		                     o = X.escape(X.innerXml(xml));
		                  else
		                     for (var n=xml.firstChild; n; n=n.nextSibling)
		                        o["#cdata"] = X.escape(n.nodeValue);
		               }
		            }
		            if (!xml.attributes.length && !xml.firstChild) o = null;
		         }
		         else if (xml.nodeType==9) { // document.node
		            o = X.toObj(xml.documentElement);
		         }
		         else
		            alert("unhandled node type: " + xml.nodeType);
		         return o;
		      },
		      toJson: function(o, name, ind) {
		         var json = name ? ("\""+name+"\"") : "";
		         if (o instanceof Array) {
		            for (var i=0,n=o.length; i<n; i++)
		               o[i] = X.toJson(o[i], "", ind+"\t");
		            json += (name?":[":"[") + (o.length > 1 ? ("\n"+ind+"\t"+o.join(",\n"+ind+"\t")+"\n"+ind) : o.join("")) + "]";
		         }
		         else if (o == null)
		            json += (name&&":") + "null";
		         else if (typeof(o) == "object") {
		            var arr = [];
		            for (var m in o)
		               arr[arr.length] = X.toJson(o[m], m, ind+"\t");
		            json += (name?":{":"{") + (arr.length > 1 ? ("\n"+ind+"\t"+arr.join(",\n"+ind+"\t")+"\n"+ind) : arr.join("")) + "}";
		         }
		         else if (typeof(o) == "string")
		            json += (name&&":") + "\"" + o.toString() + "\"";
		         else
		            json += (name&&":") + o.toString();
		         return json;
		      },
		      innerXml: function(node) {
		         var s = ""
		         if ("innerHTML" in node)
		            s = node.innerHTML;
		         else {
		            var asXml = function(n) {
		               var s = "";
		               if (n.nodeType == 1) {
		                  s += "<" + n.nodeName;
		                  for (var i=0; i<n.attributes.length;i++)
		                     s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue||"").toString() + "\"";
		                  if (n.firstChild) {
		                     s += ">";
		                     for (var c=n.firstChild; c; c=c.nextSibling)
		                        s += asXml(c);
		                     s += "</"+n.nodeName+">";
		                  }
		                  else
		                     s += "/>";
		               }
		               else if (n.nodeType == 3)
		                  s += n.nodeValue;
		               else if (n.nodeType == 4)
		                  s += "<![CDATA[" + n.nodeValue + "]]>";
		               return s;
		            };
		            for (var c=node.firstChild; c; c=c.nextSibling)
		               s += asXml(c);
		         }
		         return s;
		      },
		      escape: function(txt) {
		         return txt.replace(/[\\]/g, "\\\\")
		                   .replace(/[\"]/g, '\\"')
		                   .replace(/[\n]/g, '\\n')
		                   .replace(/[\r]/g, '\\r');
		      },
		      removeWhite: function(e) {
		         e.normalize();
		         for (var n = e.firstChild; n; ) {
		            if (n.nodeType == 3) {  // text node
		               if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
		                  var nxt = n.nextSibling;
		                  e.removeChild(n);
		                  n = nxt;
		               }
		               else
		                  n = n.nextSibling;
		            }
		            else if (n.nodeType == 1) {  // element node
		               X.removeWhite(n);
		               n = n.nextSibling;
		            }
		            else                      // any other node
		               n = n.nextSibling;
		         }
		         return e;
		      }
		   };
		   if (xml.nodeType == 9) // document node
		      xml = xml.documentElement;
		   var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
		   return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
		};
		
		/*	This work is licensed under Creative Commons GNU LGPL License.
		
			License: http://creativecommons.org/licenses/LGPL/2.1/
		   Version: 0.9
			Author:  Stefan Goessner/2006
			Web:     http://goessner.net/ 
		*/
		module.json2xml = function(o, tab) {
		   var toXml = function(v, name, ind) {
		      var xml = "";
		      if (v instanceof Array) {
		         for (var i=0, n=v.length; i<n; i++)
		            xml += ind + toXml(v[i], name, ind+"\t") + "\n";
		      }
		      else if (typeof(v) == "object") {
		         var hasChild = false;
		         xml += ind + "<" + name;
		         for (var m in v) {
		            if (m.charAt(0) == "@")
		               xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
		            else
		               hasChild = true;
		         }
		         xml += hasChild ? ">" : "/>";
		         if (hasChild) {
		            for (var m in v) {
		               if (m == "#text")
		                  xml += v[m];
		               else if (m == "#cdata")
		                  xml += "<![CDATA[" + v[m] + "]]>";
		               else if (m.charAt(0) != "@")
		                  xml += toXml(v[m], m, ind+"\t");
		            }
		            xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
		         }
		      }
		      else {
		         xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
		      }
		      return xml;
		   }, xml="";
		   for (var m in o)
		      xml += toXml(o[m], m, "");
		   return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
		};
		
		return module;
	})();
});
