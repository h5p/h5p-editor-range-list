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

    // Customize header
    self.once('headersadd', function (event) {
      var headRow = event.data;
      var dashHeader = document.createElement('th');
      dashHeader.classList.add('h5peditor-dash');
      headRow.insertBefore(dashHeader, headRow.children[1]);
    });

    // Customize rows as they're added
    self.on('rowadd', function (event) {
      var row = event.data.element;
      var fields = event.data.fields;

      // Customize row by adding separation dash
      var dash = document.createElement('td');
      dash.classList.add('h5peditor-dash');
      dash.innerText = '–';
      row.insertBefore(dash, row.children[1]);

      // Add static textual representation of number inputs
      var fromInput = getFirst('input', row);
      addInputText(fromInput);

      var toInput = getSecond('input', row);
      addInputText(toInput);

      // Update next fromInput when this toInput changes
      toInput.addEventListener('change', function () {
        var value = parseInt(toInput.value);
        if (row.nextElementSibling && !isNaN(value)) {
          value += 1;
          if (fields[0].max && value >= fields[0].max) {
            value = fields[0].max;
          }
          var nextFromInput = getFirst('input', row.nextElementSibling);
          nextFromInput.value = value;
          nextFromInput.dispatchEvent(new Event('change'));
        }
      });

      // Show the preivous field's second input
      if (row.previousElementSibling) {
        getSecond('input', row.previousElementSibling).style.display = 'initial';
        getSecond('.h5peditor-input-text', row.previousElementSibling).style.display = 'none';
      }
    });

    // Handle row being removed from the table
    self.on('rowremove', function (event) {
      var row = event.data;
      if (!row.nextElementSibling) {
        // This was the last row
        if (row.previousElementSibling) {
          getSecond('input', row.previousElementSibling).style.display = 'none';
          getSecond('.h5peditor-input-text', row.previousElementSibling).style.display = 'initial';
        }
      }
    });

    /**
     * Add text element displaying input value and hide input.
     *
     * @private
     * @param {HTMLElement} input
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
     * @param {HTMLElement} row to look in
     */
    var getFirst = function (type, row) {
      return row.children[0].querySelector(type);
    };

    /**
     * Look for the given selector/type in the second cell of the given row.
     *
     * @private
     * @param {string} type selector
     * @param {HTMLElement} row to look in
     */
    var getSecond = function (type, row) {
      return row.children[2].querySelector(type);
    };
  }

  // Extend TableList prototype
  RangeList.prototype = Object.create(TableList.prototype);
  RangeList.prototype.constructor = RangeList;

  return RangeList;
})(H5P.jQuery, H5PEditor.TableList);
