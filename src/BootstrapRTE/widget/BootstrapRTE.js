dojo.require("BootstrapRTE.lib.jquery-183-min");
dojo.require("BootstrapRTE.lib.bootstrap-wysiwyg");
dojo.require("BootstrapRTE.lib.external.jquery-hotkeys");
dojo.require("dojo.NodeList-traverse");
dojo.require("dojo.fx.Toggler");
mxui.dom.addCss(require.toUrl("BootstrapRTE/lib/font/css/font-awesome.css"));

(function($) {

dojo.declare("BootstrapRTE.widget.BootstrapRTE", mxui.widget._WidgetBase, {
	inputargs : {
		attribute : "",
                boxMinHeight: 100,
                boxMaxHeight: 600,
                // toolabar options
                showToolbarOnlyOnFocus: false,
                toolbarButtonFont: true,
                toolbarButtonFontsize: true,
                toolbarButtonSize: true,
                toolbarButtonEmphasis: true,
                toolbarButtonList: true,
                toolbarButtonDent: true,
                toolbarButtonJustify: true,
                toolbarButtonLink: true,
                toolbarButtonPicture: true,
                toolbarButtonDoRedo: true
	},

	//housekeeping
	_mxObj : null,
	_inputfield : null,
	_bigBox : null,
	_toolbarNode : null,
	_handle : null,
        isToolbarDisplayed: true,

	postCreate : function(){
            this._inputfield = dojo.create('div', { 'id' : this.id + '_editor' });
            this.createToolbar();
            this.addEditor();			
            this.actLoaded();
            if(this.boxMaxHeight < this.boxMinHeight){
                console.error("Widget configuration error; Bootstrap RTE: Max size is smaler the Min Size");
            }
            var self = this;
            if(this.showToolbarOnlyOnFocus){
                dojo.style(self._toolbarNode, "display", "none"); //Maybe box is fist in tab order, does this need to be checked?
                this.isToolbarDisplayed = false;
                this.toggler = new dojo.fx.Toggler({
                    node: self._toolbarNode,
                    showFunc: dojo.fx.wipeIn,
                    hideFunc: dojo.fx.wipeOut
                  });
                 var handleFocus = dijit.focus.watch("curNode", function(name, oldValue, newValue){
                    var inFocus = self.inFocus(self.domNode, newValue);
                    if (inFocus && ! self.isToolbarDisplayed){                    
                        self.toggler.show();    
                        self.isToolbarDisplayed = true;
                    } else if(!inFocus && self.isToolbarDisplayed) {
                        self.toggler.hide();
                        self.isToolbarDisplayed = false;
                    }
                });
            }
	},

        inFocus :function(node, newValue){
            if(newValue){
                var nodes = dojo.query(node).children().andSelf();;
                for(var i=0; i < nodes.length; i++){
                    if(nodes[i] === newValue)
                        return true;
                }
            } else {
                return false;
            }
        },

	update : function(obj, callback){
		if (this._handle){
			mx.data.unsubscribe(this._handle);
		}
		if(obj){
			var self = this;
			this._mxObj = obj;
			//set the content on update
			dojo.html.set(this._inputfield, this._mxObj.get(this.attribute));
			// fix microflow change calls
			this._handle = mx.data.subscribe({
				guid : this._mxObj.getGuid(),
				callback: function(){
					dojo.html.set(self._inputfield, self._mxObj.get(self.attribute));
				}
			});	
		}
		callback && callback();
	},

	createToolbar : function(){
		this._toolbarNode = dojo.create('div', { 'class' : 'btn-toolbar toolbar_' + this.id, 'data-role' : 'editor-toolbar-' + this.id , 'data-target' : '#' + this.id + '_editor' });
		var self = this;
		//Freedom to create our own toolbar. With freedom comes responsibility.
		//Below we define all the buttons that we'll render.
		var toolbarButtons = [];
                
		if(this.toolbarButtonFont){
                    toolbarButtons.push([
				{toggle: 'font', icon: 'font',
				fonts: [
				{name : 'Arial'},
				{name : 'Courier'},
				{name : 'Helvetica'},
				{name : 'Lucida Grande'},
				{name : 'Times New Roman'},
				{name : 'Verdana'}
                            ]}]);
                }
                if(this.toolbarButtonFontsize){
                    toolbarButtons.push([
				{toggle: 'fontsize', icon: 'text-height', 
				sizes: [
				{type: 'h1', name: 'Header 1'}, 
				{type: 'h2', name: 'Header 2'},
				{type: 'h3', name: 'Header 3'},
				{type: 'p', name:'Normal'}
				]}
			]);
                }
                if(this.toolbarButtonEmphasis){
                    toolbarButtons.push([
				{type: 'bold', 	icon: 'bold'}, 
				{type: 'italic', icon: 'italic'}, 
				{type: 'underline', icon: 'underline'}, 
				{type: 'strikethrough', icon: 'strikethrough'}
			]);
                }
                if(this.toolbarButtonList || this.toolbarButtonDent){
                    var group = [];
                    if(this.toolbarButtonList){
                        group.push({type: 'insertunorderedlist', icon: 'list-ul'});
                        group.push({type: 'insertorderedlist', icon: 'list-ol'});
                    }
                    if(this.toolbarButtonDent){
                        group.push({type: 'outdent', icon: 'indent-left'});
                        group.push({type: 'indent', icon: 'indent-right'});
                    }
                    toolbarButtons.push(group);
                }
                if(this.toolbarButtonJustify){
                    toolbarButtons.push([
				{type: 'justifyleft', icon: 'align-left'},
				{type: 'justifycenter', icon: 'align-center'},
				{type: 'justifyright', icon: 'align-right'},
				{type: 'justifyfull', icon: 'align-justify'}
			]);
                }
                if(this.toolbarButtonLink){
                    toolbarButtons.push([
				{toggle: 'hyperlink', icon: 'link'},
				{type: 'unlink', icon: 'unlink'}
			]);
                }
                if(this.toolbarButtonPicture){
                    toolbarButtons.push([
				{toggle: 'picture', icon: 'picture'}
			]);
                }
                if(this.toolbarButtonDoRedo){
                    toolbarButtons.push([
				{type: 'undo', icon: 'undo'},
				{type: 'redo', icon: 'repeat'}
			]);
                }
		$.each(toolbarButtons, function(index, list){
			self.createGroupedTools(list);
		});
	},

	createGroupedTools : function(buttons) {
		var group = dojo.create('div', { 'class' : 'btn-group' });
		var self = this;
		$.each(buttons, function(index, type){
			if(type.toggle == 'font'){
				self.createFonts(type, group);
			} else if(type.toggle == 'fontsize'){
				//this is the dropdown menu rendering for the font size
				self.createFontSize(type, group);
			} else if (type.toggle == 'hyperlink'){
				//Create Linkfield
				self.createHyperlink(type, group);
			} else if(type.toggle == 'picture') {
				self.createPicture(type, group);
			} else {
				//Regular button rendering
				var button = dojo.create('a', { 'class' : 'btn', 'data-edit' : type.type });
				var icon = dojo.create('i', { 'class' : 'icon-' + type.icon });
				dojo.place(icon, button);
				dojo.place(button, group, 'last');
			}
		});


		dojo.place(group, this._toolbarNode);
	},

	createFonts : function(type, group){
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' });
		var icon = dojo.create('i', { 'class' : 'icon-' + type.icon });
		var caret  = dojo.create('b', {'class' : 'caret'});
		dojo.place(icon, button);
		dojo.place(caret, button);

		var ul = dojo.create('ul', {'class' : 'dropdown-menu'});
		var self = this;
		$.each(type.fonts, function(index, font){
			var item = dojo.create('li');
			var fontTag = dojo.create('a', {'data-edit' : 'fontName ' + font.name});
			dojo.html.set(fontTag, font.name);
			dojo.place(fontTag, item);
			dojo.place(item, ul);
			dojo.style(fontTag, {
				'fontFamily' : font.name
			});
                        self.connect(fontTag, 'onclick', function(e){
				$('#' + self.id + ' .dropdown-menu').hide();
			});
		});
		dojo.place(button, group, 'last');
		dojo.place(ul, group, 'last');
	},

	createFontSize : function(type, group) {
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' });
		var icon = dojo.create('i', { 'class' : 'icon-' + type.icon });
		var caret  = dojo.create('b', {'class' : 'caret'});
		dojo.place(icon, button);
		dojo.place(caret, button);

		var ul = dojo.create('ul', {'class' : 'dropdown-menu'});
		var self = this;
		$.each(type.sizes, function(index, size){
			var item = dojo.create('li');
			var sizetag = dojo.create('a', {'data-edit' : 'formatBlock ' + size.type});
			dojo.html.set(sizetag, '<'+ size.type +'>' + size.name + '</' + size.type + '>');
			self.connect(sizetag, 'onclick', function(e){
				$('#' + self.id + ' .dropdown-menu').hide();
			});
			dojo.place(sizetag, item);
			dojo.place(item, ul);
		});
		dojo.place(button, group, 'last');
		dojo.place(ul, group, 'last');
	},

	createHyperlink : function(type, group){
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown', 'data-original-title' : 'hyperlink'});
		var icon = dojo.create('i', { 'class' : 'icon-' + type.icon });
		var dropurl = dojo.create('div', {'class' : 'dropdown-menu input-append'});
		var urlfield = dojo.create('input', {'class' : 'span2', 'type' : 'text', 'data-edit' : 'createLink', 'placeholder' : 'URL'});
		var urlbutton = dojo.create('button', {'class' : 'btn', 'type' : 'button'}); 
		dojo.html.set(urlbutton, 'Add');
		var self = this;
		self.connect(urlbutton, 'onclick', function(e){
			$('#' + self.id + ' .dropdown-menu').hide();
		});

		dojo.place(urlfield, dropurl);
		dojo.place(urlbutton, dropurl, 'last');
		
		dojo.place(icon, button);
		dojo.place(button, group, 'last');
		dojo.place(dropurl, group, 'last');
	},

	createPicture : function(type, group) {
		var button = dojo.create('a', { 'id': 'pictureBtn' + this.id, 'class' : 'btn'});
		var icon = dojo.create('i', { 'class' : 'icon-' + type.icon });
		var pictureInput = dojo.create('input', {'id' : 'pictureBtnInput' + this.id , 'type' : 'file', 'data-edit' : 'insertImage', 'data-target' : '#pictureBtn' + this.id, 'data-role' : 'magic-overlay'});
		dojo.place(icon, button);
		dojo.place(button, group, 'last');
		dojo.place(pictureInput, group, 'last');
		dojo.style(button, {
			'position'	: 'relative'
		});
		dojo.style(pictureInput, {
			'opacity'	: 0,
			'position'	: 'absolute',
			'top'		: '0.199997px', 
			'left'		: '-0.0000366211px'
		});
	},

	addEditor : function(){
		dojo.place(this._toolbarNode, this.domNode);
		dojo.place(this._inputfield, this.domNode, 'last');
		//fix the image button action (set height and width of overlay input) 
                var imgBtn = dojo.byId("pictureBtn" + this.id);
                if(imgBtn){
                    var  imgBtnPos = dojo.position(imgBtn);
                    //for some dark and unknown reason dojo.style doesn't work, so we'll use jquery.
                    $('#pictureBtnInput' + this.id).css({
                            'width' : imgBtnPos.w, 
                            'height' : imgBtnPos.h
                    });
                }
                
		//force the MX-styles.
		dojo.addClass(this._inputfield, 'form-control mx-textarea-input mx-textarea-input-noresize');
		dojo.style(this._inputfield, {
			'min-height' : this.boxMinHeight + 'px',
			'max-height' : this.boxMaxHeight + 'px'
		});

		$('#' + this.id + '_editor').wysiwyg({ toolbarSelector: '[data-role=editor-toolbar-'+ this.id +']'} );
		this.addListeners();
	},

	addListeners : function() {
		var self = this;

		//save which element was clicked
		var target = null;
		$(document).mousedown(function(e) {
	        // The latest element clicked
	        target = $(e.target);
	    });

	    // when 'target == null' on blur, we know it was not caused by a click
	    $(document).mouseup(function(e) {
	        target = null;
	    });

		$(this._inputfield).on("blur", function(e){
			//use the last element that was clicked to find out if it was a toolbar click.
			if(!target || target.closest('.toolbar_' + self.id).length == 0){
				self.fetchContent();
			}
		});

		//Ok, I'm just going to stick to jquery here for traversing the dom. Much easier.
		$('#'+ this.id +' .dropdown-toggle').on("click", function(e){
			$(this).parent().find('div').toggle();
			$(this).parent().find('ul').toggle();
		});

		//Check if we have to hide the dropdown box.
		var self = this;
		$("#" + this.id).on("click", function(e){
			var isContainer = self.testTarget(e);
			if(!isContainer){
				$('#' + this.id + ' .dropdown-menu').hide();
			}
		});
	},

	fetchContent : function() {
		var text = $(this._inputfield).html();
		var valueChanged = (this._mxObj.get(this.attribute) !== text);
		
		this._mxObj.set(this.attribute, text);
		
		if (valueChanged && this.onchangeMF !== "") {
			this.execMf(this.onchangeMF, this._mxObj.getGuid());
		}
	},

	execMf : function(mf, guid){
		mx.data.action({
			params: {
                applyto     : "selection",
                actionname  : mf,
                guids : [guid]
            }
        });
	}, 

	testTarget : function (e) {
		//See if we clicked the same button
		var isButton = false;
		$.each($('#'+ this.id +' .dropdown-toggle'), function(index, object){
			if (!isButton){
				isButton = $(e.target).parent()[0] == object || $(e.target) == object;
			}
		});
		//See if we clicked inside the box
		var isContainer = $(e.target).closest('ul').siblings('.dropdown-toggle').length > 0 ||
			$(e.target).siblings('.dropdown-toggle').length > 0 ||
			$(e.target).parent().siblings('.dropdown-toggle').length > 0;

		var value = isContainer;
		if(isButton === true) {
			value = isButton;
		}

		return value;
	}

});

})(BootstrapRTE.lib.$);