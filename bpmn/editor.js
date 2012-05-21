//			// parser and layout deps
//			require(["bpmn/core","dijit/layout/BorderContainer", "dijit/layout/TabContainer", "dijit/layout/ContentPane", "dojo/parser","dojo/dnd/Source","dojo/dnd/Target","dojo/domReady!"], function(bpmn) {
//				// Check for the various File API support.
//				if (window.File && window.FileReader && window.FileList && window.Blob) {
//					// Great success! All the File APIs are supported.
//				} else {
//					alert('The File APIs are not fully supported in this browser.');
//					return;
//				}
//				
//				function handleFileSelect(evt) {
//				    evt.stopPropagation();
//				    evt.preventDefault();
//	
//				    var files = evt.dataTransfer.files; // FileList object.
//	
//				    // files is a FileList of File objects. List some properties.
//				    for (var i = 0, f; f = files[i]; i++) {
//					  var reader = new FileReader();
//					  reader.onload = function(e) {
//					  		bpmn.reset();
//							bpmn.parseXml(e.target.result);
//					  };
//				      reader.onerror = function(loadError) {
//						  console.log("error", loadError)
//						  console.log (loadError.getMessage())
//					  };
//					  reader.readAsText(f);
//				    }
//				};
//	
//				function handleDragOver(evt) {
//				    evt.stopPropagation();
//				    evt.preventDefault();
//				};
//				
//				var dropZone = document.getElementById('drop_zone');
//				dropZone.addEventListener('dragover', handleDragOver, false);
//				dropZone.addEventListener('drop', handleFileSelect, false);
//			});

//			require(["bpmn/core", "dojo/on", "dojo/topic", "dijit/TooltipDialog", "dijit/popup","dojo/dom","dijit/registry","dojo/dom-geometry", "dojo/domReady!"], function(bpmn,on,topic,TooltipDialog,popup, dom, registry, domGeom) {
//			    bpmn.interactive = true;
//			    bpmn.parse("test/collaboration.bpmn", function() {
//				    bpmn.highlight(["ServiceTask_1"], {"color" : "red"});
//			    }, {
//			    	diagramElement: "diagram", 
//			    	clickFn : function (elem, type) {
//			    		topic.publish("/bpmn/select", {data : elem, target: elem["@id"], targetType: type});
//			    	},
//			    	hoverInFn : function (evt, elem, type) {
//			    		
//			    		var output = domGeom.position(dom.byId("diagramWrapper"));
//						var padX = evt.clientX-output.x;
//						var padY = evt.clientY-output.y+110;
//			    		
//						var toolPad = dojo.create("div", {
//								id: "toolPad",
//						        innerHTML: "",
//						        style: {position: "absolute", top: padY+"px", left: padX+"px", background:"#ccc"}
//						}, dojo.byId("toolPadContainer"));
//			    		
//			    		registry.remove("myTooltipDialog");
//			    		
//			    		var myTooltipDialog = new TooltipDialog({
//				            id: 'myTooltipDialog',
//				            style: "width: 300px;",
//				            content: '<button class="deleteButton">Delete</button><button class="connectButton">-></button>',
//				            onMouseLeave: function(){
//				                popup.close(myTooltipDialog);
//				                dojo.destroy(toolPad);
//				            },
//				            onClose: function() {
//				            	dojo.destroy(toolPad);
//				            }
//				        });
//				        console.log(evt);
//				        
//				        on( dojo.query(".deleteButton",myTooltipDialog.domNode), "click", function () {
//				        	console.log("delete",elem)
//				        	bpmn.deleteElement(0, elem, type);
//				        	delete elem;
//				        	popup.close(myTooltipDialog);
//				        	bpmn.redraw();
//				        });
//				        
//				        on( dojo.query(".connectButton",myTooltipDialog.domNode), "click", function () {
//				        	editor.connectionSource = elem;
//				        	editor.connectionSourceType = type;
//				        	editor.connectionToggle = true;
//				        });
//				        
//						popup.open({
//				        	popup: myTooltipDialog,
//				        	around: toolPad
//				        });
//			    	},
//			    	hoverOutFn : function (evt, elem, type) {
//			    	}
//			    });
//			    
//			});

define(['dojo/_base/array',
        'bpmn/core',
        'dojo/_base/lang',
        'dojo/on',
        'dojo/_base/event',
        'dojo/_base/connect',
        'dojox/grid/DataGrid',
        'dijit/form/Textarea',
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
function(array, bpmn, lang, on, event, connect, DataGrid, Textarea, ItemFileWriteStore, cells, dom, topic, registry, popup, Target, domGeom, TooltipDialog){

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
		
		module.init = function () {
			bpmn.interactive = true;
			bpmn.clickFn = function (elem, type, evt) {
	    		topic.publish("/bpmn/select", {data : elem, target: elem["@id"], targetType: type, evt:evt});
		    };
			
			dndTarget = new Target("diagramWrapper", { accept: [ "startEvent", "endEvent", "serviceTask", "exclusiveGateway", "userTask" ] });
			dndTarget.onMouseDown = function() {
				popup.close(registry.byId("myTooltipDialog"));
			};
			
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
		
		topic.subscribe("/bpmn/element/add", function(addContext){
			console.log("add", addContext);
			var newElement = bpmn.addElement(0, addContext.type);
			newElement["@name"] = addContext.type;
			bpmn.addDiagramInfo(newElement["@id"], {x : addContext.xpos, y: addContext.ypos, width : shapeSize[addContext.type].w, height : shapeSize[addContext.type].h});
			bpmn.redraw();
		});
		
		topic.subscribe("/bpmn/select", function(evt) {
			var output = domGeom.position(dom.byId("diagramWrapper"));
//			var padX = evt.evt.clientX-output.x;
//			var padY = evt.evt.clientY-output.y;
			
			var targetElem = bpmn.getShapeElement(evt.target);
			var bb = targetElem.baseElem.getBBox();

			var padX = bb.x + bb.width + 10;
			var padY = bb.y;
    		
			dojo.destroy(dojo.byId("toolPad"));
			
			var toolPad = dojo.create("div", {
					id: "toolPad",
			        innerHTML: '<button class="btn btn-danger deleteButton">Delete</button><button class="btn connectButton">&#8594;</button>',
			        style: {position: "absolute", top: padY+"px", left: padX+"px", zIndex: 2000}
			}, dojo.byId("toolPadContainer"));
    		
			
	        on( dojo.query(".deleteButton",dojo.byId("toolPad")), "click", function () {
	        	dojo.destroy(dojo.byId("toolPad"));
	        	console.log("delete",evt.data)
	        	bpmn.deleteElement(0, evt.data, evt.targetType);
	        	bpmn.redraw();
	        });

	        on( dojo.query(".connectButton",dojo.byId("toolPad")), "click", function () {
	        	connectionSource = evt.data;
	        	connectionSourceType = evt.targetType;
	        	connectionToggle = true;
	        	dojo.destroy(dojo.byId("toolPad"));
	        });

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
		
		topic.subscribe("/bpmn/select", function(evt) {
	    	bpmn.unhighlight();
	    	bpmn.highlight([evt.target], {color: "green"});
	    	
		    /*set up data store*/
		    var data = {
		      identifier: "id",
		      items: []
		    };
		    
		    var gridStore = new ItemFileWriteStore({data: data});
		    
		    connect.connect(gridStore, "onSet", function (item, arg,arg2,arg3) {
				var parseJson = false;
				var property = item.property[0];
				
				if (property.indexOf("@") == -1){
					parseJson = true;
				}
				
				bpmn.setElementValue(evt.target, property, item.value[0], parseJson);
				bpmn.redraw();
		    });
		    
		    connect.connect(gridStore, "onDelete", function (item) {
				bpmn.deleteElementProperty(item.target[0], item.property[0]);
				bpmn.redraw();
		    });
		    
		    for (var key in evt.data) {
    			if (key.indexOf("@") != -1) {
    				data.items.push({id:key, property: key, value: evt.data[key], target: evt.target, type: evt.targetType});
    			}else{
    				data.items.push({id:key, property: key, value: JSON.stringify(evt.data[key]), target: evt.target, type: evt.targetType});
    			}
	    	}
		    /*set up layout*/
		    var layout = [[
		      {'name': 'Property', 'field': 'property', 'width': '200px', editable: true},
		      {'name': 'Value', 'field': 'value', 'width': '250px', editable: true, type: dojox.grid.cells._Widget, widgetClass: Textarea}
		    ]];
			
			if (!registry.byId("grid")) {
				/*create a new grid*/
			    var grid = new DataGrid({
			        id: 'grid',
			        store: gridStore,
			        structure: layout
			    });
			
			    /*append the new grid to the div*/
			    grid.placeAt("gridDiv");
			
			    /*Call startup() to render the grid*/
			    grid.startup();
			    
			    /* attach an event handler */
			    on(addButton,'click',
				    function(e){
				    	grid.store.newItem({id: new Date().getTime(), property: "@newProperty", value: "New Property Value", target: evt.target, type: evt.targetType});
				    }
			    );
			    
			    /* attach an event handler */
			    on(removeButton,'click',
					function(e){
					        /* Get all selected items from the Grid: */
					        var items = grid.selection.getSelected();
					        if(items.length){
					            /* Iterate through the list of selected items.
					               The current item is available in the variable
					               "selectedItem" within the following function: */
					            array.forEach(items, function(selectedItem){
					                if(selectedItem !== null){
					                    /* Delete the item from the data store: */
					                    grid.store.deleteItem(selectedItem);
					                } /* end if */
					            }); /* end forEach */
					        } /* end if */
					        event.stop(e);
					}
			    );
			    
			}else{
				var grid = registry.byId("grid");
				grid.setStore(gridStore);
			}
	    	
	    });
		
		return module;
	})();
	
});