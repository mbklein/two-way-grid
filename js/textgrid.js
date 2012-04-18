var GridContext = function(div, opts) {
  var $t = {
    // Convenience methods
    jq:       function(selector,child) { var item = $(selector, $t.div); return child ? item.find(child) : item },
    jqg:      function(a,b,c)    { var receiver = $t.jq('.grid-data'); return receiver.jqGrid.apply(receiver,arguments) },
    prop:     function()         { var receiver = $t.jq('.grid-data'); return receiver.data.apply(receiver,arguments)   },
    gridObj:  function(selector) { return $t.jq('.ui-jqgrid'  ,selector); },
    toolBar:  function(selector) { return $t.jq('.ui-userdata',selector); },
    gridText: function()         { return $t.jq('.grid-text') },
    
    getDataIds : function() {
      return $t.jqg('getDataIDs');
    },
    
    getData : function(rowid) {
      return $t.jqg('getRowData',rowid);
    },
    
    toggleText: function(textMode) {
      if (textMode) {
        $t.resizeTextArea();
        $t.stopEditing(true);
        $t.gridToText();
        $t.jq('.grid-text').show();
      } else {
        $t.textToGrid();
        $t.jq('.grid-text').hide();
      }
      $t.toolBar('button').button('option', 'disabled', textMode);
    },
    
    resizeTextArea: function() {
      var textarea = $t.jq('.grid-text')
      textarea.animate({
        'top': $t.gridObj('.ui-jqgrid-hdiv').position().top + 3, 
        'left': 3,
        'width': $t.gridObj('.ui-jqgrid-bdiv').width() - 4, 
        'height' : $t.gridObj('.ui-jqgrid-hdiv').height() + $t.gridObj('.ui-jqgrid-bdiv').height() - 4
      }, 0);
    },
    
    toggleEditing: function(edit) {
      $t.stopEditing(true);
      $t.jqg('setColProp','source_id',{ editable: edit });
      $t.jqg('setColProp','metadata_id',{ editable: edit });
      $t.jqg('setColProp','druid',{ editable: edit });
      $t.jqg('setColProp','label',{ editable: edit });

      $t.toolBar('*').button('option', 'disabled', !edit);
      $t.toolBar('.enabled-grid-locked').button('option', 'disabled', false);
      $t.jq('.action-lock').toggle(edit);
      $t.jq('.action-unlock').toggle(!edit);
    },

    stopEditing: function(autoSave) {
      var cells = $t.jqg('getGridParam','savedRow');
      if (cells.length > 0) {
        var method = autoSave ? 'saveCell' : 'restoreCell';
        $t.jqg(method,cells[0].id,cells[0].ic);
      }
    },
    
    addRow: function(column_data) {
      var newId = $t.prop('nextId') || 0;
      var newRow = { id: newId };
      var columns = $t.jqg('getGridParam','colModel');
      
      for (var i = 1; i < columns.length; i++) {
        newRow[columns[i].name] = column_data[i-1];
      }
      $t.jqg('addRowData',newId, newRow, 'last');
      $t.prop('nextId',newId+1);
    },

    addText: function(lines) {
      lines.map(function(newId) {
        if (newId.trim() != '') {
          var params = newId.split('\t');
          $t.addRow(params);
        }
      })
    },

    textToGrid: function() {
      $t.jqg('clearGridData');
      $t.prop('nextId',0);
      var textData = $t.jq('.grid-text').val().replace(/^\t*\n$/,'');
      $t.addText(textData.split('\n'));
    },
    
    gridToText: function() {
      var text = '';
      var colData = $t.jqg('getGridParam','colModel');
      var indexes = $(colData).map(function() { return this.index });
      var prop = $t.jqg('getRowData');
      for (var i = 0; i < prop.length; i++) {
        var rowData = prop[i];
        text += $(indexes).map(function() { return rowData[this] }).toArray().join("\t") + "\n"
      }
      $t.jq('.grid-text').val(text);
    },
    
    reset: function() {
      $t.jqg('clearGridData');
      $t.toggleEditing(true);
      $.defaultText();
    },

    addToolbarButton: function(icon,action,title) {
      var parent = $t.toolBar('span[class="button-group"]:last');
      if (parent.length == 0) {
        parent = $t.toolBar();
      }
      var parent = parent.append('<button class="action-'+action+'">'+title+'</button>');
      var button = $('.action-'+action,parent);
      button.button({ icons : { primary: 'ui-icon-'+icon }, text : true });
      return button;
    },

    initializeContext: function(gridDiv) {
      $t.div = $(gridDiv);
      $.defaultText({ css: 'default-text' });
      $(window).bind('resize', function(e) {
        if ($('.grid-text',$t.div).css('display') != 'none') {
          $t.resizeTextArea();
        }
        $t.toolBar().width($t.jq('.ui-jqgrid-view .ui-jqgrid-titlebar').width());
      });
      return(this);
    },

    initializeGrid: function(gridOptions) {
      $t.jqg(gridOptions);
      $(window).trigger('resize')
      $t.toolBar().html('<div class="grid-buttons"/>')

      return(this);
    },

    initializeToolbar: function() {
      $t.toolBar().append('<span class="button-group"></span>');
      
      $t.addToolbarButton('locked','lock','Lock').click(function() {
        $t.toggleEditing(false);
      });

      $t.addToolbarButton('unlocked','unlock','Unlock').click(function() {
        $t.toggleEditing(true);
      }).addClass('enabled-grid-locked').hide();

      $t.toolBar().append('<span class="button-group"></span>');

      $t.addToolbarButton('plus','add','Add Row').click(function() {
        $t.addRow([]);
      });

      $t.addToolbarButton('minus','delete','Delete Rows').click(function() {
        var selection = $t.jqg('getGridParam','selarrrow');
        for (var i = selection.length-1; i >= 0; i--) {
          $t.jqg('delRowData',selection[i]);
        }
      });

      $t.addToolbarButton('arrowrefresh-1-w','clear','Reset').click(function() {
        $('#reset_dialog').dialog('open');
      });

      $t.toolBar().append('<span class="button-group view-toggle"/>');
      $t.toolBar('.view-toggle').append('<input type="radio" id="grid-view" name="view" checked="checked"/><label for="grid-view">Grid</label></span>');
      $t.toolBar('.view-toggle').append('<input type="radio" id="text-view" name="view" /><label for="text-view">Text</label></span>');
      $t.toolBar('.view-toggle').buttonset();
      
      $t.toolBar('.view-toggle input').change(function(e) { 
        $t.toggleText(e.target.id == 'text-view');
      });
      
      return(this);
    },
    
    initializeDialogs: function() {
      $('#reset_dialog').dialog({
        autoOpen: false,
        buttons: { 
          "Ok": function() { 
            $t.reset(); 
            $(this).dialog("close"); 
          },
          "Cancel": function() { $(this).dialog("close"); }
        },
        modal: true,
        height: 140,
        title: 'Confirm',
        resizable: false
      });
      
      $t.jq('.grid-text').tabby();
      
      return(this);
    },

    initialize: function(gridDiv, gridOptions) {
      $t.initializeContext(gridDiv).initializeDialogs().
        initializeGrid(gridOptions).initializeToolbar();
    }
  };
  $t.initialize(div, opts);
  return($t);
}