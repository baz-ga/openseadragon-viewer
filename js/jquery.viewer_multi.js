
/* run :

  http://localhost/tiletiff/mview.html?
         http://localhost/tiletiff/data/DZI/ImageProperties.xml
       or
or
  http://localhost/tiletiff/mview.html?
         http://localhost/tiletiff/data/sample3_DZI/ImageProperties.xml
         &x=0.123&y=1.234&m=2.5
or
  http://localhost/tiletiff/mview.html?
         url=http://localhost/tiletiff/data/first_dzi/ImageProperties.xml
         &url=http://localhost/tiletiff/data/second_dzi/ImageProperties.xml
         &url=http://localhost/tiletiff/data/third_dzi/ImageProperties.xml

http://localhost/tiletiff/mview.html?
 url=http://localhost/data/cirm/real3/DZI/ImageProperties.xml
 &url=http://localhost/data/cirm/real3/DZC/DAPI/ImageProperties.xml
 &url=http://localhost/data/cirm/real3/DZC/Alexa Fluor 488/ImageProperties.xml
 &url=http://localhost/data/cirm/real3/DZC/Alexa Fluor 555/ImageProperties.xml
(the ImageProperties.xml should be used for our application by default)
*/

/* tracking current location .. */

var myViewer=null;

/* for snap and go buttons */
var snapX=null;
var snapY=null;
var snapZoom=null;

/* tracking current location .. */
var logX=null;
var logY=null;
var logZoom=null;
var logHeader=null;
var logURL=[];

var redColors = ['Rhodamine', 'RFP', 'Alexa Fluor 555', 'Alexa Fluor 594', 'tdTomato', 'Alexa Fluor 633', 'Alexa Fluor 647']
var greenColors = ['FITC', 'Alexa 488', 'EGFP', 'Alexa Fluor 488']
var blueColors = ['DAPI']

var filterList = [];
var showFilters = true;

var showRed=true;
var showGreen=true;
var showBlue=true;

//propertyList.push( { 'name': _name, 'cname':cname,  'itemID':i, 'opacity':1, 'hue':100, 'contrast': 10 } );
var propertyList = [];

var collectionMode=false;

// this is to work around that the initial load of the viewport
// always goes to the initial view first
var startState=false;

jQuery(document).ready(function() {

//process args
//  var args = document.location.search.substring(1).split('?');
  var args= document.location.href.split('?');
  if (args.length != 2) {
      alertify.error("Error: Need to supply an url");
      return;
  }
  logHeader=args[0];

  var params = args[1].split('&');
  for (var i=0; i < params.length; i++)
      {
        param = unescape(params[i]);

        if (param.indexOf('=') == -1)
        {
          url=param.replace(new RegExp('/$'),'').trim();
          logURL.push(url);
       } else {
            kvp = param.split('=');
            if(kvp[0].trim() == 'url') {
              url=kvp[1].replace(new RegExp('/$'),'').trim();
              logURL.push(url);
            } else if(kvp[0].trim() == 'x') {
                logX=parseFloat(kvp[1]);
            } else if(kvp[0].trim() == 'y') {
                logY=parseFloat(kvp[1]);
            } else if(kvp[0].trim() == 'z') {
                logZoom=parseFloat(kvp[1]);
            } else {
                var _unknown=kvp[1].replace(new RegExp('/$'),'').trim();
                var _utype=kvp[0].trim();
                alertify.error("Error: Unable to handle param type, "+_utype);
            }
        }
  }
  if(logURL.length == null) {
    alertify.error("Error: Need to supply an url");
  } else {

    myViewer = OpenSeadragon({
                   id: "openseadragon",
                   prefixUrl: "images/",
  //                 debugMode: "true",
                   showNavigator: "true",
                   constrainDuringPan: true,
                   visibilityRatio:     1,

             });

    if (typeof annoSetup === "function") {
        annoSetup(anno,myViewer);
    }
    for( i=0; i<logURL.length; i++) {
       url=logURL[i];
       _addURLLayer(url,i);
    }

    // if logX, logY, logZoom are not null
    if( (logX != null) && (logY != null) && (logZoom !=null)) {
      startState=true;
    }

    // add handlers
      myViewer.addHandler('update-viewport', function(target) {
          if(startState) {
            goPosition(logX,logY,logZoom);
            startState=false;
            } else {
              savePosition();
          }
      });
      myViewer.addHandler('canvas-enter', function(target) {
        /* make it visible */
        if (typeof annoBtnFadeIn === "function") {
          annoBtnFadeIn();
        }
      });

      myViewer.addHandler('canvas-exit', function(target) {
        /* make it invisible */
        if (typeof annoBtnFadeOut === "function") {
          annoBtnFadeOut();
        }
      });
/* XXX
      myViewer.addHandler('tile-drawing', function(target) {
window.console.log("--> making call to tile-drawing..");
         var ctxt = viewer.rendered;
      });
*/
   }
});

function _addURLLayer(url, i) {
  var e = ckExist(url);
  if(e==null) {
    alertify.error("Error: Unable to load url, "+url);
    return;
  }
  var r = extractInfo(e);
  if( r != null) {
    var _name=r['colortype'];
    var _height=r['height'];
    var _width=r['width'];
    var _tileWidth=r['tilewidth'];
    var _tileHeight=r['tileheight'];
    var _levelScale=r['levelscale'];
    var _minLevel=r['minlevel'];
    var _maxLevel=r['maxlevel'];
    var _dir=r['dir'];
    var _realMin=_minLevel;
//this is needed because there is no level 0
    if(_minLevel != 0)
      _realMin = _minLevel+1;

    var path = url.replace('/ImageProperties.xml','');
    if(_dir.split('/').length > 1) {
      if(_dir.search('http')==0) {
        path = _dir;
      }
      } else {
        if(url.search(_dir) == -1) {
          alertify.error("data jpegs should be at the same level as ImageProperties.xml");
        }
    }
    var o=presetOpacity(i);
    var options = {
                  tileSource: {
                     height: _height,
                     width:  _width,
                     tileWidth: _tileWidth,
                     tileHeight: _tileHeight,
                     minLevel: _minLevel,
                     maxLevel: _maxLevel,
                     getLevelScale: function( level ) {
                       var levelScaleCache = {}, i;
                         for( i = 0; i <= _maxLevel; i++ ){
                            levelScaleCache[ i ] = 1 / Math.pow(_levelScale, _maxLevel - i);
                         }
                       this.getLevelScale = function( _level ){
                         return levelScaleCache[ _level ];
                       };
                       return this.getLevelScale( level );
                     },
                     getTileUrl: function( level, x, y ) {
                       t=path+'/'+(level)+"/"+x+"_"+y+".jpg";
                       return t;
                   }},
                   defaultZoomLevel: _realMin,
                   opacity: o
                   };
     myViewer.addTiledImage( options );
     if(_name == "unknown") { // default hue light blue
//       window.console.log("don't know the color type..");
//       invertList.push(i);
       hue=180;
       contrast=1;
     } else if(_name == "combo") {
//       invertList.push(i);
       hue=-1;
       contrast=1;
     } else if(blueColors.indexOf(_name) != -1) {
       hue=240;
       contrast=2;
     } else if(redColors.indexOf(_name) != -1) {
       hue=0;
       contrast=3;
     } else if(greenColors.indexOf(_name) != -1) {
       hue=120;
       contrast=2;
     }
     addItemListEntry(_name,i,_dir,hue,contrast,o);
     var cname = _name.replace(/ +/g, "");
     propertyList.push( { 'name': _name, 'cname':cname, 'itemID':i, 'opacity':o, 'hue':hue, 'contrast':contrast} );
   }
}

// preset
function presetOpacity(i) {
  switch (i) {
   case 0:
     return 1;
     break;
   case 1:
     return 0.8;
     break;
   case 2:
     return 0.6;
     break;
   default:
     return 1;
     break;
 }
}

function _RGBTohex(rgb) {
   var r=Math.floor(rgb[0] * 255);
   var g=Math.floor(rgb[1] * 255);
   var b=Math.floor(rgb[2] * 255);
   var _hex = '#' + (r==0?'00':r.toString(16))+
               (g==0?'00':g.toString(16))+ (b==0?'00':b.toString(16));
   return _hex;
}

function setupItemSliders(idx) {
  var p=propertyList[idx];
  var name=p['cname'];
//propertyList.push( { 'name': _name, 'cname':cname,  'itemID':i, 'opacity':1, 'hue':100, 'contrast': 10 } );
  var _s='#'+name+'_opacity';
  var _sb=name+'_opacity_btn';
  var _c='#'+name+'_contrast';
  var _cb=name+'_contrast_btn';
  var _h='#'+name+'_hue';
  var _hb=name+'_hue_btn';
  var sbtn=document.getElementById(_sb);
  jQuery(_s).slider({
      slide: function( event, ui ) {
        sbtn.value=ui.value;
        _updateOpacity(name, ui.value);
      }
  });
  jQuery(_s).width(100);
  jQuery(_s).slider("option", "value", p['opacity']); // by default
  jQuery(_s).slider("option", "min", 0);
  jQuery(_s).slider("option", "max", 1);
  jQuery(_s).slider("option", "step", 0.1);

  var cbtn=document.getElementById(_cb);
  jQuery(_c).slider({
      slide: function( event, ui ) {
        cbtn.value=ui.value;
        _updateContrast(name,ui.value);
      }
  });
  jQuery(_c).width(100);
  jQuery(_c).slider("option", "value", p['contrast']);
  jQuery(_c).slider("option", "min", 1);
  jQuery(_c).slider("option", "max", 10);
  jQuery(_c).slider("option", "step", 1);

  var hbtn=document.getElementById(_hb);
  jQuery(_h).slider({
      slide: function( event, ui ) {
        hbtn.value=ui.value;
        _updateHue(name,ui.value);
      }
  });
  jQuery(_h).width(100);
  jQuery(_h).slider("option", "value", p['hue']);
  jQuery(_h).slider("option", "min", 0);
  jQuery(_h).slider("option", "max", 360);
  jQuery(_h).slider("option", "step", 10);
}

window.onload = function() {
   for(var i=0; i<propertyList.length; i++ ) {
     setupItemSliders(i);
   }
  //  jQuery('.filtercontrol').hide();
}

// squeeze out all spaces in name
function addItemListEntry(n,i,label,hue,constrast,opacity) {
  var name = n.replace(/ +/g, "");
  var _name=n;
  var _hue_name=name+'_hue';
  var _hue_btn=name+'_hue_btn';
  var _opacity_name=name+'_opacity';
  var _opacity_btn=name+'_opacity_btn';
  var _contrast_name=name+'_contrast';
  var _contrast_btn=name+'_contrast_btn';
  var _hue_init_value=hue;
  var _contrast_init_value=contrast;
  var _opacity_init_value=0.9;

  var _nn='<div style="color:black;">';
//hue hint from http://hslpicker.com/#00e1ff
  _nn+='<div class="item" style="overflow:hidden; width:100%;margin-bottom:4px;"><div class="data" style="float:left; width:200px; margin:10px; font-size:18px;"><input type="checkbox" class="mychkbox" id="'+_name+'" checked="" onClick="toggleItem('+i+','+'\''+_name+'\');" /><label for="'+_name+'" >'+_name+'</label></div>';
  _nn+='<div class="filtercontrol" style="margin:2px;">';
  _nn+='<div class="left"><div class="caption">contrast<input id=\''+_contrast_btn+'\' type="button" class="btn btn-info"  value=\''+_contrast_init_value+'\' style="color:black; background:white; height:16px; width:24px; margin-left:10px; font-size:12px; padding:0px;"></div><div id=\''+_contrast_name+'\' style="background:yellow;"></div></div>';
  _nn+='<div class="middle"><div class="caption">opacity<input id=\''+_opacity_btn+'\' type="button" class="btn btn-info" value=\''+_opacity_init_value+'\' style="color:black; background:white; height:16px; width:24px; margin-left:10px; font-size:12px; padding:0px;"></div><div class="right" id=\''+_opacity_name+'\' style="background:grey;"></div></div>';
if(hue >= 0) {
  _nn+='<div class="right"><div class="caption">hue<input id=\''+_hue_btn+'\' type="button" class="btn btn-info" value=\''+_hue_init_value+'\' style="color:black; background:white; height:16px; width:24px; margin-left:10px; font-size:12px; padding:0px;"></div><div class="h-slider" id=\''+_hue_name+'\'></div></div>';
  } else { // this is a combo or unknown type --> rgb
// XXX
  _nn+='<div id="rgbcontrol" style="display:none" >';
  _nn+='<input type="checkbox" checked="" style="margin-right:5px;margin-top:5px;" onClick="toggleRed('+i+','+'\''+_name+'\');" />red';
  _nn+='<input type="checkbox" checked="" style="margin:5px" onClick="toggleGreen('+i+','+'\''+_name+'\');" />green';
  _nn+='<input type="checkbox" checked="" style="margin:5px" onClick="toggleBlue('+i+','+'\''+_name+'\');" />blue';
  _nn+='</div>';
}
  _nn+='</div></div></div>';
  jQuery('#itemList').append(_nn);
//window.console.log(_nn);
}

// this is called when any of the hue/contrast slider got touched
function _addFilters() {
   // clear filterlist
   filterList=[];
   jQuery('.filtercontrol').show();
   for(i=0;i<propertyList.length;i++) {
     var p=propertyList[i];
//propertyList.push( { 'name': _name, 'itemID':i, 'opacity':1, 'hue':100, 'contrast': 10 } );
     _addFilter(p['itemID'],p['hue'],p['contrast']);
   }
   myViewer.setFilterOptions({
     filters: filterList
   })
}

function _clearFilters() {
   jQuery('.filtercontrol').hide();
   var ilist = ( function() {
          var result = [];
          for (var i = 0; i < myViewer.world.getItemCount(); i++) {
            result.push(myViewer.world.getItemAt(i));
          }
          return result;
        })();
   myViewer.setFilterOptions({
    filters: {
        items: ilist,
        processors: [ ]
    }
   });
}

// 1XX, 0XX
function toggleRed(i,name) {
  showRed = ! showRed;
}
// X1X, X0X
function toggleGreen(i,name) {
  showGreen = ! showGreen;
}
// XX1, XX0
function toggleBlue(i,name) {
  showBlue = ! showBlue;
}

function toggleFilters() {
  showFilters = ! showFilters;
  if(showFilters) {
    _addFilters();
    jQuery('#filtersBtn').prop('value','clearFilters');
    } else {
      _clearFilters();
      jQuery('#filtersBtn').prop('value','addFilters');
  }
}

function _addInvertFilter(ItemID) {
   filterList.push(
      { items: [ myViewer.world.getItemAt(ItemID) ],
        processors: [ OpenSeadragon.Filters.INVERT() ]
      });
}

function _addFilter(ItemID, angle, contrast) {
   var p=myViewer.world.getItemAt(ItemID);
   if(angle < 0) { // special case.. this is a RGB full colored image
     filterList.push( {
        items: [myViewer.world.getItemAt(ItemID) ],
        processors: [ OpenSeadragon.Filters.CONTRAST(contrast)]
     });
     } else {
       filterList.push( {
          items: [myViewer.world.getItemAt(ItemID) ],
          processors: [ OpenSeadragon.Filters.CONTRAST(contrast),
                        OpenSeadragon.Filters.HUE(angle) ]
       });
   }
}

function _updateContrast(name, newContrast) {
  for(i=0; i<propertyList.length; i++) {
     if( propertyList[i]['cname'] == name) {
       var _i=propertyList[i]['itemID'];
       propertyList[i]['contrast']=newContrast;
       _addFilters();
       return;
     }
  }
  alertify.error("_updateContrast should never be here");
}

function _updateHue(name, newHue) {
  for(i=0; i<propertyList.length; i++) {
     if( propertyList[i]['cname'] == name) {
       var _i=propertyList[i]['itemID'];
       propertyList[i]['hue']=newHue;
       _addFilters();
       return;
     }
  }
  alertify.error("_updateHue should never be here");
}

function _getOpacityByID(itemID) {
  for(i=0; i<propertyList.length; i++) {
     if( propertyList[i]['itemID'] == itemID) {
        var p=propertyList[i]['opacity'];
        return p;
     }
  }
  alertify.error("_getOpacityByID should never be here");
}

function _updateOpacity(name, newOpacity) {
  for(i=0; i<propertyList.length; i++) {
     if( propertyList[i]['cname'] == name) {
       var _i=propertyList[i]['itemID'];
       propertyList[i]['opacity']=newOpacity;
       item=myViewer.world.getItemAt(_i);
       item.setOpacity(newOpacity);
//myViewer.forceRedraw();
//myViewer.world.resetItems()
       return;
     }
  }
  alertify.error("_updateOpacity should never be here");
}

function toggleCollectionMode() {
  collectionMode = ! collectionMode;
  if(collectionMode ) {
    var options = { immediately:true,
                layout:'horizontal',
                rows:1 };
    myViewer.world.arrange(options);
    jQuery('#collectionRowBtn').prop('value','noRow');
    } else {
      var i, tiledImage;
      var count = myViewer.world.getItemCount();
      for (i = 0; i < count; i++) {
        tiledImage = myViewer.world.getItemAt(i);
        tiledImage.setPosition(new OpenSeadragon.Point(0, 0));
      }
      jQuery('#collectionRowBtn').prop('value','toRow');
  }
  myViewer.viewport.goHome(true);
}

/* 0 , 1 */
function toggleItem(itemID, itemLabel) {
  var item=myViewer.world.getItemAt(itemID);
  var op=item.getOpacity();
  if (op > 0) {
    item.setOpacity(0);
    } else {
      op=_getOpacityByID(itemID);
      item.setOpacity(op);
  }
}
namehttp://tiku.io/questions/1014477/javascript-convert-grayscale-to-color-given-hue
function _hsv2rgb(h, s, v) {
    h /= 60;
    var i = Math.floor(h);
    var f = h - i;
    var m = v * (1 - s);
    var n = v * (1 - s * f);
    var k = v * (1 - s * (1 - f));
    var rgb;

    switch (i) {
        case 0:
            rgb = [v, k, m];
            break;
        case 1:
            rgb = [n, v, m];
            break;
        case 2:
            rgb = [m, v, k];
            break;
        case 3:
            rgb = [m, n, v];
            break;
        case 4:
            rgb = [k, m, v];
            break;
        case 5:
        case 6:
            rgb = [v, m, n];
            break;
    }

    return {
        r: rgb[0] * 255 | 0,
        g: rgb[1] * 255 | 0,
        b: rgb[2] * 255 | 0
    }
}

function _hsl2rgb(h, s, l) {
    var r, g, b, q, p;

    h /= 360;

    if (s == 0) {
        r = g = b = l;
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t++;
            if (t > 1) t--;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: r * 255,
        g: g * 255,
        b: b * 255};
}


function pointIt(target) {
  if(myViewer === null) {
     alertify.error("viewer is not setup yet..");
     return;
  }
  if(target === null) {
     alertify.error("target is not valid..");
     return;
  }
  var viewportPoint = myViewer.viewport.pointFromPixel( target.position);
  var imagePoint = myViewer.viewport.viewportToImageCoordinates(
                   viewportPoint.x, viewportPoint.y);
  msg= "click point: ("+imagePoint.x
                    +", "+imagePoint.y+")";
  alertify.success(msg);

}

// will always have _X,_Y,_Z
//    document.location=newTitle;
function updateTitle(_X,_Y,_Z) {
  var newTitle= logHeader+"?";
  for( i=0; i<logURL.length; i++) {
    url=logURL[i];
    if(i==0) {
      newTitle=newTitle+'url='+url;
      } else {
        newTitle=newTitle+'&url='+url;
    }
  }
  newTitle=newTitle+"&x="+_X+"&y="+_Y+"&z="+_Z;

  var stateObj = { update: newTitle };

  var i=history.length;
  if(i > 0) {
    var e=history.state;
    if (e) {
      var t=e.update;
      if (t) {
        if ( t != newTitle ) {
            history.pushState(stateObj, 'Title', newTitle)
            return 1;
            } else {
               return 0;
        }
        return 0;
      }
    }
  }
  history.pushState(stateObj, 'Title', newTitle)
  return 1;
//  alertify.confirm(newTitle);
}

function snapPosition() {
   savePosition();
   snapX=logX;
   snapY=logY;
   snapZoom=logZoom;
}

function snapGo() {
   if(snapX!=null && snapY!=null && snapZoom!=null)
     goPosition(snapX,snapY,snapZoom);
}

function savePosition() {

  if(myViewer === null) {
     alertify.error("viewer is not setup yet..");
     return;
  }
  var viewportCenter = myViewer.viewport.getCenter('true');
  logX=viewportCenter.x;
  logY=viewportCenter.y;
  logZoom = myViewer.viewport.getZoom(true);
  return updateTitle(logX,logY,logZoom);
}

function checkIt() {
  if(myViewer === null) {
     alertify.error("viewer is not setup yet..");
     return;
  }
  var viewportCenter = myViewer.viewport.getCenter('true');
  var imageCenter = myViewer.viewport.viewportToImageCoordinates(
                    viewportCenter.x, viewportCenter.y);
  msg10= "viewport center: ("+viewportCenter.x
                         +", "+viewportCenter.y+")";
  msg11= "center point: ("+imageCenter.x
                         +", "+imageCenter.y+")";
  msg1= msg10+ "<br/>" +msg11;

  viewportZoom = myViewer.viewport.getZoom(true);
  imageZoom = myViewer.viewport.viewportToImageZoom(viewportZoom);
  msg2= "imageZoom: "+imageZoom + " from viewportZoom:"+viewportZoom;

  msg= msg1 + "<br/>" + msg2;
//  alertify.confirm(msg);
}

function goPosition(_X,_Y,_Zoom) {
  var _center=new OpenSeadragon.Point(_X,_Y);
  myViewer.viewport.panTo(_center,'true');
  myViewer.viewport.zoomTo(_Zoom);
  myViewer.viewport.applyConstraints();
}

// should be a very small file
function ckExist(url) {
  var http = new XMLHttpRequest();
  http.onload = function () {
    window.console.log(http.responseText);
  }
  http.open("GET", url, false);
  http.send();
  if(http.status!=404)
      return http.responseText;
      else return null;
};

function extractInfo(str) {
  if (window.DOMParser) {
      parser=new DOMParser();
      xmlDoc=parser.parseFromString(str,"text/xml");
      } else { // Internet Explorer
          xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
          xmlDoc.async=false;
          xmlDoc.loadXML(str);
  }
  imageElem= xmlDoc.getElementsByTagName("IMAGE_PROPERTIES");

  var _h=imageElem[0].getAttribute("HEIGHT");
  if(_h != null)
     _h=parseInt(_h,10);
     else alertify.error("Error: DZI image must have a height");

  var _w=imageElem[0].getAttribute("WIDTH");
  if(_w != null)
     _w=parseInt(_w,10);
     else alertify.error("Error: DZI image must have a width");

  var _tw=imageElem[0].getAttribute("TILEWIDTH");
  var _th=imageElem[0].getAttribute("TILEHEIGHT");
  if( _tw == null || _th == null) {
     alertify.error("Error: DZI image must have tileWidth & tileHeight");
     } else {
       _tw=parseInt(_tw,10);
       _th=parseInt(_th,10);
  }

  var _scale=imageElem[0].getAttribute("LEVELSCALE");
  if(_scale != null)
     _scale=parseInt(_scale,10);
     else alertify.error("Error: DZI image must have a level Scale");

  var _min=imageElem[0].getAttribute("MINLEVEL");
  if(_min != null)
     _min=parseInt(_min,10);
     else alertify.error("Error: DZI image must have a minimum Level");

  var _max=imageElem[0].getAttribute("MAXLEVEL");
  if(_max != null)
     _max=parseInt(_max,10);
     else alertify.error("Error: DZI image must have a maximum Level");

  var _colortype=imageElem[0].getAttribute("COLORTYPE");
  if(_colortype == null)
     alertify.error("Error: DZI image must have a color type even if unknown");

  var _dir=imageElem[0].getAttribute("DATA");
  if(_dir == null)
     alertify.error("Error: DZI image must have a data directory name");

  if(_h == null || _w == null || _tw == null || _th == null ||
        _scale == null || _min == null || _max == null ||
              _colortype==null ||_dir == null )
     return null;

  return { 'height':_h,'width':_w, 'tilewidth':_tw,
            'tileheight':_th,'levelscale':_scale,
            'minlevel':_min,'maxlevel':_max,
            'colortype':_colortype,'dir':_dir };
}