
/* event/message linkup with chaise */

// A flag to track whether OpenSeadragon/Annotorious is 
// being used inside another window (i.e. Chaise), set enableEmbedded.

var enableEmbedded = false;
if (window.self !== window.top) {
    enableEmbedded = true;
}

function setupAnnoUI() {
  if(!enableEmbedded) {
      /* enable control and annotations buttons */
      var bElm = document.getElementById('ctrl-button');
      bElm.style.display = '';
      bElm = document.getElementById('anno-ctrl-button');
      bElm.style.display = '';
      bElm = document.getElementById('anno-button');
      bElm.style.display = '';
      } else {
        // Hide the annotation editor aka the black box. Editing will occur in Chaise.
        var styleSheet = document.styleSheets[document.styleSheets.length-1];
        styleSheet.insertRule('.annotorious-editor { display:none }', 0);
  }
}

/*********************************************************/
// post outgoing message events to Chaise, 
/*********************************************************/
function updateAnnotationList(mType, cData) {
window.console.log("in update annotation list.."+mType);
    if (enableEmbedded) {
        window.top.postMessage({messageType: mType, content: cData}, window.location.origin);
    } else {
        if(mType == 'onHighlighted') {
            /* no need to do anything locally */
            return;
        }
        if(mType == 'onUnHighlighted') {
            /* no need to do anything locally */
            return;
        }
        if(mType == 'annotationDrawn') {
            /* ignore this, specific for Chaise only */
            return;
        }
        updateAnnotations();
    }
}

function updateAnnotationState(mType, cState) {
    if (enableEmbedded) {
        window.top.postMessage({messageType: mType, content: cState}, window.location.origin);
    }
}

/*********************************************************/
// An event listener to capture incoming messages from Chaise
/*********************************************************/
window.addEventListener('message', function(event) {
    if (event.origin === window.location.origin) {
        var messageType = event.data.messageType;
        var data = event.data.content;
        switch (messageType) {
            case 'loadAnnotations':
                var annotationsToLoad = {"annoList":[]};
                data.map(function formatAnnotationObj(annotation) {
                    var annotationObj = {
                        "type": "openseadragon_dzi",
                        "id": null,
                        "event": "INFO",
                        "data": {
                            "src": "dzi://openseadragon",
                            "text": annotation.description,
                            "shapes": [
                                {
                                    "type": "rect",
                                    "geometry": {
                                        "x": annotation.coords[0],
                                        "y": annotation.coords[1],
                                        "width": annotation.coords[2],
                                        "height": annotation.coords[3]
                                    },
                                    "style": {}
                                }
                            ],
                            "context": annotation.context_uri
                        }
                    };
                    annotationsToLoad.annoList.push(annotationObj);
                });
                readAll(annotationsToLoad);
                break;
            case 'highlightAnnotation':
                var annotationObj = {
                    "src": "dzi://openseadragon",
                    "text": data.description,
                    "shapes": [
                        {
                            "type": "rect",
                            "geometry": {
                                "x": data.coords[0],
                                "y": data.coords[1],
                                "width": data.coords[2],
                                "height": data.coords[3]
                            },
                            "style": {}
                        }
                    ],
                    "context": data.context_uri
                };
                centerAnnoByHash(getHash(annotationObj));
                break;
            case 'unHighlightAnnotation':
                annoUnHighlightAnnotation(null);
                break;
            case 'highlightAnnotation':
                var annotationObj = {
                    "src": "dzi://openseadragon",
                    "text": data.comments,
                    "shapes": [
                        {
                            "type": "rect",
                            "geometry": {
                                "x": data.coords[0],
                                "y": data.coords[1],
                                "width": data.coords[2],
                                "height": data.coords[3]
                            },
                            "style": {}
                        }
                    ],
                    "context": data.context_uri
                };
                annoHighlightAnnotation(annotationObj);
                break;
            case 'drawAnnotation':
                myAnno.activateSelector();
                break;
            case 'createAnnotation':
                cancelEditor();
                var annotationObj = {
                    "type": "openseadragon_dzi",
                    "id": null,
                    "event": "INFO",
                    "data": {
                        "src": "dzi://openseadragon/something",
                        "text": data.description,
                        "shapes": [
                            {
                                "type": "rect",
                                "geometry": {
                                    "x": data.coords[0],
                                    "y": data.coords[1],
                                    "width": data.coords[2],
                                    "height": data.coords[3]
                                },
                                "style": {}
                            }
                        ],
                        "context": data.context_uri
                    }
                };
                annoAdd(annotationObj.data);
                break;
            case 'cancelAnnotationCreation':
                cancelEditor();
                break;
            case 'updateAnnotation':
                var annotationObj = {
                    "src": "dzi://openseadragon/something",
                    "text": data.description,
                    "shapes": [
                        {
                            "type": "rect",
                            "geometry": {
                                "x": data.coords[0],
                                "y": data.coords[1],
                                "width": data.coords[2],
                                "height": data.coords[3]
                            },
                            "style": {}
                        }
                    ],
                    "context": data.context_uri
                };
                var annotation = annoRetrieveByHash(getHash(annotationObj));
                // TODO: Jessie: Ask Mei about her fn to update annotations
                // For some reason, if you set annotation = annotationObj, Annotorious won't update the annotation with the new text on the UI
                // But annotation.text = annotationObj.text will do it.
                // Maybe Annotorious has a listener for changes to just the text field of annotations.
                annotation.text = annotationObj.text;
                break;
            case 'deleteAnnotation':
                var annotationObj = {
                    "src": "dzi://openseadragon",
                    "text": data.description,
                    "shapes": [
                        {
                            "type": "rect",
                            "geometry": {
                                "x": data.coords[0],
                                "y": data.coords[1],
                                "width": data.coords[2],
                                "height": data.coords[3]
                            },
                            "style": {}
                        }
                    ],
                    "context": data.context_uri
                };
                var annotation = annoRetrieveByHash(getHash(annotationObj));
                myAnno.removeAnnotation(annotation);
                break;
            default:
                console.log('Invalid message type. No action performed. Received message event: ', event);
        }
    } else {
        console.log('Invalid event origin. Event origin: ', origin, '. Expected origin: ', window.location.origin);
    }
});

