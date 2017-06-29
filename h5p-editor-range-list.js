H5PEditor.RangeList = (function ($, TableList) {

  /**
   * Renders UI for the table list.
   *
   * @class
   * @extends H5PEditor.TableList
   * @param {List} list
   */
  function RangeList(list) {
    var self = this;

    // Initialize inheritance
    TableList.call(self, list, 'h5p-editor-range-list');

    // Keep track of the widget state
    var initialized = false;
    list.once('changeWidget', function () {
      initialized = true;
      validateSequence();
    });

    var distributeButton;

    // Customize header
    self.once('headersadd', function (event) {
      var headRow = event.data.element;
      var fields = event.data.fields;

      // Add dash between 'from' and 'to' values
      addDashCol(headRow, 'th');

      // Mark score range label as required
      headRow.children[0].classList.add('h5peditor-required');
    });

    // Customize footer - add distribution button
    self.once('footeradd', function (event) {
      var footerCell = event.data.footerCell;
      var fields = event.data.fields;
      var tbody = event.data.tbody;

      // Add button to evenly distribute ranges
      distributeButton = createButtonWithConfirm(
        H5PEditor.t('H5PEditor.RangeList', 'distributeButtonLabel'),
        H5PEditor.t('H5PEditor.RangeList', 'distributeButtonWarning'),
        'h5peditor-range-distribute',
        distributeEvenlyHandler(fields[0].min, fields[1].max, tbody)
      );

      footerCell.colSpan += 2;
      footerCell.appendChild(distributeButton);

      // Create message area
      self.messageArea = document.createElement('div');
      self.messageArea.className = 'h5p-editor-range-list-message-area';
      footerCell.insertBefore(self.messageArea, footerCell.children[0]);
    });

    // Customize rows as they're added
    self.on('rowadd', function (event) {
      var row = event.data.element;
      var fields = event.data.fields;
      var instances = event.data.instances;

      // Customize each row by adding a separation dash
      addDashCol(row, 'td', '–');

      // Add textual representation of 'from' number input
      var fromInput = getFirst('input', row);
      addInputText(fromInput);

      // Hide all errors from the 'from' input since they change automatically
      getFirst('.h5p-errors', row).style.display = 'none';

      // Add textual representation of 'from' number input
      var toInput = getSecond('input', row);
      addInputText(toInput);

      // Set min value of to field to equal from field value
      instances[1].field.min = parseInt(fromInput.value);

      // Update min value of to field when from field changes
      fromInput.addEventListener('change', function () {
        instances[1].field.min = parseInt(fromInput.value);
        instances[1].validate();
      });

      // Update next fromInput when this toInput changes
      toInput.addEventListener('blur', function () {
        if (toInput.value === '') {
          // No value set
          setValue(getFirst('input', row.nextElementSibling), '');
          return;
        }

        var value = parseInt(toInput.value);
        if (row.nextElementSibling && !isNaN(value)) {
          // Increment next from value
          value += 1;
          if (fields[0].max && value >= fields[0].max) {
            value = fields[0].max; // Respect max limit
          }
          setValue(getFirst('input', row.nextElementSibling), value);
        }

        validateSequence();
      });

      if (row.previousElementSibling) {
        // Show the preivous field's second input when adding a new row
        getSecond('.h5peditor-input-text', row.previousElementSibling).style.display = 'none';
        var prevToInput = getSecond('input', row.previousElementSibling);
        prevToInput.style.display = 'initial';

        if (initialized) {
          // User action, use no value
          setValue(prevToInput, '');
          // Hack:
          // Since setting the value to empty will not validate (field is mandatory),
          // it will initially produce an error message. Removes this error-message here:
          prevToInput.parentNode.querySelector('.h5p-errors').innerHTML = '';
        }

        // More than one row, enable buttons
        toggleButtons(true, row.previousElementSibling);
      }
      else {
        // This is the first row, disable buttons
        toggleButtons(false, row);
      }

      if (initialized) {
        validateSequence();
      };
    });

    // Handle row being removed from the table
    self.on('beforerowremove', function (event) {
      var row = event.data.element;
      var fields = event.data.fields;

      if (!row.nextElementSibling) {
        // This was the last row
        if (row.previousElementSibling) {
          getSecond('.h5peditor-input-text', row.previousElementSibling).style.display = '';
          var prevToInput = getSecond('input', row.previousElementSibling);
          prevToInput.style.display = 'none';
          setValue(prevToInput, fields[1].max);

          if (!row.previousElementSibling.previousElementSibling) {
            // Only one row left, disable buttons
            toggleButtons(false, row.previousElementSibling);
          }
        }
      }
      else if (!row.previousElementSibling) {
        // This was the first row
        setValue(getFirst('input', row.nextElementSibling), fields[0].min);
        if (!row.nextElementSibling.nextElementSibling) {
          // Only one row left, disable buttons
          toggleButtons(false, row.nextElementSibling);
        }
      }
      else {
        // Set first input of next row to match the second input of previous row.
        setValue(getFirst('input', row.nextElementSibling), getSecond('input', row.previousElementSibling).value);
      }
    });

    // When row is removed - let's look for overlapping sequences
    self.on('afterrowremove', function (event) {
      validateSequence();
    });

    /**
     * Add dash column to the given row.
     *
     * @param {HTMLTableRowElement} row
     * @param {string} type 'td' or 'th'
     * @param {string} [symbol] The 'text' to display
     */
    var addDashCol = function (row, type, symbol) {
      var dash = document.createElement(type);
      dash.classList.add('h5peditor-dash');
      if (symbol) {
        dash.innerText = '–';
      }
      row.insertBefore(dash, row.children[1]);
    };

    /**
     * Add text element displaying input value and hide input.
     *
     * @private
     * @param {HTMLInputElement} input
     */
    var addInputText = function (input) {
      // Add static text
      var text = document.createElement('div');
      text.classList.add('h5peditor-input-text');
      text.innerHTML = input.value;
      input.parentElement.insertBefore(text, input);

      // Hide input
      input.style.display = 'none';

      // Update static on changes
      input.addEventListener('change', function () {
        text.innerHTML = input.value;
      });
    };

    /**
     * Look for the given selector/type in the first cell of the given row.
     *
     * @private
     * @param {string} type selector
     * @param {HTMLTableRowElement} row to look in
     */
    var getFirst = function (type, row) {
      return row.children[0].querySelector(type);
    };

    /**
     * Look for the given selector/type in the second cell of the given row.
     *
     * @private
     * @param {string} type selector
     * @param {HTMLTableRowElement} row to look in
     */
    var getSecond = function (type, row) {
      return row.children[2].querySelector(type);
    };

    /**
     * Set the givn value for the given input and trigger the change event.
     *
     * @private
     * @param {HTMLInputElement} input
     * @param {string} value
     */
    var setValue = function (input, value) {
      input.value = value;
      input.dispatchEvent(new Event('change'));
    };

    /**
     * Identify overlapping ranges, and set a warning message if so
     */
    var validateSequence = function () {
      var values = list.getValue();
      var higest = 0;
      var problemFound = false;
      for (var i = 0; i < values.length; i++) {
        if (values[i].to <= higest) {
          problemFound = true;
          self.rows[i].classList.add('h5p-error-range-overlap');
        }
        else {
          self.rows[i].classList.remove('h5p-error-range-overlap');
        }
        higest = values[i].to;
      }
      // Display a message
      self.messageArea.innerText = problemFound ? H5PEditor.t('H5PEditor.RangeList', 'rangeOutOfSequenceWarning') : '';
      self.messageArea.classList[problemFound ? 'add' : 'remove']('problem-found');
    }

    /**
     * Create button which requires confirmation to be used.
     *
     * @private
     * @param {string} label
     * @param {string} warning
     * @param {string} classname
     * @param {function} action
     * @return {HTMLElement}
     */
    var createButtonWithConfirm = function (label, warning, classname, action) {

      // Create confirmation dialog
      var confirmDialog = new H5P.ConfirmationDialog({
        dialogText: warning
      }).appendTo(document.body);
      confirmDialog.on('confirmed', action);

      // Create and return button element
      return H5PEditor.createButton(classname, label, function () {
        if (this.getAttribute('aria-disabled') !== 'true') {
          // The button has been clicked, activate confirmation dialog
          confirmDialog.show(this.getBoundingClientRect().top);
        }
      }, true)[0];
    };

    /**
     * Generate an event handler for distributing ranges equally.
     *
     * @private
     * @param {number} start The minimum value
     * @param {number} end The maximum value
     * @param {HTMLTableSectionElement} tbody Table section containing the rows
     * @return {function} Event handler
     */
    var distributeEvenlyHandler = function (start, end, tbody) {
      return function () {
        // Distribute percentages evenly
        var rowRange = (end - start) / tbody.children.length;

        // Go though all the rows
        for (var i = 0; i < tbody.children.length; i++) {
          var row = tbody.children[i];
          var from = start + (rowRange * i);
          setValue(getFirst('input', row), Math.floor(from) + (i === 0 ? 0 : 1));
          secondInput = getSecond('input', row);
          setValue(secondInput, Math.floor(from + rowRange));
          secondInput.dispatchEvent(new Event('keyup')); // Workaround to remove error messages
        }
      };
    };

    /**
     * Toggle buttons disabled / enabled
     *
     * @private
     * @param {boolean} state true to enable buttons, false to disable
     * @param {HTMLTableRowElement} row to look in
     */
    var toggleButtons = function (state, row) {
      var removeButton = row.children[row.children.length - 1].children[0];
      if (state) {
        enableButton(distributeButton);
        enableButton(removeButton);
      }
      else {
        disableButton(distributeButton);
        disableButton(removeButton);
      }
    };

    /**
     * Disables the given button
     *
     * @private
     * @param {HTMLElement} button to look in
     */
    var disableButton = function (button) {
      button.setAttribute('aria-disabled', 'true');
      button.removeAttribute('tabindex');
    };

    /**
     * Enables the given button
     *
     * @private
     * @param {HTMLElement} button to look in
     */
    var enableButton = function (button) {
      button.removeAttribute('aria-disabled');
      button.setAttribute('tabindex', '0');
    };
  }

  // Extend TableList prototype
  RangeList.prototype = Object.create(TableList.prototype);
  RangeList.prototype.constructor = RangeList;

  return RangeList;
})(H5P.jQuery, H5PEditor.TableList);

// Add translations
H5PEditor.language['H5PEditor.RangeList'] = {
  'libraryStrings': {
    'distributeButtonLabel': 'Distribute Evenly',
    'distributeButtonWarning': 'Values will be changed for all of the ranges. Do you wish to proceed?',
    'rangeOutOfSequenceWarning': 'The score ranges are out of sequence'
  }
};
