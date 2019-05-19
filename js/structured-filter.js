/*!
 * structured-filter 2.0.2
 *
 * (c) 2019 Olivier Giulieri
 *
 * https://github.com/evoluteur/structured-filter
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.ui.button.js
 *	jquery.ui.datepicker.js
 */

(function( $, undefined){

	// - field types
	var fTypes={
		text:'text',
		bool:'boolean',
		number:'number',
		date:'date',
		time:'time',
		list:'list',
		listOpts: 'list-options',
		listDropdown: 'list-dropdown'
	},

	// - i18n strings (to translate in other languages)
	i18n={
		sEqual:'equals',
		sNotEqual:'not equal',
		sStart:'starts with',
		sContain:'contains',
		sNotContain:'doesn\'t contain',
		sFinish:'finishes with',
		sInList:'any of',
		sIsNull:'is empty',
		sIsNotNull:'is not empty',
		sBefore:'before',
		sAfter:'after',
		sNumEqual:'&#61;',
		sNumNotEqual:'!&#61;',
		sGreater:'&#62;',
		sSmaller:'&#60;',
		sOn:'on',
		sNotOn:'not on',
		sAt:'at',
		sNotAt:'not at',
		sBetween:'between',
		sNotBetween:'not between',
		opAnd:'and',
		//opOr:'or',
		yes:'Yes',
		no:'No',
		bNewCond:'New filter condition',
		bAddCond:'Add condition',
		bUpdateCond:'Update condition',
		bSubmit:'Submit',
		bCancel:'Cancel',
		lField:'Field',
		lOperator:'Operator',
		lValue:'Value'
	},

	// - list of operators (for conditions)
	evoAPI={
		sEqual:'eq',
		sNotEqual:'ne',
		sStart:'sw',
		sContain:'ct',
		sNotContain:'nct',
		sFinish:'fw',
		sInList:'in',
		sIsNull:'null',
		sIsNotNull:'nn',
		sGreater:'gt',
		sSmaller:'lt',
		sBetween:'bw',
		sNotBetween:'nbw'
	},
	isNotFirefox = navigator.userAgent.toLowerCase().indexOf('firefox')===-1;

$.widget( 'evol.structFilter', {

	options: {
		fields: [],
		dateFormat: 'mm/dd/yy',
		highlight: true,
		buttonLabels: false,
		submitButton: false,
		submitReady: false,
		disableOperators: false
	},

	_create: function(){
		var bLabels=this.options.buttonLabels,
			that=this,
			e=this.element,
			h='<div class="evo-searchFilters"></div>'+
				EvoUI.fnLink('evo-bNew', bLabels? i18n.bNewCond: '');
		if(this.options.submitButton){
			h+=EvoUI.fnLink('evo-bSubmit', bLabels? i18n.bSubmit: '');
		}
		h+='<div class="evo-editFilter"></div>'+
				EvoUI.fnLink('evo-bAdd', bLabels? i18n.bAddCond: '', true)+
				EvoUI.fnLink('evo-bDel', bLabels? i18n.bCancel: '', true);
		this._step=0;
		e.addClass('structFilter ui-widget-content ui-corner-all')
			.html(h);
		if(this.options.submitReady){
			this._hValues=$('<span>').appendTo(e);
		}
		// - button submit
		if(this.options.submitButton){
			this._bSubmit=e.find('.evo-bSubmit').on('click', function(e){
					that.element.trigger('submit.search');
				});
		}
		// - editor button new
		this._bNew=e.find('.evo-bNew').append(
				EvoUI.makeIcon('add')
			).on('click', function(e){
				if(that._step<1){
					that._setEditorField();
					that._step=1;
				}
				that._bAdd.find('.ui-button-text').html(i18n.bAddCond);
			});
		// - editor button add
		this._bAdd=e.find('.evo-bAdd').append(
				EvoUI.makeIcon('check')
			).on('click', function(evt){
                if($(this).hasClass('disable'))
                    return;
				var data=that._getEditorData();
				if(that._cFilter){
					that._enableFilter(data, that.options.highlight);
				}else{
					that.addCondition(data);
				}
				that._removeEditor();
			});
		// - editor button cancel
		this._bDel=e.find('.evo-bDel').append(
				EvoUI.makeIcon('close')
			).on('click', function(evt){
				that._removeEditor();
			});
		this._editor=e.find('.evo-editFilter')
		.on('change', '.dropdown-field', function(evt){
			evt.stopPropagation();
			if(that._step>2){
				that._editor.find('#value,#value2,.as-Txt').remove();
			}
			if(that._step>1){
				that._editor.find('.dropdown-operator').remove();
				that._bAdd.hide();
			}
			that._step=1;
			var fieldID=$(evt.currentTarget).data('value');
			if(fieldID!==''){
				that._field=that._getFieldById(fieldID);
				var fType=that._type=that._field.type;
				that._setEditorOperator();
				if(fType===fTypes.bool || fType.startsWith('list')){
					that._setEditorValue();
				}
			}else{
				that._field=that._type=null;
			}
		}).on('change', '.dropdown-operator', function(evt){
			evt.stopPropagation();
			that._operator=String($(this).data('value'));
			if(that._step>2){
				that._editor.find('#value,#value2,.as-Txt').remove();
				that._bAdd.hide();
				that._step=2;
			}
			that._setEditorValue();
		}).on('change keyup', '#value,#value2', function(evt){
			evt.stopPropagation();
			var fType=that._type,
				value=$(this).val(),
				valid= value!=='' || fType===fTypes.bool || fType.startsWith('list');
			if(fType==fTypes.number){
				valid=valid && !isNaN(value);
			}else if(that._operator==evoAPI.sBetween || that._operator==evoAPI.sNotBetween){
				valid=that._editor.find('#value').val()!=='' && that._editor.find('#value2').val()!=='';
			}
			if(valid){
				that._bAdd.removeClass('disable');
				if(evt.which==13){
					that._bAdd.trigger('click');
				}
			}else{
				that._bAdd.addClass('disable');
			}
		}).on('click', '#checkAll', function(){
			var $this=$(this),
				vc=$this.prop('checked');
			allChecks=$this.siblings().prop('checked', vc);
		});
		this._filters=e.find('.evo-searchFilters').on('click', 'a', function(){
			that._editFilter($(this));
		}).on('click', 'a .ui-button-icon', function(evt){
            if($(this).hasClass('disable'))
			evt.stopPropagation();
			var filter=$(this).parent();
			if(!filter.hasClass('ui-state-disabled')){
				filter.fadeOut('slow',function(){
					filter.remove();
					that._triggerChange();
				});
			}
		});
	},

	_getFieldById: function(fId){
		if(!this._hash){
			this._hash={};
			var fields=this.options.fields;
			for (var i=0,iMax=fields.length;i<iMax;i++){
				this._hash[fields[i].id]=fields[i];
			}
		}
		return this._hash[fId];
	},

	_removeEditor: function(){
		this._editor.empty();
		this._bAdd.hide();
		this._bDel.hide();
		this._enableFilter(null, false);
		this._bNew.removeClass('ui-state-active').show();
		if(this._bSubmit){
			this._bSubmit.removeClass('ui-state-active').show();
		}
		if(isNotFirefox){
			// setting focus w/ ff takes too long
			this._bNew.focus();
		}
		this._step=0;
		this._field=this._type=this._operator=null;
	},

	addCondition: function(filter){
		var f=$('<a class="chip" href="javascript:void(0)"><span>'+this._htmlFilter(filter)+'</span></a>')
			.prependTo(this._filters)
			.append(EvoUI.makeIcon('close', 'close'))
			.data('filter', filter)
			.fadeIn();
		if(this.options.highlight){
			f.effect('highlight');
		}
		this._triggerChange();
		if(this._bSubmit){
			this._bSubmit.removeClass('ui-state-active').show();
		}
		return this;
	},

	removeCondition: function(index){
		this._filters.children().eq(index).remove();
		this._triggerChange();
		return this;
	},

	_htmlFilter: function(filter){
		var h='<span class="evo-lBold">'+filter.field.label+'</span> '+
			'<span class="evo-lLight">'+filter.operator.label+'</span> '+
			'<span class="evo-lBold">'+filter.value.label+'</span>';
		if(filter.operator.value==evoAPI.sBetween || filter.operator.value==evoAPI.sNotBetween){
			h+='<span class="evo-lLight"> '+i18n.opAnd+' </span>'+
				'<span class="evo-lBold">'+filter.value.label2+'</span>';
		}
		return h;
	},

	_enableFilter: function(filter, anim){
		if(this._cFilter){
			this._cFilter.removeClass('disable').removeClass('ui-state-hover ui-state-active');
			if(anim){
				this._cFilter.effect('highlight');
			}
			if(filter){
				this._cFilter.data('filter', filter)
					.find(':first-child').html(this._htmlFilter(filter));
				this._cFilter=null;
				this._triggerChange();
			}else{
				this._cFilter=null;
			}
		}
	},

	_editFilter: function($filter){
		var filter=$filter.data('filter'),
			fid=filter.field.value,
			op=filter.operator.value,
			fv=filter.value;
		this._enableFilter(null, false);
		this._removeEditor();
		this._cFilter=$filter.addClass('disable');
		this._setEditorField(fid);
		this._setEditorOperator(op);
		if(op==evoAPI.sBetween || op==evoAPI.sNotBetween){
			this._setEditorValue(fv.value, fv.value2);
		}else{
			this._setEditorValue(fv.value);
		}
		this._bAdd.find('.ui-button-text').html(i18n.bUpdateCond);
		this._step=3;
	},

	_setEditorField: function(fid){
		if(this._step<1){
			this._bNew.stop().hide();
			if(this._bSubmit){
				this._bSubmit.stop().hide();
			}
			this._bDel.show();
			EvoUI.makeSelect("field", this.options.fields, fid, this._editor, i18n.lField);
		}
		if(fid){
			this._field=this._getFieldById(fid);
			this._type=this._field.type;
		}
		this._step=1;
	},

	_setEditorOperator: function(cond){
		if(this.options.disableOperators) {
			this._step=2;
			return this._setEditorValue();
		}
		
		var fType=this._type;
		if(this._step<2){
			switch (fType){
				case fTypes.list:
					//h.push(i18n.sInList);
					this._editor.append(EvoUI.inputHidden('operator',evoAPI.sInList));
					this._operator=evoAPI.sInList;
					break;
				case fTypes.listOpts:
				case fTypes.listDropdown:
				case fTypes.bool:
					//h.push(i18n.sEqual);
					this._editor.append(EvoUI.inputHidden('operator',evoAPI.sEqual));
					this._operator=evoAPI.sEqual;
					break;
				default:
					var opts = [];
					switch (fType){
						case fTypes.date:
						case fTypes.time:
							if (fType==fTypes.time){
								opts.push({id: evoAPI.sEqual, label: i18n.sAt});
								opts.push({id: evoAPI.sNotEqual, label: i18n.sNotAt});;
							}else{
								opts.push({id: evoAPI.sEqual, label: i18n.sOn});
								opts.push({id: evoAPI.sNotEqual, label: i18n.sNotOn});;
							}
							opts.push({id: evoAPI.sGreater, label: i18n.sAfter});
							opts.push({id: evoAPI.sSmaller, label: i18n.sBefore});
							opts.push({id: evoAPI.sBetween, label: i18n.sBetween});
							opts.push({id: evoAPI.sNotBetween, label: i18n.sNotBetween});
							break;
						case fTypes.number:
							opts.push({id: evoAPI.sEqual, label: i18n.sNumEqual});
							opts.push({id: evoAPI.sNotEqual, label: i18n.sNumNotEqual});
							opts.push({id: evoAPI.sGreater, label: i18n.sGreater});
							opts.push({id: evoAPI.sSmaller, label: i18n.sSmaller});
							break;
						default:
							opts.push({id: evoAPI.sEqual, label: i18n.sEqual});
							opts.push({id: evoAPI.sNotEqual, label: i18n.sNotEqual});
							opts.push({id: evoAPI.sStart, label: i18n.sStart});
							opts.push({id: evoAPI.sContain, label: i18n.sContain});
							opts.push({id: evoAPI.sNotContain, label: i18n.sNotContain});
							opts.push({id: evoAPI.sFinish, label: i18n.sFinish});
					}
					opts.push({id: evoAPI.sIsNull, label: i18n.sIsNull});
					opts.push({id: evoAPI.sIsNotNull, label: i18n.sIsNotNull});
					EvoUI.makeSelect("operator", opts, cond, this._editor, i18n.lOperator);
			}
		}
		if(cond && fType!=fTypes.list){
			this._operator=cond;
		}
		this._step=2;
	},

	_setEditorValue: function( v, v2){
		var editor=this._editor,
			fld = this._field,
			fType=this._type,
			opVal=String(editor.find('.dropdown-operator').data('value')),
			opBetween=false,
			addOK=true;
		if(opVal!==''){
			if(fType!=fTypes.list && (opVal==evoAPI.sIsNull || opVal==evoAPI.sIsNotNull)){
				editor.append(EvoUI.inputHidden('value',''));
			}else{
				if(this._step<3){
					opBetween=(opVal==evoAPI.sBetween || opVal==evoAPI.sNotBetween);
					switch (fType){
						case fTypes.bool:
							editor.append(
								EvoUI.inputSwitch('value', v!='0'),
								);
							break;
						case fTypes.list:
							editor.append($('<span id="value">').append(
								((fld.list.length>7)?'(<input type="checkbox" id="checkAll" value="1"/><label for="checkAll">All</label>) ':''),
								EvoUI.inputCheckboxes(fld.list)));
							break;
						case fTypes.listOpts:
							h='<span id="value">';
							h+=fld.list.map(function(item){
								return EvoUI.inputRadio(fld.id, item.id, item.label, v==item.id, 'value' + item.id);
							}).join('');
							h +='</span>';
							editor.append(h);
							break;
						case fTypes.listDropdown:
							editor.append(EvoUI.makeSelect("value", fld.list, v, editor, i18n.lValue));
							break;
						case fTypes.date:
						case fTypes.time:
						case fTypes.number:
							var iType=(fType==fTypes.date)?'text':fType;
							h='<input id="value" type="'+iType+'"/>';
							if(opBetween){
								h+='<span class="as-Txt">'+i18n.opAnd+' </span>'+
									'<input id="value2" type="'+iType+'"/>';
							}
							editor.append(h);
							addOK=false;
							break;
						default:
							editor.append('<input id="value" type="text"/>');
							addOK=false;
					}
					if(fType==fTypes.date){
						editor.find('#value,#value2').datepicker({dateFormat:this.options.dateFormat});
					}
				}
				if(v){
					var $value=editor.find('#value');
					switch (fType){
						case fTypes.list:
							$value.find('#'+v.split(',').join(',#')).prop('checked', 'checked');
							break;
						case fTypes.listOpts:
							$value.find('#value'+v).prop('checked', 'checked');
							break;
						case fTypes.bool:
							$value.find('#value').prop('checked', v==1);
							break;
						default:
							$value.val(v);
							addOK=v!=='';
							if(opBetween){
								$value.next().next().val(v2);
								addOK=v!=='' && v2!=='';
							}
					}
				}else{
					addOK=(fType==fTypes.list || fType==fTypes.listDropdown || fType==fTypes.bool);
				}
			}
            if (addOK)
                this._bAdd.removeClass('disable').show();
            else
                this._bAdd.addClass('disable').show();
			this._step=3;
		}
	},

	_getEditorData: function(){
		var e=this._editor,
			f=e.find('.dropdown-field'),
			v=e.find('#value'),
			filter={
				field:{
					label: f.find('b').text(),
					value: f.data('value')
				},
				operator:{},
				value:{}
			},
			op=filter.operator,
			fv=filter.value;
		if(this._type==fTypes.list){
			var vs=[], ls=[];
			v.find('input:checked').not('#checkAll').each(function(){
				vs.push(this.value);
				ls.push(this.nextSibling.innerHTML);
			});
			if(vs.length===0){
				op.label=i18n.sIsNull;
				op.value=evoAPI.sIsNull;
				fv.label=fv.value='';
			}else if(vs.length==1){
				op.label=i18n.sEqual;
				op.value=evoAPI.sEqual;
				fv.label='"'+ls[0]+'"';
				fv.value=vs[0];
			}else{
				op.label=i18n.sInList;
				op.value=evoAPI.sInList;
				fv.label='('+ls.join(', ')+')';
				fv.value=vs.join(',');
			}
		}else if(this._type==fTypes.bool){
			op.label=i18n.sEqual;
			op.value=evoAPI.sEqual;
			var val=(v.find('input').prop('checked'))?1:0;
			fv.label=(val==1)?i18n.yes:i18n.no;
			fv.value=val;
		}else if(this._type==fTypes.listOpts){
			op.label=i18n.sEqual;
			op.value=evoAPI.sEqual;
			var sel = v.find('input:checked');
			fv.label = sel.parent().text();
			fv.value = sel.prop('id').slice(5);
		}else if(this._type==fTypes.listDropdown){
			op.label=i18n.sEqual;
			op.value=evoAPI.sEqual;
			var vval=v.val();
			fv.label = vval?v.find('option[value='+vval+']').text():i18n.sIsNull;
			fv.value = v.val();
		}else{
			var o=e.find('.dropdown-operator'),
				opVal=String(o.data('value'));
			op.label=o.find('b').text();
			op.value=opVal;
			if(opVal==evoAPI.sIsNull || opVal==evoAPI.sIsNotNull){
				fv.label=fv.value='';
			}else{
				if(this._type==fTypes.number || this._type==fTypes.date || this._type==fTypes.time){
					fv.label=v.val();
				}else{
					fv.label='"'+v.val()+'"';
				}
				fv.value=v.val();
				if(opVal==evoAPI.sBetween || opVal==evoAPI.sNotBetween){
					fv.label2=fv.value2=v.next().next().val();
				}
			}
		}
		return filter;
	},

	_hiddenValue: function(h, filter, idx){
		h.push(EvoUI.inputHidden('fld-'+idx, filter.field.value)+
			EvoUI.inputHidden('op-'+idx, filter.operator.value)+
			EvoUI.inputHidden('val-'+idx, filter.value.value));
		var v2=filter.value.value2;
		if(v2){
			h.push(EvoUI.inputHidden('val2-'+idx, v2));
		}
	},

	_setHiddenValues: function(){
		var vs=this.val(),
			iMax=vs.length,
			h=[EvoUI.inputHidden('elem', iMax)];
		for(var i=0;i<iMax;i++){
			this._hiddenValue(h, vs[i], i+1);
		}
		//h.push('&label=',encodeURIComponent(this.valText()));
		this._hValues.html(h.join(''));
	},

	_triggerChange: function(){
		if(this.options.submitReady){
			this._setHiddenValues();
		}
		this.element.trigger('change.search');
	},

	val: function(value){
		// - sets or returns filter object
		if (typeof value=='undefined'){
		// --- get value
			var ret=[];
			this._filters.find('a').each(function(){
				ret.push($(this).data('filter'));
			});
			return ret;
		}else{
		// --- set value
			this._filters.empty();
			for(var i=0,iMax=value.length;i<iMax;i++){
				this.addCondition(value[i]);
			}
			this._triggerChange();
			return this;
		}
	},

	valText: function(){
		// - returns filter "text" value as displayed to the user.
		var ret=[];
		this._filters.find('a').each(function(){
			ret.push(this.text);
		});
		return ret.join(' '+i18n.opAnd+' ');
	},

	valUrl: function(){
		// - returns filter url
		var vs=this.val(),
			iMax=vs.length,
			url='filters='+iMax;
		if(iMax<1){
			return '';
		}
		vs.forEach(function(v, idx){
			url+='&field-'+idx+'='+v.field.value+
				'&operator-'+idx+'='+v.operator.value+
				'&value-'+idx+'='+encodeURIComponent(v.value.value);
			if(v.operator.value==evoAPI.sBetween || v.operator.value==evoAPI.sNotBetween){
				url+='&value2-'+idx+'='+encodeURIComponent(v.value.value2);
			}
		});
		url+='&label='+encodeURIComponent(this.valText());
		return url;
	},

	clear: function(){
		this._cFilter=null;
		this._removeEditor();
		this._filters.empty();
		this._triggerChange();
		return this;
	},

	length: function(){
		return this._filters.children().length;
	},

	destroy: function(){
		var e=this.element.off();
		e.find('.evo-bNew,.evo-bAdd,.evo-bDel,.evo-searchFilters').off();
		this._editor.off();
		e.clear().removeClass('structFilter ui-widget-content ui-corner-all');
		$.Widget.prototype.destroy.call(this);
	}

});

$.widget( 'evol.seti18n', {
	options: {
	},
	_create: function(){
		i18n = this.options;
	}

});

// - helpers to generate HTML
var EvoUI={

	inputRadio:function(fN,fV,fLbl,sel,fID){
		return '<label for="'+fID+'"><input id="'+fID+'" name="'+fN+
			'" type="radio" value="'+fV+
			(sel?'" checked="checked':'')+
			'">'+fLbl+'</label>&nbsp;';
	},

	inputSwitch: function(id, value) {
		return $('<div>').addClass("switch").attr('id', id).append(
			$('<label>').append(
				i18n.no,
				$('<input type="checkbox">').prop('checked', value || false),
				$('<span class="lever">'),
				i18n.yes
			)
		);
	},

	inputHidden:function(id,val){
		return '<input type="hidden" name="'+id+'" value="'+val+'"/>';
	},

	inputOption:function(fID,fV){
		return '<option value="'+fID+'">'+fV+'</option>';
	},

	optNull:'<option value=""></option>',

	inputCheckboxes:function(fLOV){
		return fLOV.map(function(lv){
			return '<input type="checkbox" id="'+lv.id+'" value="'+lv.id+'"/>'+
				'<label for="'+lv.id+'">'+lv.label+'</label> ';
		}).join('');
	},

	fnLink: function (css, label, hidden) {
		return '<a class="btn-floating evol-btn ' + (css || '') + '"' + (hidden?' style="display:none;"':'') +
			' href="javascript:void(0)">' + label + '</a>';
	},

	makeIcon: function (text, classes) {
		return $('<i>').addClass('material-icons ' + (classes || '')).text(text);
	},

	makeSelect: function (id, options, value, parent, label) {
		var random = Math.random().toString(36).substring(7),
			defaultLabel = label,
			valueLabel = false;
		var ul = $(`<ul id='dropdown-${random}' class='dropdown-content'>`);
		for (let opt of options) {
			ul.append($(`<li><a data-value="${opt.id}" href="#!">${opt.label}</a></li>`));
			if (value==opt.id)
				valueLabel = opt.label;
		}
		$(`<div id="dropdown-${random}-wrapper" class="dropdown-${id}">`).addClass('dropdown-wrapper').append(
			$(`<span class='dropdown-trigger chip' data-target='dropdown-${random}'>`).append(
					$('<b>'),
					EvoUI.makeIcon('expand_more') // expand_more
				),
			ul
		).appendTo(
			parent
		).on('click', 'li a', function(){
			var wrapper = $(`#dropdown-${random}-wrapper`);
			wrapper.data('value', $(this).data('value')).trigger('change');
			if ($(this).data('value') === undefined)
				wrapper.find('.dropdown-trigger b').text(defaultLabel);
			else
				wrapper.find('.dropdown-trigger b').text($(this).text());
			return false;
		}).find('.dropdown-trigger').dropdown().find('b').text(valueLabel || defaultLabel);
	}
};

})(jQuery);