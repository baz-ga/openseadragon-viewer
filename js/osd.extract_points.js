

/***
   informations to setup,

   Can be more than 1 or more images,
   images : [
          {
          filename: url-abc.czi, 
          channels: [ {id: 'red', source: 'none' },
                      {id: 'green', source: 'none' },
                      {id: 'blue', source: 'none'} ],
          scale: { x: 0.219522, y:0.219522 },
          coord: { x: 0.0, y: 0.0, z: 0.0 },
          zspacing: { z: 0.0, slices: 1 } 
          }
            ]

   // skip thumbnail lines..
   <thumbnail> .. </thumbnail>
   layers : [
         {
         color: "#00FFFF",
         closed: "true",
         shape: "Contour", 
         property: { GUID: "", FillDensity: 0 },
         points: [ { x:4162.14, y:-482.95, z:0.0, d:38.40 },
                   { x:4395.71, y:-509.29, z:0.0, d:38.40 },
                   ..
                 ]
         },
         {
         color: "#00FFFF",
         closed: "true",
         shape: "Contour", 
         property: { GUID: "", FillDensity: 0 },
         points: [ { x:4313.17, y:-4378.15, z:0.0, d:7.02 },
                   { x:4313.17, y:-4318.66, z:0.0, d:7.02 }
                 ]
         },
         ...
            ],
  
   text : [
        {
          color: '#00800",
          font: { name:'Times New Roman', size: 72 },
          points: [{ x:864.36, y:-389.04, z:0.0, d:0.0}],
          value: 'Kidney'
        }
          ]
           
***/
// track the user supplied overlay xml in json 
var saveOverlayShapes=[]; 
var saveOverlayTexts=[]; 

var parseXml;
function getXML(blob) {
  if (typeof window.DOMParser != "undefined") {
    return ( new window.DOMParser() ).parseFromString(blob, "text/xml");
    } else {
      if (typeof window.ActiveXObject != "undefined" &&
               new window.ActiveXObject("Microsoft.XMLDOM")) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(blob);
        return xmlDoc;
        } else {
          throw new Error("No XML parser found");
      }
  }
}

//from https://davidwalsh.name/convert-xml-json
// Changes XML to JSON
function xmlToJson(xml) {
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
};

function addAShape(_d,_xscale,_yscale) {
  var _ad=_d['@attributes'];
  var _color=_ad['color'];
  var _closed=_ad['closed'];
  var _dpoints=_d['point'];

  var _dlist=[];
  _dpoints.forEach(function( item ) {
     _dlist.push(item['@attributes']);
  });
  var _dproperties=_d['property'];
  var _plist=[];
  _dproperties.forEach(function( item ) {
     var klist=Object.keys(item);
     var _ap=item['@attributes']; 
     var _label=_ap['name'];
     var _nl=klist[1];
     var _n=item[_nl];
     var _nn=JSON.stringify(_n);
     var _sn=JSON.stringify(item);
     _plist.push({name:_label, value:_sn});
  });

  // properties

  saveOverlayShapes.push({ xscale:_xscale,
                         yscale:_yscale,
                         color:_color,
                         closed:_closed,
                         property:_plist,
                         points:_dlist });
}


function addAText(_text,_xscale,_yscale) {
  var _atext=_text['@attributes'];
  var _color=_atext['color'];
  var _font=_text['font'];
  var _afont=_font['@attributes'];
  var _fontType=_afont['name'];
  var _fontSize=_afont['size'];
  var _point=_text['point'];
  var _apoint=_point['@attributes'];
  var _value=_text['value']['#text'];

  saveOverlayTexts.push({ xscale:_xscale,
                          yscale:_yscale,
                          color:_color,
                          points:_apoint,
                          fontType:_fontType,
                          fontSize:_fontSize,
                          text:_value });
}


function extractDataXML(blob) {
  var dataXml=getXML(blob);
//var clist=dataXml.getElementsByTagName("contour");
//alert(dataXml.documentElement.nodeName);
//window.console.log(clist);
//var pScale=dataXml.getElementsByTagName("scale")
//var pXscale=pScale[0].getAttribute('x');
//var pyscale=pScale[0].getAttribute('y');
//var pContour=dataXml.getElementsByTagName("contour")
// use the first one
//var pColor=pContour[0].getAttribute('color');
//var pProperty=pContour[0].getElementsByTagName("property");
//var plen=pProperty.length;
//var jsonText = JSON.stringify(xmlToJson(dataXml));

  var dataJson= xmlToJson(dataXml);

  var _s=dataJson;
  var _mbf=_s['mbf'];
  var _images=_mbf['images'];
  var _image=_images['image']
  var _scale=_image['scale'];
  var _ascale=_scale['@attributes'];
  var _xscale=_ascale['x'];
  var _yscale=_ascale['y'];

  var _contour=_mbf['contour']; 
// if there is more than one of them
  if( _contour.constructor === Array) {
    var clen=_contour.length;
    for(var idx=0; idx< clen; idx++) {
      addAShape(_contour[idx],_xscale,_yscale);
    }
    } else {// just one of them
      if(_contour != null) 
        addAShape(_contour,_xscale,_yscale);
  }
 
  var _text=_mbf['text'];
  if( _text.constructor === Array) {
    var tlen=_text.length;
    for(var idx=0; idx< tlen; idx++) {
       addAText(_text[idx],_xscale,_yscale);
    }
    } else {
      if(_text != null) 
        addAText(_text,_xscale,_yscale);
  }
}

