define( "bpmn", ["dojo/dom", "dojo/_base/xhr", "dojox/jsonPath", "dojo/_base/array", "dojo/query", "dojo/domReady!"], function(d, xhr, path, array, query) {

	String.prototype.endsWith = function(suffix) {
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};

	return (function(global, dia) {
		var module = {};
		var bpmndi = undefined;
		var paper = undefined;

		var targetNamespace = "http://www.omg.org/spec/BPMN/20100524/MODEL";
		var prefixMap = {};

		var elementMap = {};
		var diagramElement = "diagram";
		
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
		
		function getShapeDI(bpmnElement) {
			var result = {};
			array.forEach(bpmndi[tag("BPMNShape", "BPMNDI")], function(entry, index) {
				if (entry["@bpmnElement"] && entry["@bpmnElement"] == bpmnElement) {
					console.log("get shape DI", entry);
					result = entry;
				}
			});
			return result;
		};

		function getEdgeDI(bpmnElement) {
			var result = {};
			array.forEach(bpmndi[tag("BPMNEdge", "BPMNDI")], function(entry, index) {
				if (entry["@bpmnElement"] && entry["@bpmnElement"] == bpmnElement) {
					console.log("get edge DI", entry);
					result = entry;
				}
			});
			return result;
		};


		function tag(name, schema) {
			if (schema) {
				return prefixMap[schema] + ":" + name;
			} else if (prefixMap["BPMN"]) {
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

			return {
				x: Math.round(xpos),
				y: Math.round(ypos),
				h: Math.round(height),
				w: Math.round(width)
			};
		};

		function getWaypoints(bpmnElement) {
			var di = getEdgeDI(bpmnElement);
			var waypoints = di[tag("waypoint", "OMGDI")];
			var result = [];

			array.forEach(waypoints, function(waypoint, index) {
				// first and last waypoint are the joint start and element -> the shapes
				if (index == 0) {
					return;
				}

				var xpos = new Number(waypoint["@x"]).toFixed(0);
				var ypos = new Number(waypoint["@y"]).toFixed(0);

				if (index == waypoints.length - 1) {
					return;
				}
				result.push("" + xpos + " " + ypos);
			});

			return result;
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

		function parseBpmnJson(json) {
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

			paper = Joint.paper(diagramElement, 1500, 800);
			console.log("parsing definitions:" + definitions["@id"]);

			if (definitions[tag("BPMNDiagram", "BPMNDI")]) {
				bpmndi = definitions[tag("BPMNDiagram", "BPMNDI")][tag("BPMNPlane", "BPMNDI")];
				console.log("BPMNDI", bpmndi);
			} else {
				console.log("no DI information found, canceling BPMN parsing");
				return;
			}

			var collaboration = definitions[tag("collaboration")];

			if (collaboration) {
				parseCollaboration(collaboration);
			}

			if (definitions[tag("process")] instanceof Array) {
				array.forEach(definitions[tag("process")], function(process, index) {
					parseProcess(process);
				});
			} else {
				parseProcess(definitions[tag("process")]);
			}

			if (collaboration) {
				parseMessageFlows(collaboration);
			}
		};

		function parseProcess(process) {
			parseLaneSet(process);
			parseBpmnJson(process);
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
			var participantElem = dia.Participant.create({
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: participant["@name"]
			});
			elementMap[participant["@id"]] = participantElem;
		}

		function parseMessageFlows(collaboration) {
			if (!collaboration[tag("messageFlow")]) {
				return;
			}

			if (collaboration[tag("messageFlow")] instanceof Array) {
				array.forEach(collaboration[tag("messageFlow")], function(messageFlow, index) {
					console.log("processing messageflow", messageFlow);
					parseFlow(messageFlow, dia.message);
				});
			} else {
				var flow = collaboration[tag("messageFlow")];
				parseFlow(flow, dia.message);
			}
		}

		function parseFlow(flow, jointType) {
			console.log("FLOW", flow);
			if (!elementMap[flow["@sourceRef"]]) {
				console.log("source element not found for sequence flow:" + flow["@sourceRef"]);
				return;
			}
			if (!elementMap[flow["@targetRef"]]) {
				console.log("target element not found for sequence flow:" + flow["@targetRef"]);
				return;
			}
			var source = elementMap[flow["@sourceRef"]];
			var target = elementMap[flow["@targetRef"]];
			var joint = source.joint(target, jointType);
			joint.setVertices(getWaypoints(flow["@id"]));
			joint.registerForever([source, target]);
		}

		function parseEvent(event, eventType) {
			if (event instanceof Array) {
				array.forEach(event, function(theEvent, index) {
					createEvent(theEvent, eventType);
				});
			} else {
				createEvent(event, eventType);
			}
		};

		function createEvent(event, eventType) {
			var bounds = getBounds(event["@id"]);
			var defs = getEventDefinitions(event);
			console.log("event definitions:", defs);
			var eventElem = dia.Event.create({
				position: {
					x: bounds.x,
					y: bounds.y
				},
				radius: bounds.w / 2,
				label: event["@name"],
				type: eventType,
				definitions: defs
			});
			elementMap[event["@id"]] = eventElem;
		}

		function parseTask(task, taskType) {
			if (task instanceof Array) {
				array.forEach(task, function(theTask, index) {
					createTask(theTask, taskType);
				});
			} else {
				createTask(task, taskType);
			}
		};

		function createTask(task, taskType) {
			var bounds = getBounds(task["@id"]);
			var taskElem = dia.Task.create({
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: task["@name"],
				type: taskType
			});
			elementMap[task["@id"]] = taskElem;
		};

		function parseGateway(gateway, gatewayType) {
			if (gateway instanceof Array) {
				array.forEach(gateway, function(theGateway, index) {
					createGateway(theGateway, gatewayType);
				});
			} else {
				createGateway(gateway, gatewayType);
			}
		};

		function createGateway(gateway, gatewayType) {
			var bounds = getBounds(gateway["@id"]);
			var gatewayElem = dia.Gateway.create({
				rect: {
					x: bounds.x,
					y: bounds.y,
					width: bounds.w,
					height: bounds.h
				},
				label: gateway["@name"],
				type: gatewayType
			});
			elementMap[gateway["@id"]] = gatewayElem;
		}

		function parseSequenceFlows(flows) {
			array.forEach(flows, function(flow, index) {
				parseFlow(flow, dia.sequence);
			});
		};

		function convertXml(xml) {
			xml = xml.replace(/&#xA;/g, "\\n");
			xml = xml.replace(/&#10;/g, " ");
			xml = xml.replace(/&/g, "");

			var xmlJson = xml2json(parseXml(xml), "  ");
			console.log("xmljson", xmlJson);
			var jsonObj = JSON.parse(xmlJson);
			console.log("bpmnJsonObj", jsonObj);
			return jsonObj;
		};

		module.parseXml = function(xml, successFn) {
			parseBpmnJson(convertXml(xml));
			successFn();
		};

		module.parse = function(modelUrl, successFn, options) {
			if (options) {
				if(options.diagramElement) {
					diagramElement = options.diagramElement;
				}
			}
			
			xhr.get({
				// The URL to request
				url: modelUrl,
				load: function(result) {
					parseBpmnJson(convertXml(result));
					successFn();
				}
			});
		};

		module.highlight = function(ids, attrs) {
			if (!attrs) {
				attrs = {
					"color": "red"
				};
			}

			array.forEach(ids, function(id, index) {
				if (elementMap[id]) {
					elementMap[id].wrapper.glow(attrs);
				}else{
					console.log("can't highlight id:"+id+" , element does not exist");
				}
			});
		};
		
		module.reset = function () {
			Joint.resetPaper();
		};
		
		global.bpmn = module;
		return module;
	})(this, Joint.dia.bpmn);
});