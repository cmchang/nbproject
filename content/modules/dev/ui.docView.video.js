/* docView Plugin 
 * Depends:
 *	ui.core.js
 *	 ui.view.js
 *

 Author 
 cf AUTHORS.txt 

 License
 Copyright (c) 2010-2012 Massachusetts Institute of Technology.
 MIT License (cf. MIT-LICENSE.txt or http://www.opensource.org/licenses/mit-license.php)
*/
/*global YT:true jQuery:true console:true*/

(function($) {
	var METRONOME_STATES = {
	PLAYING: 1, 
	PAUSED: 2
	};
	//youtube player seems to only support 16/9 parameters, and fills in with black bands when not the case: 
	//cf https://developers.google.com/youtube/2.0/reference#youtube_data_api_tag_yt:aspectratio
	var ASPECT_RATIO = 16.0/9;
	var pretty_print_time = function(t){
	var n = Math.floor(t);
	var n_minutes = Math.floor(n / 60);
	var n_seconds = n % 60;
	if (n_seconds <10){
		n_seconds = "0" + n_seconds;
	}
	return n_minutes+":"+n_seconds;
	};

	var Metronome = function( position_helper, position, refresh_ms){
	this.position = position || 0; 
	this.refresh_ms = refresh_ms || 1000;
	this.state = METRONOME_STATES.PAUSED;
	this.position_helper = position_helper;
	};
	Metronome.prototype.play = function(){
	if (this.state === METRONOME_STATES.PAUSED){
		this.state = METRONOME_STATES.PLAYING;
		this.__go();
	}
	else{
		console.log("[metronome.play] ignoring since state is already playing");
	}
	};

	Metronome.prototype.__go = function(){
	if (!( this.position_helper)){
		console.error("[metronome] position helper not set !");
		return;
	}
	if (this.state === METRONOME_STATES.PLAYING){
		this.value = this.position_helper();
		$.concierge.trigger({type: "metronome", value:this.value});
		window.setTimeout(this.__go.bind(this), this.refresh_ms);
	}
	};

	Metronome.prototype.pause = function(){
	this.state = METRONOME_STATES.PAUSED;
	};

	var V_OBJ = $.extend({},$.ui.view.prototype,{
		_create: function() {
		$.ui.view.prototype._create.call(this);
		var self = this;
		self.element.append("<div class='util'/><div class='contents'/>");
		self._last_clicked_selection = 0;
		//SACHA: TODO These are sample values: 
		self._w = 800;
		self._h = 600;//sample init
		self._scale = 33;
		self.SEC_MULT_FACTOR = $.concierge.get_component("get_sec_mult_factor")();
		self.T_METRONOME = $.concierge.get_component("get_metronome_period_s")();
		self._page = null; 
		self._id_source = null;
		self._player = null;
		self._id_location = null; //location_id of selected thread
		self._metronome = null;
		self._ignoremetronome = false;
		},
		_defaultHandler: function(evt){
		var self	= this;
		var id_source	= self._id_source;
		var model	= self._model;
		var $thumb, thumbstyle, total_w;
		if (id_source !== $.concierge.get_state("file")){
			return;
		}
		/*
		 * From now on, we assume the event is directed to this view ! 
		 */ 
		switch (evt.type){
		case "note_hover": 
		$("div.selection[id_item="+evt.value+"]", self.element).addClass("hovered");
		break;
		case "note_out":
		$("div.selection[id_item="+evt.value+"]", self.element).removeClass("hovered");
		break;
		case "visibility":
		var fct = evt.value ? "show":"hide";
		$("div.selections, self.element")[fct]();
		break;
		case "global_editor": 
		var $editor = $("<div/>");
		$("div.global-editors", this.element).append($editor);
		$editor.editor();
		break;
		case "select_thread": 
		var o = model.o.location[evt.value];
		self._id_location = evt.value;
		self._page = self._model.o.location[self._id_location].page;
		//move player if it was far enough: 
		if (Math.abs(self._page/self.SEC_MULT_FACTOR - self._player.getCurrentTime()) > self.T_METRONOME){
			self._player.seekTo(self._page/self.SEC_MULT_FACTOR);
		}
		self._render();
		$thumb = $("#docview_scrollbar_thumb");
		thumbstyle = getComputedStyle($thumb[0]);
		total_w = $thumb.parent().width() - $thumb.width() - ((parseInt(thumbstyle.getPropertyValue('border-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('border-right-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-right-width'), 10) || 0)); 
		$thumb.css({left: total_w*self._page/(self._player.getDuration()*self.SEC_MULT_FACTOR)+"px"});
		break;
		case "doc_scroll_down": 
		$.L("[docView11] TODO: doc_scroll_down");		
		break;
		case "doc_scroll_up": 
		$.L("[docView11] TODO: doc_scroll_up");		
		break;
		case "drawable_start": 
		self._player.pauseVideo();
		self._page = Math.floor(self.SEC_MULT_FACTOR*self._player.getCurrentTime());
		$("#docview_drawingarea").attr("page", self._page);
		break;
		case "editor_saving": 
		self._player.playVideo();
		break;
		case "metronome": 
		if (!self._ignoremetronome){
		$thumb = $("#docview_scrollbar_thumb");
		thumbstyle = getComputedStyle($thumb[0]);
		total_w = $thumb.parent().width() - $thumb.width() - ((parseInt(thumbstyle.getPropertyValue('border-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('border-right-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-right-width'), 10) || 0)); 
		$thumb.css({left: total_w*evt.value/self._player.getDuration()+"px"});
				
		// var thumbNailPlace = total_w*evt.value/self._player.getDuration();
		// console.log("Test value: "+ thumbNailPlace);
		// $("#docview_scrollbar_tick").css({left: 150 + "px"});
				
		$("#docview_scrollbar_elapsed").text(pretty_print_time(evt.value));
		}
		break;
		}
		},
		select: function(){
		var id = this._id_source;
		if (id && id !== $.concierge.get_state("file")){
			$.concierge.trigger({type:"file", value:this._id_source });
		}
		}, 
		set_model: function(model, init_event){
		var self=this;
		//for now, we don't register to receive any particular updates.
		model.register($.ui.view.prototype.get_adapter.call(this), {location: null});
		//build view: 
		var id_source = $.concierge.get_state("file");
		self._id_source = id_source; 
		self._model = model;
		self.element.addClass("docView");
		self._generate_contents();
		self._render();
		if (init_event){
			$.concierge.trigger(init_event);
		}
		else{
			$.concierge.trigger({type:"page", value: 1});
		}
		if ($.concierge.activeView == null){
			$.concierge.activeView = self; //init. 
		}
		},
		_keydown: function(event){
		var thread_codes = {37: {sel: "prev", no_sel: "last", dir: "up", msg:"No more comments above..."}, 39: {sel: "next", no_sel:"first", dir: "down", msg:"No more comments below..."}}; 
		var scroll_codes = {38: "-=", 40: "+="};
		var new_sel, id_item, id_new;
		if (event.keyCode in thread_codes){
			var sel = $("div.selection.selected", this.element);
			if (sel.length){
			new_sel = sel[thread_codes[event.keyCode].sel]();
			if (new_sel.length){
				new_sel.click();
			}
			else { // we need to find next location on subsequent pages
				id_item = sel.attr("id_item");
				id_new = $.concierge.get_component("location_closestpage")({id: Number(id_item), model: this._model, direction: thread_codes[event.keyCode].dir}); 
				if (id_new != null){
				$.concierge.trigger({type:"select_thread", value: id_new});
				}
				else{
				$.I( thread_codes[event.keyCode].msg);
				}
			}
			}			
			else{ // no selection on the page
			new_sel = $("div.selection")[thread_codes[event.keyCode].no_sel](); 
			if (new_sel.length){
				new_sel.click();
			}
			}
			return false;
		}
		else if (event.keyCode in scroll_codes){
			$.L("[docView11] TODO _keydown");
		}
		else{
			return true; // let the event be captured for other stuff
		}
		}, 
		update: function(action, payload, items_fieldname){			//TODO: this is exactly the same code as ui.notepaneview7.js: maybe we should factor it out ?			 
			var self = this;			
			var warnIfUsingFlash = function(){
				if ("cueVideoByFlashvars" in self._player && $(".nb-flash-warning", self.element).length===0){
					// http://stackoverflow.com/questions/12486655/detect-if-client-using-html5-youtube-player					
					$("div.contents", self.element).prepend("<div class='nb-flash-warning'>NB detected that you are using the Flash version of the YouTube player. You need to be using the HTML5 YouTube player in order to be able to annotate YouTube videos and see other's annotations. To do so, visit <a href='http://youtube.com/html5'>http://youtube.com/html5</a> and click on the <b>Join the HTML5 Trial</b> button.</div>");
				}
			};
			
			var createTicks = function(payload){
				var newNoteObj; 
				console.log("here");
				for (var id in payload.diff){
					newNoteObj = payload.diff[id];
					//console.log("newNoteObj: ", newNoteObj);
					//calculate the placement of the tickmark
					var $thumb = $("#docview_scrollbar_thumb");
					var thumbstyle = getComputedStyle($thumb[0]);
					var total_w = $thumb.parent().width() - $thumb.width() - ((parseInt(thumbstyle.getPropertyValue('border-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('border-right-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-right-width'), 10) || 0));
					//calculate
					//var self = this;
					var duration = self._player.getDuration()*100;
					var thumbPlace = total_w*newNoteObj.page/duration+"px";
					//copy the htmlText - stores the current tick mark divs (if any)
					var htmlText = $("#docview_scrollbar_tickholder").html();
					//clear the content in the tickholder div
					$("#docview_scrollbar_tickholder").html("");
					//get the html of the new tick mark as a string then insert it (bc .append was buggy)
					htmlText += "<div id='docview_scrollbar_tick' style='left: "+thumbPlace+"' />";
					$("#docview_scrollbar_tickholder").html(htmlText);
				}
		};

		if (action === "add" && items_fieldname==="location"){
			var id_source	= this._id_source; 
			var page		= this._page;
			if (page == null || id_source == null ){
				//initial rendering: Let's render the first page. We don't check the id_source here since other documents will most likely have their page variable already set. 
				this._page = 1;
				this._render();
				var autoProgress = $.Deferred();
				var f_poll = function(){
					if ("getDuration" in self._player){
						autoProgress.resolve();
					}
					else{
						setTimeout(f_poll, 100);
					}
				};
				f_poll(); //initiate polling 
				autoProgress.done(function () {
					warnIfUsingFlash();
					createTicks(payload);
				});
				//TODO: in other "add location" cases we may have to use different method, that forces a to redraw the pages that have been rendered already.
			}
			else{
				createTicks(payload);
				for (var o in payload.diff){
					this._page = payload.diff[o].page;
					this._render();
				}
			}
		}
			else if (action === "remove" && items_fieldname === "location"){ //just re-render the pages where locations were just removed. 
				var D		= payload.diff;
				$.L("[docView11] TODO: remove");
			}
		}, 
		_update: function(){
		$.ui.view.prototype._update.call(this);
		var self = this;
		/*
		 //TODO: If we just do this, we loose the place we were at in the video
		self._generate_contents();
		self._render();		
		*/

		},
		close: function(){
		var id = this._id_source;
		delete $.concierge.features["doc_viewer"][id];
		$.ui.view.prototype.close.call(this);
		$.L("closing docviewer", id);
		},
		_generate_contents: function(){
		/*
		 * either generates or updates contents of the scrollbar
		 * we don't systematically generate it so we can keep the editors, drawables etc...
		 */
		var self	= this;
		var contents	= "<div class='global-editors'/>";
		var id_source	= self._id_source;
		var model	= this._model;
		var file	= model.o.file[id_source];
		$.concierge.trigger({type: "scale", value: self._scale}); 
		self._w	 = this.element.width()-2; //remove 2px to account for border of "material" div 
		self._h	 = self._w/ASPECT_RATIO;
		var w		= self._w;
		var h		= self._h;
		var style	= "width: "+w+"px;height: "+h+"px";
		contents+=  "<div class='material' style='"+style+"'>"+
						"<div id='docview_drawingarea'/>"+
						"<div class='selections'/>"+
						"<div id='youtube_player'/>"+
					"</div>"+


					//videoMenu from prototype, currently merging
					"<div class = 'videoMenu'>"+
						"<div class = 'playORpause_holder'><img class = 'playORpause' src='http://web.mit.edu/changc/www/videoAnnotation/images/pause.png'></div>"+
						"<div class = 'playback'><img class = 'playback' src='http://web.mit.edu/changc/www/videoAnnotation/images/refresh.png'></div>"+
						"<div class = 'progressbar_container'>"+
							"<div id= 'dragRangeContainer'>"+
								"<div id='rangeTick'>"+
									"<div class = 'rightTooltipDiv' style = 'float: right'></div>"+
								"</div>"+
							"</div>"+
							"<div id= 'progressbar'>"+
								"<div class = 'mouseTooltipDiv'></div>"+
								"<div id = 'progressbar_filler'></div>"+
							"</div>"+
							"<div id = 'zoomTick'><div class = 'rightTooltipDiv' style = 'float: right'></div></div>"+
							"<div class = 'tickmark_holder'></div>"+	

							"<div id ='showTime'>"+
								"<div id = 'docview_scrollbar_elapsed'>00:00</div><text> /</text>"+ //docview_scrollbar_elapsed = videoTimeDisplay in prototype
								"<div id = 'docview_scrollbar_total'>--:--</div>"+ //docview_scrollbar_total = videoTotalTimeDisplay
							"</div>"+
						"</div>"+
						"<div class = 'muteORunmute_holder'><img class = 'muteORunmute' src = ' http://web.mit.edu/changc/www/videoAnnotation/images/volume_up.png'></div>"+
					"</div>"+


					"<div id='docview_scrollbar'>"+
						"<span/ id='docview_scrollbar_elapsed'>0:00</span>"+
						"<span/ id='docview_scrollbar_total'>?:??</span>"+
						"<div id='docview_scrollbar_list'>"+
							"<div id='docview_scrollbar_tickholder'></div>"+
					"</div>"+
					"<div id='docview_scrollbar_thumb'/></div>"+
					"<div id='docview_controls'>"+
					"</div>";
		$("div.contents", self.element).html(contents);
		//calculate correct width of progress bar
		var pbWidth = $(".videoMenu").width() - ($(".playORpause").width() + $(".playback").width() + $(".muteORunmute").width()) - 20;
		$(".progressbar_container").css({"width": pbWidth});
		$("#dragRangeContainer").css({"width": pbWidth});
		$(".tickmark_holder").css({"width": pbWidth});
		var drag_helper = function($thumb, pos, make_new_req){
			var duration = self._player.getDuration();
			var thumbstyle = getComputedStyle($thumb[0]);
			var total_w = $thumb.parent().width() - $thumb.width() - ((parseInt(thumbstyle.getPropertyValue('border-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('border-right-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-left-width'), 10) || 0) + (parseInt(thumbstyle.getPropertyValue('margin-right-width'), 10) || 0)); 
			self._player.seekTo(duration * (pos+0.0) / total_w, make_new_req);
		};
		$("#docview_scrollbar_thumb").draggable({axis: "x",
							 containment: "parent", 
							 stop: function(evt, ui) { drag_helper(ui.helper, ui.position.left, true);}, 
							 drag: function(evt, ui) { drag_helper(ui.helper, ui.position.left, false);}
			});
		$("#docview_drawingarea").drawable({model: model});
		// called when the play/pause button is clicked
		// syncs the correct image with the action

		$(".playORpause").click(function(evt){
			var $elt = $(evt.currentTarget);
			if ($elt.hasClass("paused")){
				self._player.playVideo();
				$(".playORpause").attr("src", "http://web.mit.edu/changc/www/videoAnnotation/images/pause.png")
			}
			else{
				//$elt.addClass("paused");
				self._player.pauseVideo();
				$(".playORpause").attr("src", "http://web.mit.edu/changc/www/videoAnnotation/images/play.png")
			}
		});
		$(".playback").click(function(evt){
			var time = self._player.getCurrentTime()
			if (time > 5){
				self._player.seekTo(time - 5);
			}else{
				self._player.seekTo(0);
			}				
		});
		$(".muteORunmute").click(function(evt){
			if ($(".muteORunmute").attr("src") == "http://web.mit.edu/changc/www/videoAnnotation/images/volume_up.png"){
				$(".muteORunmute").attr("src", "http://web.mit.edu/changc/www/videoAnnotation/images/mute.png")
				self._player.mute();
			}else{
				$(".muteORunmute").attr("src", "http://web.mit.edu/changc/www/videoAnnotation/images/volume_up.png")
				self._player.unMute();
			}
		})
		var $material = $("div.material", self.element).click(function(evt){
			var numpage = evt.currentTarget.getAttribute("page");
			$.concierge.trigger({type: "page", value:numpage});
			
			}).mouseenter(function(evt){
				var numpage = evt.currentTarget.getAttribute("page");
				if (numpage !== self._page){
				$.concierge.trigger({type: "page_peek", value:numpage});
				}
			});
		self._v_margin = parseInt($material.css("margin-bottom"), 10) + parseInt($material.css("margin-top"), 10 );
		self._player = new YT.Player('youtube_player', {
				height: ""+self._h,
				width: ""+self._w,
			videoId: model.get("youtubeinfo", {}).first().key,
			playerVars: {controls: 0}, 
			events: {
				'onReady': function(event){
					//				var player = event.target;
					console.log("player onready - creating metronome!");
					self._metronome = new Metronome(function(){return self._player.getCurrentTime();}, 0, self.T_METRONOME*1000);
					self._player.playVideo();
				},
				'onStateChange': function(event){
					if (event.data === YT.PlayerState.PLAYING){
						// TODO: put this at init time once we have the length metadata
						$("#docview_scrollbar_total").text(pretty_print_time(self._player.getDuration()));

						self._metronome.play();
						// $("#docview_button_play").removeClass("paused");
						$(".playORpause").removeClass("paused");
						self._ignoremetronome = false;
					}
					else{
						self._ignoremetronome = true;
						self._metronome.pause();
						// $("#docview_button_play").addClass("paused");
						$(".playORpause").addClass("paused");
					}
				}
			}
			});
		},
		_render: function(){
		/*
		 * this is where we implement the caching strategy we want...
		 */
		var p = this._page;
		this._render_one(p);
		}, 
		_render_one: function(page){
		var self	= this;
		self._draw_selections(page);
		}, 
		_draw_selections: function(page){
		var self = this;
		var contents;
		var id_source = parseInt(self._id_source, 10) ;
		var model = this._model;		
		var t,l,w,h, ID, locs, o, sel_contents, s_w=self._w/1000.0, s_h=self._h/1000.0;
		var file = model.o.file[id_source];
		contents="";
		locs = model.get("location", {id_source: id_source, page: page}).sort(self.options.loc_sort_fct);
		var me = $.concierge.get_component("get_userinfo")();
		for (var i=0;i<locs.length;i++){
			o = locs[i];
			ID=o.ID;
			t=o.top*s_h;
			l=o.left*s_w;
			w=o.w*s_w;
			h=o.h*s_h;
			sel_contents = "";
			if (!(model.get("comment", {ID_location: ID, admin: 1}).is_empty())){
			sel_contents += "<div class='nbicon adminicon' title='An instructor/admin has participated to this thread'/>";
			}
			if (!(model.get("comment", {ID_location: ID, id_author: me.id}).is_empty())){
			if (model.get("comment", {ID_location: ID, type: 1}).is_empty()){
				sel_contents += "<div class='nbicon meicon' title='I participated to this thread'/>";
			}
			else{
				sel_contents += "<div class='nbicon privateicon' title='I have private comments in this thread'/>";
			}
			}
			contents+=("<div class='selection' id_item='"+ID+"' style='top: "+t+"px; left: "+l+"px; width: "+w+"px; height: "+h+"px'>"+sel_contents+"</div>");
		}	
		$("div.material>div.selections", self.element).html(contents).children("div.selection").mouseover(function(evt){
			$.concierge.trigger({type:"note_hover", value: evt.currentTarget.getAttribute("id_item")});
			}).mouseout(function(evt){
				$.concierge.trigger({type:"note_out", value: evt.currentTarget.getAttribute("id_item")});
			}).click(function(evt){
				$.concierge.trigger({type:"select_thread", value: evt.currentTarget.getAttribute("id_item")});
				});
		var sel = model.o.location[self._id_location];
		if (sel && sel.page===page){//highlight selection
			$("div.selection[id_item="+self._id_location+"]",self.element).addClass("selected");
		}
		}
	});
	
	$.widget("ui.docView",V_OBJ );
	$.ui.docView.prototype.options = {
	img_server: "http://localhost", 
	loc_sort_fct: function(o1, o2){return o1.top-o2.top;},
	provides: ["doc"], 
	listens: {
		note_hover: null, 
		note_out: null, 
		visibility: null, 
		global_editor: null, 
		select_thread: null,
		drawable_start: null,
		editor_saving: null,
		metronome: null
	}			
	};
})(jQuery);
