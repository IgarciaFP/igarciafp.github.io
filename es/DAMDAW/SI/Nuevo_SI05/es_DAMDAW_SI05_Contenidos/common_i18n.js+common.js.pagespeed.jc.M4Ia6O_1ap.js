var mod_pagespeed_1B$RqlDm6J = "$exe_i18n={previous:\"Anterior\",next:\"Siguiente\",show:\"Mostrar\",hide:\"Ocultar\",showFeedback:\"Mostrar retroalimentación\",hideFeedback:\"Ocultar retroalimentación\",correct:\"Correcto\",incorrect:\"Incorrecto\",menu:\"Menú\",download:\"Descargar\",yourScoreIs:\"Su puntuación es \",dataError:\"Error al recuperar los datos\",epubJSerror:\"Esto podría no funcionar en este lector de ePubs.\",epubDisabled:\"Esta actividad no funciona en formato ePub.\",solution:\"Solución\",print:\"Imprimir\"};";
var mod_pagespeed_iS9LctJ7FM = "if(typeof($exe_i18n)=='undefined')$exe_i18n={previous:\"Previous\",next:\"Next\",show:\"Show\",hide:\"Hide\",showFeedback:\"Show Feedback\",hideFeedback:\"Hide Feedback\",correct:\"Correct\",incorrect:\"Incorrect\",menu:\"Menu\",download:\"Download\",yourScoreIs:\"Your score is \",dataError:\"Error recovering data\",epubJSerror:\"This might not work in this ePub reader.\",solution:\"Solution\",epubDisabled:\"This activity does not work in ePub.\",print:\"Print\"}\nvar $exe={init:function(){var e=document.body.className;$exe.addRoles();if(e!=\"exe-single-page js\"){var t=$exe.isIE();if(t){if(t>7)$exe.iDeviceToggler.init()}else $exe.iDeviceToggler.init()}this.hasMultimediaGalleries=false;this.setMultimediaGalleries();this.setModalWindowContentSize();if(e.indexOf(\"exe-epub3\")!=0){var n=document.body.innerHTML;if(this.hasMultimediaGalleries||$(\".mediaelement\").length>0){$exe.loadMediaPlayer.getPlayer();}}else{document.body.className+=' js';}$exe.hint.init();$exe.setIframesProperties();$exe.hasTooltips();$exe.math.init();$exe.dl.init();$(\"a.exe-enlarge\").each(function(i){var e=$(this);var c=$(this).children();if(c.length==1&&c.eq(0).prop(\"tagName\")==\"IMG\"){e.prepend('<span class=\"exe-enlarge-icon\"><b></b></span>');}});$exe.sfHover();$(\"INPUT.autocomplete-off\").attr(\"autocomplete\",\"off\");$('.feedbackbutton.feedback-toggler').click(function(){$exe.toggleFeedback(this,false);});$('.cloze-feedback-toggler').click(function(){var e=$(this);var id=e.attr('name').replace('feedback','');$exe.cloze.toggleFeedback(id,this);});$('.cloze-score-toggler').click(function(){var e=$(this);var id=e.attr('name').replace('getScore','');$exe.cloze.showScore(id,1);});$('form.cloze-form').submit(function(){var e=$(this);var id=e.attr('name').replace('cloze-form-','');try{$exe.cloze.showScore(id,1);}catch(e){var txt=$exe_i18n.dataError;if($('body').hasClass('exe-epub3'))txt+='<br /><br />'+$exe_i18n.epubJSerror;$(\"#clozeScore\"+id).html(txt);}return false;});$('form.quiz-test-form').submit(function(){try{calcScore2();}catch(e){var txt=$exe_i18n.dataError;if($('body').hasClass('exe-epub3'))txt+='<br /><br />'+$exe_i18n.epubJSerror;$('form.quiz-test-form input[type=submit]').hide().before(txt);}return false;});$('.exe-radio-option').click(function(){var c=this.className.split(\" \");if(c.length!=2)return;c=c[1];c=c.replace(\"exe-radio-option-\",\"\");c=c.split(\"-\");if(c.length!=4)return;$exe.getFeedback(c[0],c[1],c[2],c[3]);});$('form.multi-select-form').submit(function(){return false;});$('.multi-select-feedback-toggler').click(function(){var i=this.id.replace(\"multi-select-feedback-toggler-\",\"\");i=i.split(\"-\");if(i.length!=2)return;$exe.showFeedback(this,i[0],i[1]);});$('form.cloze-activity-form').submit(function(){try{var e=$(this);var id=e.attr('name').replace('cloze-form-','');$exe.cloze.submit(id);}catch(e){var txt=$exe_i18n.dataError;if($('body').hasClass('exe-epub3'))txt+='<br /><br />'+$exe_i18n.epubJSerror;if($exe.cloze.hasBeenTested==false){$exe.cloze.hasBeenTested=true;$('form.cloze-activity-form input[type=submit]').hide().before(txt);}}return false;});},setModalWindowContentSize:function(){if(window.chrome){$(\".exe-dialog-text img\").each(function(){var e=$(this);var h=e.attr(\"height\");var w=e.attr(\"width\");if(e.height()==0&&e.css(\"height\")==\"0px\"&&h&&w){if(!isNaN(h)&&h>0&&!isNaN(w)&&w>0){var maxW=480;if(w<maxW)maxW=w;h=Math.round(maxW*h/w);e.css(\"height\",h+\"px\");}}});}},setMultimediaGalleries:function(){if(typeof($.prettyPhoto)!='undefined'){var lightboxLinks=$(\"a[rel^='lightbox']\");lightboxLinks.each(function(i){var ref=$(this).attr(\"href\");var _ref=ref.toLowerCase();var isAudio=_ref.indexOf(\".mp3\")!=-1;var isVideo=_ref.indexOf(\".mp4\")!=-1||_ref.indexOf(\".flv\")!=-1||_ref.indexOf(\".ogg\")!=-1||_ref.indexOf(\".ogv\")!=-1;if(isAudio||isVideo){var id=\"media-box-\"+i;$(this).attr(\"href\",\"#\"+id);var hiddenPlayer=$('<div class=\"exe-media-box js-hidden\" id=\"'+id+'\"></div>');if(isAudio)hiddenPlayer.html('<div class=\"exe-media-audio-box\"><audio controls=\"controls\" src=\"'+ref+'\" class=\"exe-media-box-element exe-media-box-audio\"><a href=\"'+ref+'\">audio/mpeg</a></audio></div>');else hiddenPlayer.html('<div class=\"exe-media-video-box\"><video width=\"480\" height=\"385\" controls=\"controls\" class=\"exe-media-box-element\"><source src=\"'+ref+'\" /></video></div>');$(\"body\").append(hiddenPlayer);$exe.hasMultimediaGalleries=true;}var t=this.title;if(ref.indexOf('#')==0&&$(ref).length==1&&t&&t!=\"\")$(ref).prepend('<h2 class=\"pp_title\">'+t+'</h2>');});lightboxLinks.prettyPhoto({social_tools:\"\",deeplinking:false,opacity:0.85,changepicturecallback:function(){var block=$(\"#pp_full_res\")\nvar media=$(\".exe-media-box-element\",block);if($exe.loadMediaPlayer.isReady){if(media.length==1)media.mediaelementplayer();$exe.loadMediaPlayer.isCalledInBox=true;}var cont=$(\".pp_content_container\");cont.attr(\"class\",\"pp_content_container\");if(media.length==1&&media[0].hasAttribute('src')){if(media.hasClass(\"exe-media-box-audio\"))cont.attr(\"class\",\"pp_content_container with-audio\");var src=media.attr('src');var ext=src.split(\"/\");ext=ext[ext.length-1];ext=ext.split(\".\")[1];$(\".pp_details .pp_description\").append(' <span class=\"exe-media-download\"><a href=\"'+src+'\" title=\"'+$exe_i18n.download+'\" download>'+ext+'</a></span>');}else{block=$(\".pp_inline\",block);if(block.length==1)$(\".pp_description\").hide();}}});var eXeGalleries=$('.GalleryIdevice');if(lightboxLinks.length==0&&eXeGalleries.length>0&&typeof(exe_editor_mode)==\"undefined\"){$('.exeImageGallery a').each(function(){this.title+=\" ~ [\"+this.href+\"]\";this.href=\"#\";this.onclick=function(){var ul=$(this).parent().parent();if(ul.length==1&&ul.attr('id')!=\"\"){if($(\"#\"+ul.attr('id')+\"-warning\").length==0){var txt=$exe_i18n.dataError;if($('body').hasClass('exe-epub3'))txt+='<br /><br />'+$exe_i18n.epubJSerror;ul.prepend('<div id=\"'+ul.attr('id')+'-warning\">'+txt+'</div>');}}}});}}},sfHover:function(){var e=document.getElementById(\"siteNav\");if(e){var t=e.getElementsByTagName(\"LI\");for(var n=0;n<t.length;n++){t[n].onmouseover=function(){this.className=\"sfhover\"};t[n].onmouseout=function(){this.className=\"sfout\"}}var r=e.getElementsByTagName(\"A\");for(var n=0;n<r.length;n++){r[n].onfocus=function(){this.className+=(this.className.length>0?\" \":\"\")+\"sffocus\";this.parentNode.className+=(this.parentNode.className.length>0?\" \":\"\")+\"sfhover\";if(this.parentNode.parentNode.parentNode.nodeName==\"LI\"){this.parentNode.parentNode.parentNode.className+=(this.parentNode.parentNode.parentNode.className.length>0?\" \":\"\")+\"sfhover\";if(this.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName==\"LI\"){this.parentNode.parentNode.parentNode.parentNode.parentNode.className+=(this.parentNode.parentNode.parentNode.parentNode.parentNode.className.length>0?\" \":\"\")+\"sfhover\"}}};r[n].onblur=function(){this.className=this.className.replace(new RegExp(\"( ?|^)sffocus\\\\b\"),\"\");this.parentNode.className=this.parentNode.className.replace(new RegExp(\"( ?|^)sfhover\\\\b\"),\"\");if(this.parentNode.parentNode.parentNode.nodeName==\"LI\"){this.parentNode.parentNode.parentNode.className=this.parentNode.parentNode.parentNode.className.replace(new RegExp(\"( ?|^)sfhover\\\\b\"),\"\");if(this.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName==\"LI\"){this.parentNode.parentNode.parentNode.parentNode.parentNode.className=this.parentNode.parentNode.parentNode.parentNode.parentNode.className.replace(new RegExp(\"( ?|^)sfhover\\\\b\"),\"\")}}}}}},mediaReplace:function(){if(navigator.appName==\"Microsoft Internet Explorer\"){var e=document.getElementsByTagName(\"OBJECT\");var t=e.length;while(t--){if(e[t].type==\"video/quicktime\"||e[t].type==\"audio/x-pn-realaudio-plugin\"){if(typeof e.classid==\"undefined\"){e[t].style.display=\"none\";var n=\"02BF25D5-8C17-4B23-BC80-D3488ABDDC6B\";if(e[t].type==\"audio/x-pn-realaudio-plugin\")n=\"CFCDAA03-8BE4-11CF-B84B-0020AFBBCCFA\";var r=e[t].height;var i=e[t].width;var s=e[t].data;var o=document.createElement(\"DIV\");o.innerHTML='<object classid=\"clsid:'+n+'\" data=\"'+s+'\" width=\"'+i+'\" height=\"'+r+'\"><param name=\"controller\" value=\"true\" /><param name=\"src\" value=\"'+s+'\" /><param name=\"autoplay\" value=\"false\" /></object>';e[t].parentNode.insertBefore(o,e[t])}}}}else if(document.body.className.indexOf(\"exe-epub3\")==0){$(\"object\").each(function(){var e=$(this);var p=e.attr(\"data\");var w,h,f;var v=$(\"param[name=flv_src]\",e);if(p==\"flowPlayer.swf\"&&v.length==1){w=this.width||320;h=this.height||240;f=v.attr(\"value\");e.before('<video width=\"'+w+'\" height=\"'+h+'\" src=\"'+f+'\" controls=\"controls\"><a href=\"'+f+'\">'+f+'</a></video>').remove()}else if(p.indexOf(\"xspf_player.swf?song_url=\")==0){f=p.replace(\"xspf_player.swf?song_url=\",\"\");f=f.split(\"&\")[0];e.before('<audio width=\"300\" height=\"32\" src=\"'+f+'\" controls=\"controls\"><a href=\"'+f+'\">'+f+'</a></audio>').remove()}});}},rgb2hex:function(a){if(/^#[0-9A-F]{6}$/i.test(a))return a;a=a.match(/^rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)$/);function hex(x){return(\"0\"+parseInt(x).toString(16)).slice(-2)}return\"#\"+hex(a[1])+hex(a[2])+hex(a[3])},useBlackOrWhite:function(h){var r=parseInt(h.substr(0,2),16);var g=parseInt(h.substr(2,2),16);var b=parseInt(h.substr(4,2),16);var y=((r*299)+(g*587)+(b*114))/1000;return(y>=128)?'black':'white'},dl:{init:function(){var l=$(\"dl.exe-dl\");if(l.length==0)return false;var h,e,t,bg,tc,s,id;l.each(function(i){e=this;bg=$exe.rgb2hex($(e).css(\"color\"));tc=$exe.useBlackOrWhite(bg.replace(\"#\",\"\"));s=\" style='text-decoration:none;background:\"+bg+\";color:\"+tc+\"'\";if(e.id==\"\")e.id=\"exe-dl-\"+i;id=e.id;$(\"dt\",e).each(function(){t=this;h=$(t).html();$(t).html(\"<a href='#' class='exe-dd-toggler exe-dl-\"+i+\"-a'><span class='icon'\"+s+\">» </span>\"+h+\"</a>\")});$(e).before(\"<p class='exe-dl-toggler'><a href='#\"+id+\"' title='\"+$exe_i18n.show+\"'\"+s+\">+</a> <a href='#\"+id+\"' title='\"+$exe_i18n.hide+\"'\"+s+\">-</a></p>\")});$('a.exe-dd-toggler').click(function(){$exe.dl.toggle(this);return false;});$('.exe-dl-toggler a').click(function(){var id=$(this).attr('href').replace(\"#\",\"\");var action='show';if($(this).attr('title')==$exe_i18n.hide)action='hide';$exe.dl.toggle(action,id);});},toggle:function(e,a){if(e==\"show\")$(\"#\"+a+\" dd\").show();else if(e==\"hide\")$(\"#\"+a+\" dd\").hide();else $(e).parent().next(\"dd\").toggle()}},hasTooltips:function(){if($(\"A.exe-tooltip\").length>0){var p=\"\";if(typeof(exe_editor_mode)!=\"undefined\")p=\"\/scripts/exe_tooltips/\";$exe.loadScript(p+\"exe_tooltips.js\",\"$exe.tooltips.init('\"+p+\"')\")}},math:{engine:\"https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=TeX-AMS-MML_HTMLorMML\",createLinks:function(math){var mathjax=false;if(!math){var math=$(\".exe-math\");mathjax=true;}math.each(function(){var e=$(this);var img=$(\".exe-math-img img\",e);var txt=\"LaTeX\";if(e.html().indexOf(\"<math\")!=-1)txt=\"MathML\";var html='';if(img.length==1)html+='<a href=\"'+img.attr(\"src\")+'\" target=\"_blank\">GIF</a>';if(!mathjax){if(html!=\"\")html+='<span> - </span>';html+='<a href=\"#\" class=\"exe-math-code-lnk\">'+txt+'</a>';}if(html!=\"\"){html='<p class=\"exe-math-links\">'+html+'</p>';e.append(html);}$(\".exe-math-code-lnk\").click(function(){$exe.math.showCode(this);return false;});});},showCode:function(e){var tit=e.innerHTML;var block=$(e).parent().parent();var code=$(\".exe-math-code\",block);var a=window.open(tit);a.document.open(\"text/html\");var html='<!DOCTYPE html><html><head><title>'+tit+'</title>';html+='<style type=\"text/css\">body{font:10pt/1.5 Verdana,Arial,Helvetica,sans-serif;margin:10pt;padding:0}</style>';html+='</head><body><pre><code>';html+=code.html();html+='</code></pre></body></html>';a.document.write(html);a.document.close();},init:function(){var math=$(\".exe-math\");var mathjax=false;if(math.length>0){math.each(function(){var e=$(this);if(e.hasClass(\"exe-math-engine\")){if(navigator.onLine)mathjax=true;}});if(mathjax&&navigator.onLine){$(\".exe-math-code\").each(function(){var code=this.innerHTML.replace(/ /g,'');if(code.indexOf(\"<math\")==-1){if(code.indexOf(\"\\\\[\")!=0&&code.substr(code.length-2)!=\"\\\\]\"){this.innerHTML=\"\\\\[ \"+this.innerHTML+\" \\\\]\";}}});$exe.loadScript($exe.math.engine,$exe.math.createLinks());}else{$exe.math.createLinks(math);}}}},addRoles:function(){$(\"#header\").attr(\"role\",\"banner\");$(\"#siteNav\").attr(\"role\",\"navigation\");$(\"#main\").attr(\"role\",\"main\");$(\"#siteFooter\").attr(\"role\",\"contentinfo\");$(\".js-feedback\").attr(\"role\",\"status\")},isIE:function(){var e=navigator.userAgent.toLowerCase();return e.indexOf(\"msie\")!=-1?parseInt(e.split(\"msie\")[1]):false},imageGallery:{init:function(e){$(\"A\",\"#\"+e).attr(\"rel\",\"lightbox[\"+e+\"]\")}},hint:{init:function(){$(\".iDevice_hint\").each(function(e){if(typeof($exe.hint.imgs)=='undefined'){$exe.hint.imgs=['panel-amusements.png','stock-stop.png'];}var t=e+1;var n=\"hint-\"+t;var r=$(\".iDevice_hint_content\",this);var i=$(\".iDevice_hint_title\",this);if(r.length==1&&i.length==1){r.eq(0).attr(\"id\",n);var s=i.eq(0);var o=s.html();s.html('<a href=\"#'+n+'\" title=\"'+$exe_i18n.show+'\" class=\"hint-toggler show-hint\" id=\"toggle-'+n+'\" style=\"background-image:url('+$exe.hint.imgs[0]+')\">'+o+\"</a>\")}$('.hint-toggler',this).click(function(){$exe.hint.toggle(this);return false;});});},toggle:function(e){var t=e.id.replace(\"toggle-\",\"\");if(e.title==$exe_i18n.show){$(\"#\"+t).fadeIn(\"slow\");e.title=$exe_i18n.hide;e.className=\"hint-toggler hide-hint\";e.style.backgroundImage=\"url(\"+$exe.hint.imgs[1]+\")\"}else{$(\"#\"+t).fadeOut();e.title=$exe_i18n.show;e.className=\"hint-toggler show-hint\";e.style.backgroundImage=\"url(\"+$exe.hint.imgs[0]+\")\"}}},iDeviceToggler:{init:function(){if($(\".iDevice\").length<2)return false;var t=$(\".iDevice_header,.iDevice.emphasis0\");t.each(function(){var t=$exe_i18n.hide;e=$(this),c=e.hasClass(\"iDevice_header\")?\"em1\":\"em0\",eP=e.parents(\".iDevice_wrapper\");if(eP.length){var n='<p class=\"toggle-idevice toggle-'+c+'\"><a href=\"#\" id=\"toggle-idevice-'+eP.attr(\"id\")+'-'+c+'\" title=\"'+t+'\"><span>'+t+\"</span></a></p>\";if(c==\"em1\"){var r=e.html();e.html(r+n)}else e.before(n)}});$(\".toggle-idevice a\").click(function(){var id=this.id.replace(\"toggle-idevice-\",\"\");id=id.split(\"-\");$exe.iDeviceToggler.toggle(this,id[0],id[1]);return false;});},toggle:function(e,t,n){var r=$exe_i18n.hide;var i=$(\"#\"+t);var s=\".iDevice_content\";if(n==\"em1\")s=\".iDevice_inner\";var o=$(s,i);var u=i.attr(\"class\");if(typeof u==\"undefined\")return false;if(u.indexOf(\" hidden-idevice\")==-1){r=$exe_i18n.show;u+=\" hidden-idevice\";o.slideUp(\"fast\");e.className=\"show-idevice\";e.title=r;e.innerHTML=\"<span>\"+r+\"</span>\"}else{u=u.replace(\" hidden-idevice\",\"\");o.slideDown(\"fast\");e.className=\"hide-idevice\";e.title=r;e.innerHTML=\"<span>\"+r+\"</span>\"}i.attr(\"class\",u)}},alignMediaElement:function(e){var t=$(e);var n=t.parents().eq(2);var r=n.attr(\"class\");if(typeof r==\"string\"&&r.indexOf(\"mejs-container\")==0){var i=e.style.marginLeft;var s=e.style.marginRight;if(i==\"auto\"&&i==s)$(n).wrap('<div style=\"text-align:center\"></div>')}},loadMediaPlayer:{isCalledInBox:false,isReady:false,getPlayer:function(){$exe.mediaelements=$(\".mediaelement\");$exe.mediaelements.each(function(){if(typeof this.localName!=\"undefined\"&&this.localName==\"video\"){var e=this.width;var t=$(window).width();if(e>t){var n=t-20;var r=parseInt(this.height*n/e);this.width=n;this.height=r}}}).hide();var e=\"exe_media.js\";if(typeof eXe!=\"undefined\"){e=\"..\/scripts/mediaelement/\"+e}$exe.loadScript(e,\"$exe.loadMediaPlayer.getCSS()\")},getCSS:function(){var e=\"exe_media.css\";if(typeof eXe!=\"undefined\"){e=\"..\/scripts/mediaelement/\"+e}$exe.loadScript(e,\"$exe.loadMediaPlayer.init()\")},init:function(){if(typeof eXe!=\"undefined\"){mejs.MediaElementDefaults.flashName=\"..\/scripts/mediaelement/\"+mejs.MediaElementDefaults.flashName;mejs.MediaElementDefaults.silverlightName=\"..\/scripts/mediaelement/\"+mejs.MediaElementDefaults.silverlightName}$exe.mediaelements.mediaelementplayer().show().each(function(){$exe.alignMediaElement(this)});$exe.loadMediaPlayer.isReady=true;if(!$exe.loadMediaPlayer.isCalledInBox)$(\"#pp_full_res .exe-media-box-element\").mediaelementplayer();}},setIframesProperties:function(){setTimeout(function(){var p=window.location.protocol;var t=false;if(p!=\"http\"&&p!=\"https\")t=true;$(\"iframe\").each(function(){var i=$(this);var s=i.attr(\"src\");if(t&&s.indexOf(\"//\")==0)$(this).attr(\"src\",\"http:\"+s);s=i.attr(\"src\");if(!i.hasClass(\"external-iframe\")&&s.indexOf(\"http\")==0){i.addClass(\"external-iframe\").before(\"<span class='external-iframe-src' style='display:none'><a href='\"+s+\"'>\"+s+\"</a></span>\");}});},1000);},loadScript:function(url,callback){var s;if(url.split(\".\").pop()==\"css\"){s=document.createElement(\"link\");s.type=\"text/css\";s.rel=\"stylesheet\";s.href=url}else{s=document.createElement(\"script\");s.type=\"text/javascript\";s.src=url}if(s.readyState){s.onreadystatechange=function(){if(s.readyState==\"loaded\"||s.readyState==\"complete\"){s.onreadystatechange=null;if(callback)eval(callback)}}}else{s.onload=function(){if(callback)eval(callback)}}document.getElementsByTagName(\"head\")[0].appendChild(s)},getFeedback:function(e,t,n,r){var i,s;if(r==\"truefalse\"){var o=\"right\";if(e==1)o=\"wrong\";var u=document.getElementById(\"s\"+n+\"-result\");var a=document.getElementById(\"s\"+n);if(!u||!a)return false;var f=$exe_i18n.incorrect;if(u.className==o)f=$exe_i18n.correct;u.innerHTML=f;a.style.display=\"block\"}else{for(i=0;i<t;i++){s=\"sa\"+i+\"b\"+n;var d=\"none\";if(i==e)d=\"block\";document.getElementById(s).style.display=d;}}},showFeedback:function(e,t,n){var r,i,s,o;for(r=0;r<t;r++){var u=n+r.toString();var a=document.getElementById(\"op\"+u);i=\"False\";s=$exe_i18n.incorrect;o=\"wrong\";if(a.checked==1)i=\"True\";if(i==a.value){s=\"<strong>\"+$exe_i18n.correct+\"</strong>\";o=\"right\"}var f='<p class=\"'+o+'-option\">'+s+\"</p>\";var l=$(\"#feedback-\"+u);if(e.value==$exe_i18n.showFeedback)l.html(f).show();else l.hide()}if(e.value==$exe_i18n.showFeedback){$(\"#f\"+n).show();e.value=$exe_i18n.hideFeedback}else{$(\"#f\"+n).hide();e.value=$exe_i18n.showFeedback}},toggleFeedback:function(e,b){var t=e.name.replace(\"toggle-\",\"\");var n=document.getElementById(t);var d=false;var r=window[t.replace(\"-\",\"\")+\"text\"];if(typeof(r)!='undefined'){r=r.split(\"|\");if(r.length>1)d=true}if(n){if(n.className==\"feedback js-feedback js-hidden\"){n.className=\"feedback js-feedback\";if(b)e.value=$exe_i18n.hideFeedback;else if(d)e.value=r[1]}else{n.className=\"feedback js-feedback js-hidden\";if(b)e.value=$exe_i18n.showFeedback;else if(d)e.value=r[0]}}},insertSymbol:function(e,t,n){var r=document.getElementById(e);$exe.insertAtCursor(r,t,n)},insertAtCursor:function(e,t,n){if(e.selectionStart||e.selectionStart==\"0\"){var r=e.selectionStart;var i=e.selectionEnd;e.value=e.value.substring(0,r)+t+e.value.substring(i,e.value.length);e.selectionStart=r+t.length-n}else{e.value+=t}e.selectionEnd=e.selectionStart;e.focus()}};$exe.cloze={NOT_ATTEMPTED:0,WRONG:1,CORRECT:2,hasBeenTested:false,change:function(ele){var ident=$exe.cloze.getIds(ele)[0];var instant=eval(document.getElementById(\"clozeFlag\"+ident+\".instantMarking\").value);if(instant){$exe.cloze.checkAndMarkWord(ele);var scorePara=document.getElementById(\"clozeScore\"+ident);scorePara.innerHTML=\"\"}},submit:function(e){$exe.cloze.showScore(e,1);$exe.cloze.toggle(\"submit\"+e);$exe.cloze.toggle(\"restart\"+e);$exe.cloze.toggle(\"showAnswersButton\"+e);$exe.cloze.toggleFeedback(e)},restart:function(e){$exe.cloze.toggleFeedback(e);$exe.cloze.toggleAnswers(e,true);$exe.cloze.toggle(\"restart\"+e);$exe.cloze.toggle(\"showAnswersButton\"+e);$exe.cloze.toggle(\"submit\"+e)},toggleAnswers:function(e,t){var n=true;var r=$exe.cloze.getInputs(e);if(!t){for(var i=0;i<r.length;i++){var s=r[i];if($exe.cloze.getMark(s)!=2){n=false;break}}}if(n){$exe.cloze.clearInputs(e,r)}else{$exe.cloze.fillInputs(e,r)}var o=document.getElementById(\"clozeScore\"+e);o.innerHTML=\"\";var u=document.getElementById(\"getScore\"+e);if(u){u.disabled=!n}},fillInputs:function(e,t){if(!t){var t=$exe.cloze.getInputs(e)}for(var n=0;n<t.length;n++){var r=t[n];var i=$exe.cloze.getAnswer(r);i=i.trim();var s=false;if(i.indexOf(\"|\")==0&&i.charAt(i.length-1)==\"|\"){var o=i;var o=o.substring(1,o.length-1);var u=o.split(\"|\");if(u.length>1){s=true;var a=\"\";for(x=0;x<u.length;x++){a+=u[x];if(x<u.length-1)a+=\" — \";if(u[x]==\"\")s=false}}if(s){r.className=\"autocomplete-off width-\"+r.style.width;r.style.width=\"auto\";i=a}}r.value=i;$exe.cloze.markWord(r,$exe.cloze.CORRECT);r.setAttribute(\"readonly\",\"readonly\")}},clearInputs:function(e,t){if(!t){var t=$exe.cloze.getInputs(e)}for(var n=0;n<t.length;n++){var r=t[n];if(r.className.indexOf(\"autocomplete-off width-\")!=-1){var i=r.className.replace(\"autocomplete-off width-\",\"\");r.style.width=i}r.value=\"\";$exe.cloze.markWord(r,$exe.cloze.NOT_ATTEMPTED);r.removeAttribute(\"readonly\")}},checkAndMarkWord:function(e){var t=$exe.cloze.checkWord(e);if(t!=\"\"){$exe.cloze.markWord(e,$exe.cloze.CORRECT);e.value=t;return $exe.cloze.CORRECT}else if(!e.value){$exe.cloze.markWord(e,$exe.cloze.NOT_ATTEMPTED);return $exe.cloze.NOT_ATTEMPTED}else{$exe.cloze.markWord(e,$exe.cloze.WRONG);return $exe.cloze.WRONG}},markWord:function(e,t){switch(t){case 0:e.style.backgroundColor=\"\";e.style.color=\"\";break;case 1:e.style.backgroundColor=\"#FF9999\";e.style.color=\"#000000\";break;case 2:e.style.backgroundColor=\"#CCFF99\";e.style.color=\"#000000\";break}return t},getMark:function(e){var t=$exe.cloze.checkWord(e);if(t!=\"\"){return $exe.cloze.CORRECT}else if(!e.value){return $exe.cloze.NOT_ATTEMPTED}else{return $exe.cloze.WRONG}},getAnswer:function(e){var t=$exe.cloze.getIds(e);var n=t[0];var r=t[1];var i=document.getElementById(\"clozeAnswer\"+n+\".\"+r);var s=i.innerHTML;s=$exe.cloze.decode64(s);s=unescape(s);result=\"\";var o=\"X\".charCodeAt(0);for(var u=0;u<s.length;u++){var a=s.charCodeAt(u);o^=a;result+=String.fromCharCode(o)}return result},decode64:function(e){var t=\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\";var n=\"\";var r,i,s;var o,u,a,f;var l=0;e=e.replace(/[^A-Za-z0-9\\+\\/\\=]/g,\"\");do{o=t.indexOf(e.charAt(l++));u=t.indexOf(e.charAt(l++));a=t.indexOf(e.charAt(l++));f=t.indexOf(e.charAt(l++));r=o<<2|u>>4;i=(u&15)<<4|a>>2;s=(a&3)<<6|f;n=n+String.fromCharCode(r);if(a!=64){n=n+String.fromCharCode(i)}if(f!=64){n=n+String.fromCharCode(s)}}while(l<e.length);return n},checkWord:function(e){var t=e.value;var n=$exe.cloze.getAnswer(e);var r=n;r=r.trim();var i=r.indexOf(\"|\");var s=r.lastIndexOf(\"|\");if(i==0&&s==r.length-1){var o=r.split(\"|\");var u;for(var a in o){if(o[a]!=\"\"){u=$exe.cloze.checkWordAnswer(e,o[a]);if(u!=\"\")return o[a]}}return\"\"}else return $exe.cloze.checkWordAnswer(e,r)},checkWordAnswer:function(ele,original_answer){original_answer=original_answer.trim();var guess=ele.value;var answer=original_answer;var ident=$exe.cloze.getIds(ele)[0];var strictMarking=eval(document.getElementById(\"clozeFlag\"+ident+\".strictMarking\").value);var checkCaps=eval(document.getElementById(\"clozeFlag\"+ident+\".checkCaps\").value);var $form=$(ele).closest('.iDevice_wrapper');if($form.length==1&&$form.hasClass(\"ListaIdevice\")){strictMarking=true;checkCaps=true;}if(!checkCaps){guess=guess.toLowerCase();answer=answer.toLowerCase()}if(guess==answer){return original_answer;}else if(strictMarking||answer.length<=4){return\"\";}else{var i=0;var j=0;var orders=[[answer,guess],[guess,answer]];var maxMisses=Math.floor(answer.length/6)+1;var misses=0;if(guess.length<=maxMisses){misses=Math.abs(guess.length-answer.length);for(i=0;i<guess.length;i++){if(answer.search(guess[i])==-1){misses+=1}}if(misses<=maxMisses){return original_answer}else{return\"\"}}for(i=0;i<2;i++){var string1=orders[i][0];var string2=orders[i][1];while(string1){misses=Math.floor((Math.abs(string1.length-string2.length)+Math.abs(guess.length-answer.length))/2);var max=Math.min(string1.length,string2.length);for(j=0;j<max;j++){var a=string2.charAt(j);var b=string1.charAt(j);if(a!=b)misses+=1;if(misses>maxMisses)break}if(misses<=maxMisses){return original_answer;}string1=string1.substr(1)}}return\"\"}},getIds:function(e){var t=e.id.slice(10);var n=t.indexOf(\".\");var r=t.slice(0,n);var i=t.slice(t.indexOf(\".\")+1);return[r,i]},showScore:function(e,t){var n=0;var r=document.getElementById(\"cloze\"+e);var i=$exe.cloze.getInputs(e);for(var s=0;s<i.length;s++){var o=i[s];if(t){var u=$exe.cloze.checkAndMarkWord(o)}else{var u=$exe.cloze.getMark(o)}if(u==2){n++}}var a=document.getElementById(\"clozeScore\"+e);a.innerHTML=$exe_i18n.yourScoreIs+n+\"/\"+i.length+\".\"},getInputs:function(e){var t=new Array;var n=document.getElementById(\"cloze\"+e);$exe.cloze.recurseFindInputs(n,e,t);return t},recurseFindInputs:function(e,t,n){for(var r=0;r<e.childNodes.length;r++){var i=e.childNodes[r];if(i.id){if(i.id.search(\"clozeBlank\"+t)==0){n.push(i);continue}}if(i.hasChildNodes()){$exe.cloze.recurseFindInputs(i,t,n)}}},toggleFeedback:function(e,t){var n=document.getElementById(\"clozeVar\"+e+\".feedbackId\");if(n){var r=n.value;if(t){if(t.value==$exe_i18n.showFeedback)t.value=$exe_i18n.hideFeedback;else t.value=$exe_i18n.showFeedback}$exe.cloze.toggle(r)}},toggle:function(e){$(\"#\"+e).toggle()},onLangChange:function(ele){var ident=$exe.cloze.getLangIds(ele)[0];var instant=eval(document.getElementById(\"clozelangFlag\"+ident+\".instantMarking\").value);if(instant){$exe.cloze.checkAndMarkLangWord(ele);var scorePara=document.getElementById(\"clozelangScore\"+ident);scorePara.innerHTML=\"\"}},langSubmit:function(e){$exe.cloze.showLangScore(e,1);$exe.cloze.toggle(\"submit\"+e);$exe.cloze.toggleLangFeedback(e)},langRestart:function(e){$exe.cloze.toggleLangFeedback(e);$exe.cloze.toggleLangAnswers(e,true);$exe.cloze.toggle(\"restart\"+e);$exe.cloze.toggle(\"showAnswersButton\"+e);$exe.cloze.toggle(\"submit\"+e)},toggleLangAnswers:function(e,t){var n=true;var r=$exe.cloze.getLangInputs(e);if(!t){for(var i=0;i<r.length;i++){var s=r[i];if($exe.cloze.getLangMark(s)!=2){n=false;break}}}if(n){$exe.cloze.clearLangInputs(e,r)}else{$exe.cloze.fillLangInputs(e,r)}var o=document.getElementById(\"clozelangScore\"+e);o.innerHTML=\"\";var u=document.getElementById(\"getScore\"+e);if(u){u.disabled=!n}},fillLangInputs:function(e,t){if(!t){var t=$exe.cloze.getLangInputs(e)}for(var n=0;n<t.length;n++){var r=t[n];r.value=$exe.cloze.getLangAnswer(r);$exe.cloze.markWord(r,$exe.cloze.CORRECT);r.setAttribute(\"readonly\",\"readonly\")}},clearLangInputs:function(e,t){if(!t){var t=$exe.cloze.getLangInputs(e)}for(var n=0;n<t.length;n++){var r=t[n];r.value=\"\";$exe.cloze.markWord(r,$exe.cloze.NOT_ATTEMPTED);r.removeAttribute(\"readonly\")}},checkAndMarkLangWord:function(e){var t=$exe.cloze.checkLangWord(e);if(t!=\"\"){$exe.cloze.markLangWord(e,$exe.cloze.CORRECT);e.value=t;return $exe.cloze.CORRECT}else if(!e.value){$exe.cloze.markLangWord(e,$exe.cloze.NOT_ATTEMPTED);return $exe.cloze.NOT_ATTEMPTED}else{$exe.cloze.markLangWord(e,$exe.cloze.WRONG);return $exe.cloze.WRONG}},markLangWord:function(e,t){switch(t){case 0:e.style.backgroundColor=\"\";break;case 1:e.style.backgroundColor=\"#FF9999\";break;case 2:e.style.backgroundColor=\"#CCFF99\";break}return t},getLangMark:function(e){switch(e.style.backgroundColor){case\"#FF9999\":return 1;case\"#CCFF99\":return 2;default:return 0}},getLangAnswer:function(e){var t=$exe.cloze.getLangIds(e);var n=t[0];var r=t[1];var i=document.getElementById(\"clozelangAnswer\"+n+\".\"+r);var s=i.innerHTML;s=$exe.cloze.decode64(s);s=unescape(s);result=\"\";var o=\"X\".charCodeAt(0);for(var u=0;u<s.length;u++){var a=s.charCodeAt(u);o^=a;result+=String.fromCharCode(o)}return result},checkLangWord:function(ele){var guess=ele.value;var original=$exe.cloze.getLangAnswer(ele);var answer=original;var guess=ele.value;var ident=$exe.cloze.getLangIds(ele)[0];var strictMarking=eval(document.getElementById(\"clozelangFlag\"+ident+\".strictMarking\").value);var checkCaps=eval(document.getElementById(\"clozelangFlag\"+ident+\".checkCaps\").value);if(!checkCaps){guess=guess.toLowerCase();answer=original.toLowerCase()}if(guess==answer){return original;}else if(strictMarking||answer.length<=4){return\"\";}else{var i=0;var j=0;var orders=[[answer,guess],[guess,answer]];var maxMisses=Math.floor(answer.length/6)+1;var misses=0;if(guess.length<=maxMisses){misses=Math.abs(guess.length-answer.length);for(i=0;i<guess.length;i++){if(answer.search(guess[i])==-1){misses+=1}}if(misses<=maxMisses){return answer}else{return\"\"}}for(i=0;i<2;i++){var string1=orders[i][0];var string2=orders[i][1];while(string1){misses=Math.floor((Math.abs(string1.length-string2.length)+Math.abs(guess.length-answer.length))/2);var max=Math.min(string1.length,string2.length);for(j=0;j<max;j++){var a=string2.charAt(j);var b=string1.charAt(j);if(a!=b)misses+=1;if(misses>maxMisses)break}if(misses<=maxMisses){return answer;}string1=string1.substr(1)}}return\"\"}},getLangIds:function(e){var t=e.id.slice(14);var n=t.indexOf(\".\");var r=t.slice(0,n);var i=t.slice(t.indexOf(\".\")+1);return[r,i]},showLangScore:function(ident,mark){var showScore=eval(document.getElementById(\"clozelangFlag\"+ident+\".showScore\").value);if(showScore){var score=0;var div=document.getElementById(\"clozelang\"+ident);var inputs=$exe.cloze.getLangInputs(ident);for(var i=0;i<inputs.length;i++){var input=inputs[i];if(mark){var result=$exe.cloze.checkAndMarkLangWord(input)}else{var result=$exe.cloze.getLangMark(input)}if(result==2){score++}}var scorePara=document.getElementById(\"clozelangScore\"+ident);scorePara.innerHTML=$exe_i18n.yourScoreIs+score+\"/\"+inputs.length+\".\"}},recurseFindLangInputs:function(e,t,n){for(var r=0;r<e.childNodes.length;r++){var i=e.childNodes[r];if(i.id){if(i.id.search(\"clozelangBlank\"+t)==0){n.push(i);continue}}if(i.hasChildNodes()){$exe.cloze.recurseFindLangInputs(i,t,n)}}},getLangInputs:function(e){var t=new Array;var n=document.getElementById(\"clozelang\"+e);$exe.cloze.recurseFindLangInputs(n,e,t);return t},toggleLangFeedback:function(e){var t=document.getElementById(\"clozelangVar\"+e+\".feedbackId\");if(t){var n=t.value;$exe.cloze.toggle(n)}}};if(typeof jQuery!=\"undefined\"){$(function(){$exe.init();});$(window).load(function(){$exe.mediaReplace();});}";
