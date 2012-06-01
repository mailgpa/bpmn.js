define(['dojo/_base/array',
        'bpmn/core',
        'dojo/_base/lang',
        'dojo/on',
        'dojo/_base/event',
        'dojo/_base/connect',
        'dojox/grid/DataGrid',
        'dijit/form/Textarea',
        'dijit/form/Button',
        'dojo/data/ItemFileWriteStore',
        'dojox/grid/cells/dijit',
        'dojo/dom',
        'dojo/topic',
        'dijit/registry',
        "dijit/popup",
        "dojo/dnd/Target",
        "dojo/dom-geometry",
        "dijit/TooltipDialog",
        'dojo/domReady!'], 
function(array, bpmn, lang, on, event, connect, DataGrid, Textarea, Button, ItemFileWriteStore, cells, dom, topic, registry, popup, Target, domGeom, TooltipDialog){

	return (function(global) {
		var module = {};
		var dndTarget = undefined;
		var connectionToggle = false;
		var connectionSourceType = undefined;
		var connectionSource = undefined;
		
		var shapeSize = {
				"serviceTask" : {w: 112, h: 56},
				"userTask" : {w: 112, h: 56},
				"startEvent" : {w: 32, h: 32},
				"endEvent" :  {w: 32, h: 32},
				"exclusiveGateway" :  {w: 36, h: 36}
		};
		
		module.hooks = {};
		module.toolPadHTML = '<button class="btn connectButton"><span style="height:24px">&#8594;</span></button><button class="btn btn-danger deleteButton">Delete</button>';
		
		module.init = function (config) {
			if (config) {
				if (config.hooks) {
					module.hooks = config.hooks;
				}
				if (config.toolPadHTML) {
					module.toolPadHTML = config.toolPadHTML;
				}
				if (config.dropZoneId) {
					module.initDropZone(config.dropZoneId);
				}
			}
			
			bpmn.interactive = true;
			bpmn.clickFn = function (elem, type, evt) {
	    		topic.publish("/bpmn/select", {data : elem, target: elem["@id"], targetType: type, evt:evt});
		    };
			
			dndTarget = new Target("diagramWrapper", { accept: [ "startEvent", "endEvent", "serviceTask", "exclusiveGateway", "userTask" ] });
			
			dndTarget.onMouseMove = function(e) {
				var output = domGeom.position(dom.byId("diagramWrapper"));
				this.lastX = e.clientX-output.x;
				this.lastY = e.clientY-output.y;
			};
			
			dndTarget.onDrop = function(arg0, elem, arg2) {
				var type = elem[0].attributes.dndtype.value;
				topic.publish("/bpmn/element/add", {type: type, xpos: this.lastX, ypos: this.lastY});
			};
		};
		
		module.initDropZone = function (dropZoneId) {
			if (window.File && window.FileReader && window.FileList && window.Blob) {
			} else {
				console.log('The File APIs are not fully supported in this browser. BPMN Dropzone not initialized');
				return;
			}
			
			function handleFileSelect(evt) {
			    evt.stopPropagation();
			    evt.preventDefault();

			    var files = evt.dataTransfer.files; // FileList object.

			    // files is a FileList of File objects. List some properties.
			    for (var i = 0, f; f = files[i]; i++) {
				  var reader = new FileReader();
				  reader.onload = function(e) {
				  		bpmn.reset();
						bpmn.parseXml(e.target.result);
				  };
			      reader.onerror = function(loadError) {
					  console.log("error", loadError)
					  console.log (loadError.getMessage())
				  };
				  reader.readAsText(f);
			    }
			};

			function handleDragOver(evt) {
			    evt.stopPropagation();
			    evt.preventDefault();
			};
			
			var dropZone = document.getElementById(dropZoneId);
			dropZone.addEventListener('dragover', handleDragOver, false);
			dropZone.addEventListener('drop', handleFileSelect, false);
		};
		
		module.showToolpad = function(selection) {
			module.destroyToolpad();
			
			var targetElem = bpmn.getShapeElement(selection.target);
			var bb = targetElem.baseElem.getBBox();

			var padX = new Number(bb.x + bb.width + 10.0).toFixed(0);
			var padY = new Number(bb.y).toFixed(0);
			
			var toolPad = dojo.create("div", {
					id: "toolPad",
			        innerHTML: module.toolPadHTML,
			        style: {position: "absolute", top: padY+"px", left: padX+"px", zIndex: 2000}
			}, dojo.byId("toolPadContainer"));
			
	        on( dojo.query(".deleteButton",dojo.byId("toolPad")), "click", function () {
	        	dojo.destroy(dojo.byId("toolPad"));
	        	console.log("delete",selection.data)
	        	bpmn.deleteElement(0, selection.data, selection.targetType);
	        	bpmn.redraw();
	        });
	
	        on( dojo.query(".connectButton",dojo.byId("toolPad")), "click", function () {
	        	connectionSource = selection.data;
	        	connectionSourceType = selection.targetType;
	        	connectionToggle = true;
	        	dojo.destroy(dojo.byId("toolPad"));
	        });
		};
		
		module.destroyToolpad = function() {
			dojo.destroy(dojo.byId("toolPad"));
		};
		
		topic.subscribe("/bpmn/drag/start", function(selection) {
			module.destroyToolpad();
		});
		
		topic.subscribe("/bpmn/drag/up", function(selection) {
			module.showToolpad(selection);
		});
		
		topic.subscribe("/bpmn/element/add", function(addContext){
			console.log("add", addContext);
			var newElement = bpmn.addElement(0, addContext.type);
			newElement["@name"] = addContext.type;
			bpmn.addDiagramInfo(newElement["@id"], {x : addContext.xpos, y: addContext.ypos, width : shapeSize[addContext.type].w, height : shapeSize[addContext.type].h});
			bpmn.redraw();
		});
		
		topic.subscribe("/bpmn/select", function(selection) {
			var output = domGeom.position(dom.byId("diagramWrapper"));
//			var padX = evt.evt.clientX-output.x;
//			var padY = evt.evt.clientY-output.y;
			module.showToolpad(selection);
		});
		
		topic.subscribe("/bpmn/select", function(evt) {
			if (connectionToggle) {
				connectionToggle = false;
				console.log("connect from:"+connectionSource["@id"]+" to: "+evt.target);
				var flow = bpmn.addElement(0, "sequenceFlow");
				flow["@sourceRef"] = connectionSource["@id"];
				flow["@targetRef"] = evt.target;
				
				var sourceElem = bpmn.getShapeElement(flow["@sourceRef"]);
				var targetElem = bpmn.getShapeElement(flow["@targetRef"]);
				console.log(sourceElem, targetElem);
				
				var sourceBB = sourceElem.baseElem.getBBox();
				var targetBB = targetElem.baseElem.getBBox();
				console.log(sourceBB);
				
				var wps = [	{x: sourceBB.x2, y:sourceBB.y+sourceBB.height/2}, 
					{x: targetBB.x, y:targetBB.y+targetBB.height/2}
				];
				
				if (connectionSourceType.indexOf("teway") != -1) {
					var sourceBellow = sourceBB.y > (targetBB.y + targetBB.height);

					wps[0].x = sourceBB.x + sourceBB.width /2 ;
					wps[0].y = sourceBellow == true ?  sourceBB.y : sourceBB.y + sourceBB.height;
					
					wps.splice(1,0, {x: wps[0].x, y:targetBB.y+targetBB.height/2});
				}
				
				bpmn.addDiagramInfo(flow["@id"], null, true, 
					wps
				);
				
				bpmn.redraw();
			}
		});
		
		module.createGrid = function (selection, gridId, gridLabel, dataFunction, newFunction, setFunction, deleteFunction, addButtonId, removeButtonId, addFunction) {
		    /*set up data store*/
		    var data = {
		      identifier: "id",
		      items: []
		    };
		    
		    dojo.create("div", {
				id: gridId+"Wrapper",
		        innerHTML:  '<p style="margin-top: 20px;"><strong>'+gridLabel+'</strong></p><div id="'+gridId+'" style="height: 150px"></div>'+
				'<span id="'+addButtonId+'" style="display:none"></span>'+ 
				'<span id="'+removeButtonId+'" style="display:none"></span>'
		    }, dojo.byId("customEditors"));
		    
		    var gridStore = new ItemFileWriteStore({data: data});
		    
		    dataFunction(selection, data);
		    
		    /*set up layout*/
		    var layout = [[
		      {'name': 'Name', 'field': 'property', 'width': '150px', editable: true},
		      {'name': 'Value', 'field': 'value', 'width': '200px', editable: true, type: dojox.grid.cells._Widget, widgetClass: Textarea}
		    ]];
		    
		    try {
		    	registry.byId(gridId).destroy();
		    	registry.byId(addButtonId).destroy();
		    	registry.byId(removeButtonId).destroy();
		    	
		    	registry.remove(gridId);
		    	registry.remove(addButtonId);
		    	registry.remove(removeButtonId);
		    } catch(e) {
		    	
		    }
		    
		    /*create a new grid*/
			var grid = new DataGrid({
			     id: gridId,
			     store: gridStore,
			     structure: layout
			});
			
			connect.connect(gridStore, "onNew", function (item) {
				newFunction(item, grid);
			});
			    
			connect.connect(gridStore, "onSet", function (item) {
				setFunction(item, grid);
			});
			    
			connect.connect(gridStore, "onDelete", function(item, index) {
				deleteFunction(item, grid);
			});
			/* append the new grid to the div */
			grid.placeAt(gridId);

			/* Call startup() to render the grid */
			grid.startup();
			var addButton = new Button({
				label : "Add"
			}, addButtonId);

			/* attach an event handler */
			on(addButton, 'click', function(e) {
				addFunction(e, grid);
			});

			var removeButton = new Button({
				label : "Remove"
			}, removeButtonId);

			/* attach an event handler */
			on(removeButton, 'click', function(e) {
				/* Get all selected items from the Grid: */
				var items = grid.selection.getSelected();
				if (items.length) {
					/*
					 * Iterate through the list of selected items. The
					 * current item is available in the variable
					 * "selectedItem" within the following function:
					 */
					array.forEach(items, function(selectedItem) {
						if (selectedItem !== null) {
							/* Delete the item from the data store: */
							grid.store.deleteItem(selectedItem);
						} /* end if */
					}); /* end forEach */
				} /* end if */
				event.stop(e);
			});
		};
		
		topic.subscribe("/bpmn/select", function(evt) {
	    	bpmn.unhighlight();
	    	bpmn.highlight([evt.target], {color: "green"});
	    	
	    	dojo.empty("customEditors");
	    	
		    var setFunction = function (item) {
				var parseJson = false;
				var property = item.property[0];
				
				if (property.indexOf("@") == -1){
					parseJson = true;
				}
				
				bpmn.setElementValue(evt.target, property, item.value[0], parseJson);
				bpmn.redraw();
		    };
		    
		    var addFunction = function(e, grid){
		    	grid.store.newItem({id: new Date().getTime(), property: "@newProperty", value: "New Property Value", target: evt.target, type: evt.targetType});
		    };
		    
		    var deleteFunction = function(item) {
		    	bpmn.deleteElementProperty(item.target[0], item.property[0]);
		    	bpmn.redraw();
		    };
		    
		    var dataFunction = 	function (selection, data) {
			    for (var key in selection.data) {
	    			if (key.indexOf("@") != -1) {
	    				data.items.push({id:key, property: key, value: selection.data[key], target: selection.target, type: selection.targetType});
	    			}else{
	    				data.items.push({id:key, property: key, value: JSON.stringify(selection.data[key]), target: selection.target, type: selection.targetType});
	    			}
		    	}
		    };
		    
		    module.createGrid(evt, "gridDiv", "Properties", dataFunction, setFunction, setFunction, deleteFunction, "addButton", "removeButton", addFunction);
			
			if (module.hooks[evt.targetType]){
				module.hooks[evt.targetType](evt);	
			}
	    	
	    });
		
		return module;
	})();
	
});