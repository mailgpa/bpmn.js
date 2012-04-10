define( "bpmn", ["bpmn/renderer", "xml/utils", "dojo/dom", "dojo/_base/xhr", "dojox/jsonPath", "dojo/_base/array", "dojo/query", "dojo/domReady!"], function(renderer, utils, dom, xhr, path, array, query) {

	return (function(global) {
		var module = {};
		var bpmndi = undefined;
		var paper = undefined;

		var targetNamespace = "http://www.omg.org/spec/BPMN/20100524/MODEL";
		var prefixMap = {};

		var elementMap = {};
		var diagramElement = "diagram";

		module.clickFn = undefined;
		
		function clickFunction (element){
			if  (module.clickFn){
				return function(){
					module.clickFn(element);
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
				var xpos = new Number(waypoint["@x"]).toFixed(0);
				var ypos = new Number(waypoint["@y"]).toFixed(0);
				result.push({x: xpos, y:ypos});
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
			paper = renderer.init(diagramElement, 1500, 800);
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
				return;
			}
			if (!elementMap[flow["@targetRef"]]) {
				console.log("target element not found for sequence flow:" + flow["@targetRef"]);
				return;
			}
			var source = elementMap[flow["@sourceRef"]];
			var target = elementMap[flow["@targetRef"]];
			
			renderer.renderFlow(source, target, getWaypoints(flow["@id"]), flowType, flow);
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
			
			var eventElem = renderer.renderEvent(props);
			elementMap[event["@id"]] = eventElem;
			eventElem.mousedown(clickFunction(event));
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

			var taskElem = renderer.renderTask(props);
			elementMap[task["@id"]] = taskElem;
			taskElem.mousedown(clickFunction(task));
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
			var gatewayElem = renderer.renderGateway(props);
			elementMap[gateway["@id"]] = gatewayElem;
		}

		function parseSequenceFlows(flows) {
			array.forEach(flows, function(flow, index) {
				parseFlow(flow, "sequence");
			});
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
			}
		};

		module.parseXml = function(xml, successFn, options) {
			init(options);
			parseBpmnJson(convertXml(xml));
			successFn();
		};

		module.parse = function(modelUrl, successFn, options) {
			init(options);
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
					elementMap[id].glow(attrs);
				}else{
					console.log("can't highlight id:"+id+" , element does not exist");
				}
			});
		};
		
		module.reset = function () {
			renderer.clear();
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
