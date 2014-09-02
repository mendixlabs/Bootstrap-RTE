dojo.require("BootstrapRTE.lib.jquery-183-min");
dojo.require("BootstrapRTE.lib.bootstrap-wysiwyg");
dojo.require("BootstrapRTE.lib.external.jquery-hotkeys");
dojo.require("dojo.NodeList-traverse");
dojo.require("dojo.fx.Toggler");
mxui.dom.addCss(require.toUrl("BootstrapRTE/lib/font/css/font-awesome.css"));

(function($) {

dojo.declare("BootstrapRTE.widget.BootstrapRTE", [mxui.widget._WidgetBase,  mxui.mixin._ValidationHelper], {

    /**
     * Variables
     */
	_mxObj : null,
	_inputfield : null,
	_bigBox : null,
	_toolbarNode : null,
	_handle : null,
	_validationHandle: null,
    _isToolbarDisplayed: true,

    /**
     * Mendix Client API functions
     */
    update : function(obj, callback){
        if (this._handle){
            mx.data.unsubscribe(this._handle);
        }
		if (this._validationHandle){
            mx.data.unsubscribe(this._validationHandle);
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
			
			this._validationHandle = mx.data.subscribe({
				guid     : obj.getGuid(),
				val      : true,
				callback : dojo.hitch(this, function(validations) {
					var val = validations[0],
						msg = val.getReasonByAttribute(this.attribute);                            
					if (msg) {
						this.addError(msg);
						val.removeAttribute(this.attribute);
					}

				})
			});
			
        }
        callback && callback();
    },

	postCreate : function(){

        // Variables
        var self = this;

        // Check settings.
        if(this.boxMaxHeight < this.boxMinHeight){
            console.error("Widget configuration error; Bootstrap RTE: Max size is smaler the Min Size");
        }

        // Create input field.
        this._inputfield = dojo.create('div', { 'id' : this.id + '_editor' });

        // Created toolbar and editor.
        this._createToolbar();
        this._addEditor();

        if(this.showToolbarOnlyOnFocus){

            dojo.style(self._toolbarNode, "display", "none"); //Maybe box is first in tab order, does this need to be checked?
            this._isToolbarDisplayed = false;
            this.toggler = new dojo.fx.Toggler({
                node: self._toolbarNode,
                showFunc: dojo.fx.wipeIn,
                hideFunc: dojo.fx.wipeOut
            });
            var handleFocus = dijit.focus.watch("curNode", function(name, oldValue, newValue) {
                var inFocus = self._inFocus(self.domNode, newValue);
                if (inFocus && ! self._isToolbarDisplayed){
                    self.toggler.show();
                    self._isToolbarDisplayed = true;
                } else if(!inFocus && self._isToolbarDisplayed) {
                    self.toggler.hide();
                    self._isToolbarDisplayed = false;
                }
            });
        }

        this.actLoaded();
	},

    /**
     * Custom widget functions
     */
    _inFocus :function(node, newValue){
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

	_createToolbar : function(){

        // Variables.
        var self = this,
            //Freedom to create our own toolbar. With freedom comes responsibility.
            //Below we define all the buttons that we'll render.
            toolbarButtons = [];

        // Create toolbar.
		this._toolbarNode = dojo.create('div', { 'class' : 'btn-toolbar toolbar_' + this.id, 'data-role' : 'editor-toolbar-' + this.id , 'data-target' : '#' + this.id + '_editor' });

        // Create toolbar button font
		if(this.toolbarButtonFont){
            toolbarButtons.push([
                {
                    toggle: 'font',
                    icon: 'font',
                    fonts: [
                        {name : 'Arial'},
                        {name : 'Courier'},
                        {name : 'Helvetica'},
                        {name : 'Lucida Grande'},
                        {name : 'Times New Roman'},
                        {name : 'Verdana'}
                    ]
                }
            ]);
        }

        if(this.toolbarButtonFontsize){
            toolbarButtons.push([
                {
                    toggle: 'fontsize',
                    icon: 'text-height',
                    sizes: [
                        {type: 'h1', name: 'Header 1'},
                        {type: 'h2', name: 'Header 2'},
                        {type: 'h3', name: 'Header 3'},
                        {type: 'p', name:'Normal'}
                    ]
                }
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

        // For each.
		dojo.forEach(toolbarButtons, function(list, index){
			self._createGroupedTools(list);
		});
	},

	_createGroupedTools : function(buttons) {

        // Variables
		var group = dojo.create('div', { 'class' : 'btn-group' }),
            self = this;

        dojo.forEach(buttons, function(type, index){
			if(type.toggle == 'font'){
				self._createFonts(type, group);
			} else if(type.toggle == 'fontsize'){
				//this is the dropdown menu rendering for the font size
				self._createFontSize(type, group);
			} else if (type.toggle == 'hyperlink'){
				//Create Linkfield
				self._createHyperlink(type, group);
			} else if(type.toggle == 'picture') {
				self._createPicture(type, group);
			} else {

				// Variables
				var button = dojo.create('a', { 'class' : 'btn', 'data-edit' : type.type }),
                    icon = dojo.create('i', { 'class' : 'icon-' + type.icon });

				dojo.place(icon, button);
				dojo.place(button, group, 'last');
			}
		});

		dojo.place(group, this._toolbarNode);

	},

	_createFonts : function(type, group){

        // Variables
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' }),
            icon = dojo.create('i', { 'class' : 'icon-' + type.icon }),
            caret  = dojo.create('b', {'class' : 'caret'}),
            ul = dojo.create('ul', {'class' : 'dropdown-menu'}),
            self = this;

        // Place icon and caret
		dojo.place(icon, button);
		dojo.place(caret, button);

        // Create HTML elements
        dojo.forEach(type.fonts, function(font, index){

            // Variables
			var item = dojo.create('li'),
			    fontTag = dojo.create('a', {'data-edit' : 'fontName ' + font.name});

            // Create
			dojo.html.set(fontTag, font.name);
			dojo.place(fontTag, item);
			dojo.place(item, ul);
			dojo.style(fontTag, {
				'fontFamily' : font.name
			});

            dojo.connect(fontTag, 'onclick', function(e){
                dojo.query('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
			});

		});

        // Place button and ul.
		dojo.place(button, group, 'last');
		dojo.place(ul, group, 'last');
	},

	_createFontSize : function(type, group) {

        // Variables
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' }),
            icon = dojo.create('i', { 'class' : 'icon-' + type.icon }),
            caret  = dojo.create('b', {'class' : 'caret'}),
            ul = dojo.create('ul', {'class' : 'dropdown-menu'}),
            self = this;

        // Place icon and caret
		dojo.place(icon, button);
		dojo.place(caret, button);

        dojo.forEach(type.sizes, function(size, index){

            // Variables
			var item = dojo.create('li'),
			    sizetag = dojo.create('a', {'data-edit' : 'formatBlock ' + size.type});

            // Create HTML.
			dojo.html.set(sizetag, '<'+ size.type +'>' + size.name + '</' + size.type + '>');
			dojo.connect(sizetag, 'onclick', function(e){
                dojo.query('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
			});
			dojo.place(sizetag, item);
			dojo.place(item, ul);

		});

        // Place button and ui.
		dojo.place(button, group, 'last');
		dojo.place(ul, group, 'last');

	},

	_createHyperlink : function(type, group){

        // Variables
		var button = dojo.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown', 'data-original-title' : 'hyperlink'}),
            icon = dojo.create('i', { 'class' : 'icon-' + type.icon }),
            dropurl = dojo.create('div', {'class' : 'dropdown-menu input-append'}),
            urlfield = dojo.create('input', {'class' : 'span2', 'type' : 'text', 'data-edit' : 'createLink', 'placeholder' : 'URL'}),
            urlbutton = dojo.create('button', {'class' : 'btn', 'type' : 'button'}),
            self = this;

		dojo.html.set(urlbutton, 'Add');

        dojo.connect(urlbutton, 'onclick', function(e){
            dojo.query('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
		});

		dojo.place(urlfield, dropurl);
		dojo.place(urlbutton, dropurl, 'last');
		
		dojo.place(icon, button);
		dojo.place(button, group, 'last');
		dojo.place(dropurl, group, 'last');
	},

	_createPicture : function(type, group) {

        // Variables
		var button = dojo.create('a', { 'id': 'pictureBtn' + this.id, 'class' : 'btn'}),
		    icon = dojo.create('i', { 'class' : 'icon-' + type.icon }),
		    pictureInput = dojo.create('input', {'id' : 'pictureBtnInput' + this.id , 'type' : 'file', 'data-edit' : 'insertImage', 'data-target' : '#pictureBtn' + this.id, 'data-role' : 'magic-overlay'});

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

	_addEditor : function(){

		dojo.place(this._toolbarNode, this.domNode);
		dojo.place(this._inputfield, this.domNode, 'last');

		//fix the image button action (set height and width of overlay input) 
        var imgBtn = dojo.byId("pictureBtn" + this.id);
        if(imgBtn){

            var  imgBtnPos = dojo.position(imgBtn);

            //for some dark and unknown reason dojo.style doesn't work, so we'll use jquery.
            dojo.query('#pictureBtnInput' + this.id).style({
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
		this._addListeners();

	},

	_addListeners : function() {
		var self = this,
            target = null;

		dojo.connect(document, 'onmousedown', function(e) {
	        // The latest element clicked
	        self.target = dojo.query(e.target);
	    });

	    // when 'target == null' on blur, we know it was not caused by a click
        dojo.connect(document, 'onmouseup', function(e) {
            // The latest element clicked
            self.target = null;
        });

        dojo.connect(this._inputfield, 'blur', function(e){
			//use the last element that was clicked to find out if it was a toolbar click.
			if(!self.target || dojo.query('.toolbar_' + self.id).children() == 0){
				self._fetchContent();
			}
		});

		//Ok, I'm just going to stick to jquery here for traversing the dom. Much easier.
        $('#'+ this.id +' .dropdown-toggle').on("click", function(e){
            $(this).parent().find('div').toggle();
            $(this).parent().find('ul').toggle();
        });

		//Check if we have to hide the dropdown box.
		dojo.connect("#" + this.id, 'onclick', function(e){
			var isContainer = self._testTarget(e);
			if(!isContainer){
                dojo.query('#' + this.id + ' .dropdown-menu').style ({ 'display' : 'none' });
			}
		});
	},

	_fetchContent : function() {
		var text = $(this._inputfield).html();
		var valueChanged = (this._mxObj.get(this.attribute) !== text);
		
		this._mxObj.set(this.attribute, text);
		
		if (valueChanged && this.onchangeMF !== "") {
			this._execMf(this.onchangeMF, this._mxObj.getGuid());
		}
	},

	_execMf : function(mf, guid){
		mx.data.action({
			params: {
                applyto     : "selection",
                actionname  : mf,
                guids : [guid]
            }
        });
	}, 

	_testTarget : function (e) {
		//See if we clicked the same button
		var isButton = false,
            isContainer = {},
            value = {};

		dojo.forEach( dojo.query('#'+ this.id +' .dropdown-toggle'), function(object, index){
			if (!isButton){
				isButton = dojo.query(e.target).parent()[0] == object || dojo.query(e.target) == object;
			}
		});

		//See if we clicked inside the box
		isContainer =   dojo.query(e.target).closest('ul').children('.dropdown-toggle').length > 0 ||
                        dojo.query(e.target).children('.dropdown-toggle').length > 0 ||
                        dojo.query(e.target).parent().children('.dropdown-toggle').length > 0;

		value = isContainer;
		if(isButton === true) {
			value = isButton;
		}

		return value;
	}

});

})(BootstrapRTE.lib.$);