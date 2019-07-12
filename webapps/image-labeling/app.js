let categories = (dataiku.getWebAppConfig().categories||[]).map(it => ({name: it.from, description: it.to}));
let currentPath;

function drawApp(categories) {
    try {
        dataiku.checkWebAppParameters();
    } catch (e) {
        displayFatalError(e.message + ' Go to settings tab.');
        return;
    }
    drawCategories(categories);
    try {
        $('[data-toggle="tooltip"]').tooltip();
    } catch (e) {
        console.warn(e);
    }
    $('#skip').click(next)
    next();
}

function displayFatalError(err) {
    $('#app').hide();
    $('#fatal-error').text(err.message ? err.message : err).show();
}

function drawCategory(category) {
    var buttonHtml;
    if (category.description) {
        // button with description tooltip
        buttonHtml = `<button id="cat_${category.name}" class="btn btn-default category-button" data-toggle="tooltip" data-placement="bottom" title="${category.description}"><div class="ratio"></div>${category.name}&nbsp;<i class="icon-info-sign"></i></button>`
    } else {
        // simple button
        buttonHtml = `<button id="cat_${category.name}" class="btn btn-default category-button">${category.name}<div class="ratio"></div></button>`
    }
    const button = $(buttonHtml)
    $('#category-buttons').append(button);
}

function drawCategories(categories) {
    $('#category-buttons').empty();
    categories.forEach(drawCategory);
    $('#category-buttons button').each((idx, button) => {
        $(button).click(() => { classify(categories[idx].name); next()})
    });
}

function setCategoryCount(name, count, total) {
    $(`#cat_${name}>.ratio`).width('' + (100 * count / total) + '%')
}

function next() {
    webappBackend.get('next')
        .then(updateProgress)
        .catch(displayFatalError);
}

function drawItem() {
    if (!currentPath || !currentPath.length) {
        $('#app').html('<div id="done"><div>The End</div><p>All the images were labelled (or skipped, refresh to see the skipped ones)</p></div>')
    } else {
        webappBackend.get('get-image-base64', {path: currentPath}).then(function(resp) {
            let contentType = 'image/png';
            $('#item-to-classify').html(`<img src="data:${contentType};base64,${resp.data}" />`);
            $('#comment').val('')
        });
    }
}

function classify(category) {
    const comment = $('#comment').val()
    webappBackend.get('classify', {path: currentPath, comment: $('#comment').val(), category: category}, updateProgress);
}

function updateProgress(resp) {
    currentPath = resp.nextPath;
    $('#total').text(resp.total);
    $('#labelled').text(resp.labelled);
    $('#skipped').text(resp.skipped);
    $.each(resp.byCategory, (name, count) => setCategoryCount(name, count, resp.total))
    drawItem();
    $('#app').show();
}

drawApp(categories);