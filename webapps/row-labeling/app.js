// let categories = (dataiku.getWebAppConfig().categories||[]).map(it => ({name: it.from, description: it.to}));
let columns_for_display = (dataiku.getWebAppConfig().input_information||[]);
let columns_for_labels = (dataiku.getWebAppConfig().output_labels||[]);
let currentRow = -1;
let total = 0 // It doesn't stay zero but is set to total by the first next() call.

function drawApp() {
    try {
        dataiku.checkWebAppParameters();
    } catch (e) {
        displayFatalError(e.message + ' Go to settings tab.');
        return;
    }
    drawInfo(columns_for_display);
    drawInputs(columns_for_labels);

    $('#skip').click(next);
    $('#label').click(label);

    window.onkeydown = function(event) {
        if (event.keyCode == 27) { // Skip with Escape
          next();
      } else if (event.keyCode == 13) { // Label with Enter
          label();
        }
    }
    next();
}

function displayFatalError(err) {
    $('#app').hide();
    $('#fatal-error').text(err.message ? err.message : err).show();
}

function drawInput(column) {
    var inputHtml;
    inputHtml = `<span class="input-container"><p>`+column+`</p><input name="`+column+`" type=text class="comment-area"></input></span>`
    const input = $(inputHtml)
    $('#labeling-inputs').append(input);
}

function drawInputs(columns_for_labels) {
    $('#labeling-inputs').empty();
    columns_for_labels.forEach(drawInput);
}

function drawInfo(columns_for_display) {
    columns_for_display.forEach(drawTitle);
}
function drawTitle(text) {
    $('tr.header').append(`<th scope="col"> ` + text + ` </th>`);
}

function drawItem() {
    if (currentRow == total) {
        $('#app').html('<div id="done"><div>Good job!</div><p>All rows have been labeled.</p></div>');
        webappBackend.get('terminate');
    } else {
        webappBackend.get('get-input-values', {row: currentRow}).then(function(resp) {
            resp.data.forEach(drawContent);
        });
    }
}
function drawContent(text) {
    $('tr.info').append(`<td scope="col"> ` + text + ` </th>`);
}

function next() {
    webappBackend.get('next')
        .then(updateProgress)
        .catch(displayFatalError);
}

function label(columns_for_labels) {
    const labels = [];
    $('#labeling-inputs input').each((idx, input) => {
        labels.push($(input).val());
    });
    webappBackend.get('label', {row: currentRow, labels: labels}).then(updateProgress);
}

function updateProgress(resp) {
    currentRow = resp.nextRow;
    total = resp.total;

    $('#total').text(resp.total);
    $('#labeled').text(resp.labeled);
    $('#skipped').text(resp.skipped);

    $('#app').show();
    $('tr.info').empty(); // Empty infos
    $('#labeling-inputs input').val(''); // Empty inputs
    $('#labeling-inputs input')[0].focus(); // Put type focus in first labeling text area

    drawItem();
}

drawApp();
